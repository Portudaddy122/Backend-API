import { pool } from "../db.js";
import bcrypt from "bcrypt";

// Obtener todos los psicólogos
export const getPsicologos = async (req, res) => {
  try {
    const { rows } = await pool.query(`
            SELECT *
            FROM psicologo
            ORDER BY idPsicologo ASC
        `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los psicólogos" });
  }
};

// Obtener un psicólogo por ID
export const getPsicologoById = async (req, res) => {
  const { idPsicologo } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM psicologo WHERE idPsicologo = $1`,
      [idPsicologo]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Psicólogo no encontrado" });
    }

    const psicologo = rows[0];

    if (!psicologo.estado) {
      return res.status(400).json({ error: "Psicólogo está deshabilitado" });
    }

    res.json(psicologo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el psicólogo" });
  }
};

// Validación de campos vacíos y caracteres especiales en nombres y apellidos
const validatePsicologoFields = (req, res) => {
  const {
    idDireccion,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    email,
    numCelular,
    fechaDeNacimiento,
    rol,
  } = req.body;

  // Validar que ningún campo esté vacío o contenga solo espacios en blanco
  if (
    !idDireccion ||
    !nombres?.trim() ||
    !apellidoPaterno?.trim() ||
    !apellidoMaterno?.trim() ||
    !email?.trim() ||
    !numCelular?.trim() ||
    !fechaDeNacimiento ||
    !rol?.trim()
  ) {
    return res.status(400).json({
      error:
        "Todos los campos son obligatorios y no pueden contener solo espacios en blanco",
    });
  }

  // Validar que los nombres y apellidos no contengan caracteres especiales o números
  const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  if (
    !namePattern.test(nombres) ||
    !namePattern.test(apellidoPaterno) ||
    !namePattern.test(apellidoMaterno)
  ) {
    return res.status(400).json({
      error:
        "Los nombres y apellidos no deben contener caracteres especiales o números",
    });
  }

  // Validar que el rol sea "psicologo"
  if (rol.toLowerCase() !== "psicologo") {
    return res.status(400).json({ error: "El rol debe ser 'psicologo'" });
  }

  return null; // Si todo está correcto, retornamos null
};

// Crear un nuevo psicólogo
export const createPsicologo = async (req, res) => {
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
      // Validar que ningún campo esté vacío o contenga solo espacios en blanco
      if (
        !idDireccion ||
        !nombres?.trim() ||
        !apellidoPaterno?.trim() ||
        !apellidoMaterno?.trim() ||
        !email?.trim() ||
        !numCelular?.trim() ||
        !fechaDeNacimiento ||
        !contrasenia?.trim() ||
        !rol?.trim()
      ) {
        return res.status(400).json({ error: "Todos los campos son obligatorios y no pueden contener solo espacios en blanco" });
      }
  
      // Validar que los nombres y apellidos no contengan caracteres especiales
      const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
      if (
        !namePattern.test(nombres) ||
        !namePattern.test(apellidoPaterno) ||
        !namePattern.test(apellidoMaterno)
      ) {
        return res.status(400).json({
          error: "Los nombres y apellidos no deben contener caracteres especiales",
        });
      }
  
      // Validar que el rol sea "Psicologo"
      if (rol.toLowerCase() !== "psicologo") {
        return res.status(400).json({ error: "El rol debe ser 'Psicologo'" });
      }
  
      // Validar que el email no esté repetido
      const emailCheck = await pool.query(
        "SELECT idPsicologo FROM Psicologo WHERE email = $1",
        [email.trim()]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          error: "El correo electrónico ya está registrado por otro usuario",
        });
      }
      const hashedPassword = await bcrypt.hash(contrasenia.trim(), 10);

  
      // Insertar en la tabla Psicologo
      const psicologoResult = await pool.query(
        `INSERT INTO Psicologo (idDireccion, Nombres, ApellidoPaterno, ApellidoMaterno, email, NumCelular, FechaDeNacimiento, Contrasenia, Rol, Estado) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING *`,
        [
          idDireccion,
          nombres.trim(),
          apellidoPaterno.trim(),
          apellidoMaterno.trim(),
          email.trim(),
          numCelular.trim(),
          fechaDeNacimiento,
          hashedPassword,
          rol.trim(),
        ]
      );
  
      res.status(201).json(psicologoResult.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  };
  
// Actualizar un psicólogo
export const updatePsicologo = async (req, res) => {
    const { idPsicologo } = req.params;
    const {
      idDireccion,
      nombres,
      apellidoPaterno,
      apellidoMaterno,
      email,
      numCelular,
      fechaDeNacimiento,
      estado,
      contrasenia,
    } = req.body;
  
    try {
      const { rows } = await pool.query("SELECT * FROM psicologo WHERE idPsicologo = $1", [idPsicologo]);
      if (rows.length === 0) {
        return res.status(404).json({ error: "Psicólogo no encontrado" });
      }
      const currentData = rows[0];
  
      let hashedPassword = currentData.contrasenia; // Mantener la contraseña actual si no se proporciona
      if (contrasenia) {
        hashedPassword = await bcrypt.hash(contrasenia.trim(), 10); // Cifrar si se proporciona una nueva
      }
  
      await pool.query(
        `UPDATE psicologo 
           SET idDireccion = $1, nombres = $2, apellidoPaterno = $3, apellidoMaterno = $4, email = $5, numCelular = $6, fechaDeNacimiento = $7, estado = $8, contrasenia = $9
           WHERE idPsicologo = $10`,
        [
          idDireccion || currentData.iddireccion,
          nombres.trim() || currentData.nombres,
          apellidoPaterno.trim() || currentData.apellidopaterno,
          apellidoMaterno.trim() || currentData.apellidomaterno,
          email.trim() || currentData.email,
          numCelular.trim() || currentData.numcelular,
          fechaDeNacimiento || currentData.fechadenacimiento,
          estado !== undefined ? estado : currentData.estado,
          hashedPassword, // Usar la nueva contraseña cifrada o mantener la actual
          idPsicologo,
        ]
      );
  
      res.json({ message: "Psicólogo actualizado correctamente" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  };
  
// Eliminar (desactivar) un psicólogo
export const deletePsicologo = async (req, res) => {
  const { idPsicologo } = req.params;

  try {
    const result = await pool.query(
      "SELECT idPsicologo FROM psicologo WHERE idPsicologo = $1 AND estado = true",
      [idPsicologo]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Psicólogo no encontrado o ya desactivado" });
    }

    await pool.query(
      "UPDATE psicologo SET estado = false WHERE idPsicologo = $1",
      [idPsicologo]
    );

    res.json({ message: "Psicólogo desactivado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
