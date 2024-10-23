import { pool } from "../db.js";
import bcrypt from "bcrypt";

// Obtener todos los profesores
export const getProfesores = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
            SELECT *
            FROM Profesor
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

// Crear un nuevo profesor
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
  } = req.body;

  try {
    // Validar campos obligatorios sin espacios en blanco y que no contengan caracteres especiales
    const requiredFields = {
      idDireccion,
      nombres,
      apellidoPaterno,
      apellidoMaterno,
      rol,
      email,
      numCelular,
      fechaDeNacimiento,
      contrasenia,
    };
    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value || value.trim() === "") {
        return res
          .status(400)
          .json({ error: `El campo ${key} es obligatorio y no puede estar vacío ni contener solo espacios en blanco` });
      }
      if (["nombres", "apellidoPaterno", "apellidoMaterno"].includes(key) && /[^a-zA-Z\s]/.test(value)) {
        return res
          .status(400)
          .json({ error: `El campo ${key} no puede contener caracteres especiales o números` });
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
    const hashedPassword = await bcrypt.hash(contrasenia.trim(), 10);


    // Insertar en la tabla Profesor
    const profesorResult = await pool.query(
      `INSERT INTO Profesor (idDireccion, Nombres, ApellidoPaterno, ApellidoMaterno, email, NumCelular, FechaDeNacimiento, Contrasenia, Rol, Estado) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING *`,
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
  } = req.body;
   // Validar campos obligatorios si se envían
   if (
    (idDireccion && idDireccion === "") ||
    (nombres && !nombres.trim()) ||
    (apellidoPaterno && !apellidoPaterno.trim()) ||
    (apellidoMaterno && !apellidoMaterno.trim()) ||
    (email && !email.trim()) ||
    (numCelular && !numCelular.trim()) ||
    (fechaDeNacimiento && !fechaDeNacimiento.trim()) ||
    (contrasenia && !contrasenia.trim()) ||
    (rol && !rol.trim())
  ) {
    return res
      .status(400)
      .json({ error: "Todos los campos son obligatorios y no pueden contener solo espacios en blanco" });
  }

  // Validar que los nombres y apellidos no contengan caracteres especiales si se proporcionan
  const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  if (nombres && !namePattern.test(nombres)) {
    return res.status(400).json({
      error: "Los nombres no deben contener caracteres especiales",
    });
  }
  if (apellidoPaterno && !namePattern.test(apellidoPaterno)) {
    return res.status(400).json({
      error: "El apellido paterno no debe contener caracteres especiales",
    });
  }
  if (apellidoMaterno && !namePattern.test(apellidoMaterno)) {
    return res.status(400).json({
      error: "El apellido materno no debe contener caracteres especiales",
    });
  }

  // Validar que el rol sea "Profesor"
  if (rol && rol !== "Profesor") {
    return res.status(400).json({ error: "El rol debe ser Profesor" });
  }

  // Validar que el email no esté repetido si se proporciona
  if (email) {
    const emailCheck = await pool.query(
      "SELECT idProfesor FROM Profesor WHERE email = $1 AND idProfesor != $2",
      [email.trim(), idProfesor]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        error: "El correo electrónico ya está registrado por otro usuario",
      });
    }
  }
  try {
    const { rows } = await pool.query("SELECT * FROM Profesor WHERE idProfesor = $1", [idProfesor]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Profesor no encontrado" });
    }
    const currentData = rows[0];

    let hashedPassword = currentData.contrasenia; // Mantener la contraseña actual si no se proporciona
    if (contrasenia) {
      hashedPassword = await bcrypt.hash(contrasenia.trim(), 10); // Cifrar si se proporciona una nueva
    }

    await pool.query(
      `UPDATE Profesor 
        SET idDireccion = $1, Nombres = $2, ApellidoPaterno = $3, ApellidoMaterno = $4, email = $5, NumCelular = $6, FechaDeNacimiento = $7, Contrasenia = $8, Rol = $9, Estado = $10
        WHERE idProfesor = $11`,
      [
        idDireccion || currentData.iddireccion,
        nombres?.trim() || currentData.nombres,
        apellidoPaterno?.trim() || currentData.apellidopaterno,
        apellidoMaterno?.trim() || currentData.apellidomaterno,
        email?.trim() || currentData.email,
        numCelular?.trim() || currentData.numcelular,
        fechaDeNacimiento || currentData.fechadenacimiento,
        hashedPassword, // Usar la nueva contraseña cifrada o mantener la actual
        rol?.trim() || currentData.rol,
        estado !== undefined ? estado : currentData.estado,
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