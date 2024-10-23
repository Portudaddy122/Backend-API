import { pool } from "../db.js";

// Obtener todos los cursos
export const getCursos = async (req, res) => {
  try {
    const { rows } = await pool.query(`
            SELECT *
            FROM Curso
            ORDER BY idCurso ASC
        `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los cursos" });
  }
};

// Obtener un curso por ID
export const getCursoById = async (req, res) => {
  const { idCurso } = req.params;

  try {
    const { rows } = await pool.query(
      `
            SELECT *
            FROM Curso
            WHERE idCurso = $1
        `,
      [idCurso]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el curso" });
  }
};

// Crear un nuevo curso
export const createCurso = async (req, res) => {
  const { paralelo, nivel, nombreCurso, horaInicio, horaFin } = req.body;

  try {
    // Validar que ningún campo esté vacío o contenga solo espacios en blanco
    if (
      !paralelo?.trim() ||
      !nivel?.trim() ||
      !nombreCurso?.trim() ||
      !horaInicio?.trim() ||
      !horaFin?.trim()
    ) {
      return res.status(400).json({ error: "Todos los campos son obligatorios y no pueden contener solo espacios en blanco" });
    }

    // Verificar si ya existe un curso con el mismo nombreCurso, paralelo y nivel
    const duplicateCheck = await pool.query(
      "SELECT idCurso FROM Curso WHERE nombreCurso = $1 AND paralelo = $2 AND nivel = $3",
      [nombreCurso.trim(), paralelo.trim(), nivel.trim()]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ error: "Ya existe un curso con el mismo nombre, paralelo y nivel." });
    }

    // Insertar en la tabla Curso
    const result = await pool.query(
      `INSERT INTO Curso (paralelo, nivel, nombreCurso, horaInicio, horaFin, estado) 
            VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
      [
        paralelo.trim(),
        nivel.trim(),
        nombreCurso.trim(),
        horaInicio.trim(),
        horaFin.trim()
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Actualizar un curso
export const updateCurso = async (req, res) => {
  const { idCurso } = req.params;
  const { paralelo, nivel, nombreCurso, horaInicio, horaFin, estado } = req.body;

  try {
    // Verificar si el curso existe
    const { rows } = await pool.query("SELECT * FROM Curso WHERE idCurso = $1", [idCurso]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }

    // Verificar si ya existe otro curso con el mismo nombre, paralelo y nivel al actualizar
    const duplicateCheck = await pool.query(
      "SELECT idCurso FROM Curso WHERE nombreCurso = $1 AND paralelo = $2 AND nivel = $3 AND idCurso != $4",
      [nombreCurso.trim(), paralelo.trim(), nivel.trim(), idCurso]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ error: "Ya existe otro curso con el mismo nombre, paralelo y nivel." });
    }

    // Usar los valores proporcionados o conservar los valores actuales
    const updatedData = {
      paralelo: paralelo?.trim() || rows[0].paralelo,
      nivel: nivel?.trim() || rows[0].nivel,
      nombreCurso: nombreCurso?.trim() || rows[0].nombrecurso,
      horaInicio: horaInicio?.trim() || rows[0].horainicio,
      horaFin: horaFin?.trim() || rows[0].horafin,
      estado: estado !== undefined ? estado : rows[0].estado,
    };

    // Actualizar los datos en la base de datos
    await pool.query(
      `
        UPDATE Curso 
        SET paralelo = $1, nivel = $2, nombreCurso = $3, horaInicio = $4, horaFin = $5, estado = $6
        WHERE idCurso = $7
      `,
      [
        updatedData.paralelo,
        updatedData.nivel,
        updatedData.nombreCurso,
        updatedData.horaInicio,
        updatedData.horaFin,
        updatedData.estado,
        idCurso,
      ]
    );

    res.json({ message: "Curso actualizado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Eliminar un curso (desactivar)
export const deleteCurso = async (req, res) => {
  const { idCurso } = req.params;

  try {
    const result = await pool.query(
      "SELECT idCurso FROM Curso WHERE idCurso = $1 AND estado = true",
      [idCurso]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Curso no encontrado o ya desactivado" });
    }

    await pool.query(
      "UPDATE Curso SET estado = false WHERE idCurso = $1",
      [idCurso]
    );

    res.json({ message: "Curso desactivado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
