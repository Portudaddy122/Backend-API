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
    idhorario
  } = req.body;

  try {
    // Validación de campos obligatorios
    const requiredFields = { idDireccion, nombres, apellidoPaterno, apellidoMaterno, email, numCelular, fechaDeNacimiento, contrasenia, rol, idhorario };
    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value || (typeof value === "string" && value.trim() === "")) {
        return res.status(400).json({ error: `El campo ${key} es obligatorio y no puede estar vacío` });
      }
      if (["nombres", "apellidoPaterno", "apellidoMaterno"].includes(key) && typeof value === "string" && /[^a-zA-Z\s]/.test(value)) {
        return res.status(400).json({ error: `El campo ${key} no puede contener caracteres especiales o números` });
      }
    }

    // Validar que el rol sea "Profesor"
    if (rol !== "Profesor") {
      return res.status(400).json({ error: "El rol debe ser Profesor" });
    }

    // Validar que el email no esté repetido
    const emailCheck = await pool.query("SELECT idProfesor FROM Profesor WHERE email = $1", [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: "El correo electrónico ya está registrado por otro usuario" });
    }

    const hashedPassword = await bcrypt.hash(contrasenia, 10);

    // Insertar en la tabla Profesor
    const profesorResult = await pool.query(
      `INSERT INTO Profesor (idDireccion, Nombres, ApellidoPaterno, ApellidoMaterno, email, NumCelular, FechaDeNacimiento, Contrasenia, Rol, Estado, idhorario) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10) RETURNING *`,
      [idDireccion, nombres, apellidoPaterno, apellidoMaterno, email, numCelular, fechaDeNacimiento, hashedPassword, rol, idhorario]
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
    idDireccion,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    email,
    numCelular,
    fechaDeNacimiento,
    contrasenia,
    estado,
    rol,
    idhorario
  } = req.body;

  try {
    const { rows } = await pool.query("SELECT * FROM Profesor WHERE idProfesor = $1", [idProfesor]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Profesor no encontrado" });
    }
    const currentData = rows[0];

    let hashedPassword = currentData.contrasenia;
    if (contrasenia) {
      hashedPassword = await bcrypt.hash(contrasenia.trim(), 10);
    }

    await pool.query(
      `UPDATE Profesor 
       SET idDireccion = $1, Nombres = $2, ApellidoPaterno = $3, ApellidoMaterno = $4, email = $5, NumCelular = $6, FechaDeNacimiento = $7, Contrasenia = $8, Rol = $9, Estado = $10, idhorario = $11
       WHERE idProfesor = $12`,
      [
        idDireccion || currentData.iddireccion,
        nombres?.trim() || currentData.nombres,
        apellidoPaterno?.trim() || currentData.apellidopaterno,
        apellidoMaterno?.trim() || currentData.apellidomaterno,
        email?.trim() || currentData.email,
        numCelular?.trim() || currentData.numcelular,
        fechaDeNacimiento || currentData.fechadenacimiento,
        hashedPassword,
        rol?.trim() || currentData.rol,
        estado !== undefined ? estado : currentData.estado,
        idhorario || currentData.idhorario,
        idProfesor
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