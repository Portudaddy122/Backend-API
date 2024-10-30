import { pool } from "../db.js";

// Obtener todos los horarios
export const getHorarios = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT *
      FROM horario WHERE estado = 'true'
      ORDER BY idhorario ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los horarios" });
  }
};

// Obtener un horario por ID
export const getHorarioById = async (req, res) => {
  const { idHorario } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM horario WHERE idHorario = $1`,
      [idHorario]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Horario no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el horario" });
  }
};

// Crear un nuevo horario
export const createHorario = async (req, res) => {
  const { idmateria, horainicio, horafin, fecha, estado } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO horario (idmateria, horainicio, horafin, fecha, estado) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [idmateria, horainicio, horafin, fecha, estado]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear el horario" });
  }
};

// Actualizar un horario
export const updateHorario = async (req, res) => {
  const { idhorario } = req.params;
  const { idmateria, horainicio, horafin, fecha, estado } = req.body;

  try {
    const { rows } = await pool.query(
      "SELECT * FROM horario WHERE idhorario = $1",
      [idhorario]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Horario no encontrado" });
    }

    const currentData = rows[0];

    const updatedData = {
      idmateria: idmateria || currentData.idmateria,
      horainicio: horainicio || currentData.horainicio,
      horafin: horafin || currentData.horafin,
      fecha: fecha || currentData.fecha,
      estado: estado !== undefined ? estado : currentData.estado
    };

    await pool.query(
      `UPDATE horario 
       SET idmateria = $1, horainicio = $2, horafin = $3, fecha = $4, estado = $5
       WHERE idhorario = $6`,
      [
        updatedData.idmateria,
        updatedData.horainicio,
        updatedData.horafin,
        updatedData.fecha,
        updatedData.estado,
        idhorario
      ]
    );

    res.json({ message: "Horario actualizado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar el horario" });
  }
};

// Eliminar (desactivar) un horario
export const deleteHorario = async (req, res) => {
  const { idhorario } = req.params;

  try {
    const result = await pool.query(
      "SELECT idhorario FROM horario WHERE idhorario = $1 AND estado = true",
      [idhorario]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Horario no encontrado o ya desactivado" });
    }

    await pool.query(
      "UPDATE horario SET estado = false WHERE idhorario = $1",
      [idhorario]
    );

    res.json({ message: "Horario desactivado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al desactivar el horario" });
  }
};
