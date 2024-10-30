import { pool } from "../db.js";

// Obtener todos los estudiantes
export const getEstudiantes = async (req, res) => {
  try {
    const { rows } = await pool.query(`
            SELECT *
            FROM estudiante WHERE estado = 'true'
            ORDER BY idEstudiante ASC
        `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los estudiantes" });
  }
};

// Obtener un estudiante por ID
export const getEstudianteById = async (req, res) => {
  const { idEstudiante } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM estudiante WHERE idEstudiante = $1`,
      [idEstudiante]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    const estudiante = rows[0];

    if (!estudiante.estado) {
      return res.status(400).json({ error: "Estudiante está deshabilitado" });
    }

    res.json(estudiante);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el estudiante" });
  }
};

// Validación de campos vacíos y caracteres especiales en nombres y apellidos
const validateEstudianteFields = (req, res) => {
  const { idPadre, idCurso, nombres, apellidoPaterno, apellidoMaterno, fechaNacimiento, rol } = req.body;

  // Validar que ningún campo esté vacío o contenga solo espacios en blanco
  if (
    !idPadre ||
    !idCurso ||
    !nombres?.trim() ||
    !apellidoPaterno?.trim() ||
    !apellidoMaterno?.trim() ||
    !fechaNacimiento ||
    !rol?.trim()
  ) {
    return res.status(400).json({ error: "Todos los campos son obligatorios y no pueden contener solo espacios en blanco" });
  }

  // Validar que los nombres y apellidos no contengan caracteres especiales o números
  const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  if (!namePattern.test(nombres) || !namePattern.test(apellidoPaterno) || !namePattern.test(apellidoMaterno)) {
    return res.status(400).json({
      error: "Los nombres y apellidos no deben contener caracteres especiales o números",
    });
  }

  // Validar que el rol sea "estudiante"
  if (rol.toLowerCase() !== "estudiante") {
    return res.status(400).json({ error: "El rol debe ser 'estudiante'" });
  }

  return null; // Si todo está correcto, retornamos null
};

// Crear un nuevo estudiante
export const createEstudiante = async (req, res) => {
  const validationError = validateEstudianteFields(req, res);
  if (validationError) return validationError;

  const { idPadre, idCurso, nombres, apellidoPaterno, apellidoMaterno, fechaNacimiento } = req.body;

  try {
    // Insertar en la tabla estudiante
    const result = await pool.query(
      `INSERT INTO estudiante (idPadre, idCurso, nombres, apellidoPaterno, apellidoMaterno, fechaNacimiento, estado, rol) 
        VALUES ($1, $2, $3, $4, $5, $6, true, 'Estudiante') RETURNING *`,
      [idPadre, idCurso, nombres.trim(), apellidoPaterno.trim(), apellidoMaterno.trim(), fechaNacimiento]
    );
    

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Actualizar un estudiante
export const updateEstudiante = async (req, res) => {
  const { idEstudiante } = req.params;

  const validationError = validateEstudianteFields(req, res);
  if (validationError) return validationError;

  const { idPadre, idCurso, nombres, apellidoPaterno, apellidoMaterno, fechaNacimiento, estado } = req.body;

  try {
    const { rows } = await pool.query("SELECT * FROM estudiante WHERE idEstudiante = $1", [idEstudiante]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    const currentData = rows[0];

    const updatedData = {
      idPadre: idPadre || currentData.idPadre, // Si no se envía, mantener el valor actual
      idCurso: idCurso || currentData.idCurso,
      nombres: nombres?.trim() || currentData.nombres,
      apellidoPaterno: apellidoPaterno?.trim() || currentData.apellidoPaterno,
      apellidoMaterno: apellidoMaterno?.trim() || currentData.apellidoMaterno,
      fechaNacimiento: fechaNacimiento || currentData.fechaNacimiento,
      estado: estado !== undefined ? estado : currentData.estado, // Mantener el estado actual si no se envía
      rol: 'Estudiante' // Asegurarse de que el rol siempre sea 'Estudiante'
    };

    await pool.query(
      `UPDATE estudiante 
       SET idPadre = $1, idCurso = $2, nombres = $3, apellidoPaterno = $4, apellidoMaterno = $5, fechaNacimiento = $6, estado = $7, rol = $8
       WHERE idEstudiante = $9`,
      [
        updatedData.idPadre,
        updatedData.idCurso,
        updatedData.nombres,
        updatedData.apellidoPaterno,
        updatedData.apellidoMaterno,
        updatedData.fechaNacimiento,
        updatedData.estado,
        updatedData.rol,
        idEstudiante
      ]
    );

    res.json({ message: "Estudiante actualizado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


// Eliminar (desactivar) un estudiante
export const deleteEstudiante = async (req, res) => {
  const { idEstudiante } = req.params;

  try {
    const result = await pool.query(
      "SELECT idEstudiante FROM estudiante WHERE idEstudiante = $1 AND estado = true",
      [idEstudiante]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Estudiante no encontrado o ya desactivado" });
    }

    await pool.query(
      "UPDATE estudiante SET estado = false WHERE idEstudiante = $1",
      [idEstudiante]
    );

    res.json({ message: "Estudiante desactivado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};