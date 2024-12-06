import { pool } from "../db.js";
import bcrypt from "bcrypt";

// Obtener todos los profesores
export const getProfesores = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
            SELECT *
            FROM Profesor WHERE estado = 'true'
            ORDER BY idProfesor ASC
        `
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los profesores" });
  }
};

// Obtener un profesor por ID
export const getProfesorById = async (req, res) => {
  const { idProfesor } = req.params;

  try {
    const { rows } = await pool.query(
      `
            SELECT *
            FROM Profesor
            WHERE idProfesor = $1
        `,
      [idProfesor]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Profesor no encontrado" });
    }

    const profesor = rows[0];

    if (!profesor.estado) {
      return res.status(400).json({ error: "Profesor está deshabilitado" });
    }

    res.json(profesor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el profesor" });
  }
};
export const createProfesor = async (req, res) => {
  const {
    idDireccion,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    email,
    numCelular,
    fechaDeNacimiento,
    contrasenia,
    rol,
    idhorario,
  } = req.body;

  try {
    // Validación de campos obligatorios
    const requiredFields = {
      idDireccion,
      nombres,
      apellidoPaterno,
      apellidoMaterno,
      email,
      numCelular,
      fechaDeNacimiento,
      contrasenia,
      rol,
      idhorario,
    };
    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value || (typeof value === "string" && value.trim() === "")) {
        return res.status(400).json({
          error: `El campo ${key} es obligatorio y no puede estar vacío`,
        });
      }
      if (
        ["nombres", "apellidoPaterno", "apellidoMaterno"].includes(key) &&
        typeof value === "string" &&
        /[^a-zA-Z\s]/.test(value)
      ) {
        return res.status(400).json({
          error: `El campo ${key} no puede contener caracteres especiales o números`,
        });
      }
    }

    // Validar que el rol sea "Profesor"
    if (rol !== "Profesor") {
      return res.status(400).json({ error: "El rol debe ser Profesor" });
    }

    // Validar que el email no esté repetido
    const emailCheck = await pool.query(
      "SELECT idProfesor FROM Profesor WHERE email = $1",
      [email]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        error: "El correo electrónico ya está registrado por otro usuario",
      });
    }

    const hashedPassword = await bcrypt.hash(contrasenia, 10);

    // Insertar en la tabla Profesor
    const profesorResult = await pool.query(
      `INSERT INTO Profesor (idDireccion, Nombres, ApellidoPaterno, ApellidoMaterno, email, NumCelular, FechaDeNacimiento, Contrasenia, Rol, Estado, idhorario) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10) RETURNING *`,
      [
        idDireccion,
        nombres,
        apellidoPaterno,
        apellidoMaterno,
        email,
        numCelular,
        fechaDeNacimiento,
        hashedPassword,
        rol,
        idhorario,
      ]
    );

    res.status(201).json(profesorResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Actualizar un profesor
export const updateProfesor = async (req, res) => {
  const { idProfesor } = req.params;
  const {
    iddireccion,
    nombres,
    apellidopaterno,
    apellidomaterno,
    email,
    numcelular,
    fechadenacimiento,
    contrasenia,
    estado,
    rol,
    idhorario,
  } = req.body;

  try {
    // Verificar si el profesor existe
    const { rows } = await pool.query(
      "SELECT * FROM profesor WHERE idprofesor = $1",
      [idProfesor]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Profesor no encontrado" });
    }
    const currentData = rows[0];

    // Cifrar la contraseña solo si se ha proporcionado una nueva
    let hashedPassword = currentData.contrasenia;
    if (contrasenia && contrasenia !== currentData.contrasenia) {
      hashedPassword = await bcrypt.hash(contrasenia.trim(), 10);
    }

    await pool.query(
      `UPDATE profesor 
       SET iddireccion = COALESCE($1, iddireccion), 
           nombres = COALESCE($2, nombres), 
           apellidopaterno = COALESCE($3, apellidopaterno), 
           apellidomaterno = COALESCE($4, apellidomaterno), 
           email = COALESCE($5, email), 
           numcelular = COALESCE($6, numcelular), 
           fechadenacimiento = COALESCE($7, fechadenacimiento), 
           contrasenia = COALESCE($8, contrasenia), 
           estado = COALESCE($9, estado), 
           rol = COALESCE($10, rol), 
           idhorario = COALESCE($11, idhorario)
       WHERE idprofesor = $12`,
      [
        iddireccion,
        nombres?.trim(),
        apellidopaterno?.trim(),
        apellidomaterno?.trim(),
        email?.trim(),
        numcelular?.trim(),
        fechadenacimiento,
        hashedPassword,
        estado,
        rol,
        idhorario,
        idProfesor,
      ]
    );

    res.json({ message: "Profesor actualizado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Eliminar un profesor (desactivar)
export const deleteProfesor = async (req, res) => {
  const { idProfesor } = req.params;

  try {
    await pool.query("BEGIN");

    const profesorResult = await pool.query(
      "SELECT idProfesor FROM Profesor WHERE idProfesor = $1 AND Estado = true",
      [idProfesor]
    );

    if (profesorResult.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res
        .status(404)
        .json({ error: "Profesor no encontrado o ya desactivado" });
    }

    await pool.query(
      "UPDATE Profesor SET Estado = false WHERE idProfesor = $1",
      [idProfesor]
    );

    await pool.query("COMMIT");

    res.json({ message: "Profesor desactivado correctamente" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Obtener la cantidad de profesores
export const getProfesorCount = async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT COUNT(*) AS total_profesores
        FROM Profesor
        WHERE estado = true;
      `
    );

    const totalProfesores = parseInt(result.rows[0].total_profesores, 10);

    res.status(200).json({
      total: totalProfesores,
    });
  } catch (error) {
    console.error("Error al obtener la cantidad de profesores:", error);
  }
};
export const getProfesoresConHorarios = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT 
        p.idprofesor, 
        CONCAT(p.nombres, ' ', p.apellidopaterno, ' ', p.apellidomaterno) AS nombre, 
        m.nombre AS materia, 
        h.dia, 
        h.horainicio, 
        h.horafin,
        p.email
      FROM profesor p
      INNER JOIN horario h ON p.idhorario = h.idhorario
      INNER JOIN materia m ON h.idmateria = m.idmateria
      WHERE p.estado = true
      ORDER BY p.idprofesor ASC
      `
    );

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener profesores con horarios:", error);
    res.status(500).json({ error: "Error al obtener profesores con horarios" });
  }
};
