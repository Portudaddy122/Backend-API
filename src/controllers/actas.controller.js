import { pool } from "../db.js";

export const obtenerActasReunion = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * 
      FROM actadereunion 
      ORDER BY idacta ASC
    `);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener las actas de reunión:", error);
    res.status(500).json({ error: "Error al obtener las actas de reunión" });
  }
};



export const obtenerActaReunionPorId = async (req, res) => {
  const { idActa } = req.params;

  try {
    const { rows } = await pool.query(`
      SELECT * 
      FROM actadereunion 
      WHERE idacta = $1
    `, [idActa]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "El acta de reunión no existe" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error al obtener el acta de reunión:", error);
    res.status(500).json({ error: "Error al obtener el acta de reunión" });
  }
};


export const crearActaReunion = async (req, res) => {
  const {
    idreservarentrevista,
    idmotivo,
    descripcion,
    fechadecreacion,
    estado,
    idestudiante,
    idmateria,
  } = req.body;

  try {
    // Validaciones básicas
    if (
      !idreservarentrevista ||
      !idmotivo ||
      !descripcion?.trim() ||
      !fechadecreacion ||
      !idestudiante ||
      !idmateria
    ) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    const { rows } = await pool.query(
      `
      INSERT INTO actadereunion (idreservarentrevista, idmotivo, descripcion, fechadecreacion, estado, idestudiante, idmateria)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
      [idreservarentrevista, idmotivo, descripcion.trim(), fechadecreacion, estado ?? true, idestudiante, idmateria]
    );

    res.status(201).json({
      message: "Acta de reunión creada exitosamente",
      acta: rows[0],
    });
  } catch (error) {
    console.error("Error al crear el acta de reunión:", error);
    res.status(500).json({ error: "Error al crear el acta de reunión" });
  }
};


export const actualizarActaReunion = async (req, res) => {
  const { idActa } = req.params;
  const {
    idreservarentrevista,
    idmotivo,
    descripcion,
    fechadecreacion,
    estado,
    idestudiante,
    idmateria,
  } = req.body;

  try {
    const { rows } = await pool.query("SELECT * FROM actadereunion WHERE idacta = $1", [idActa]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "El acta de reunión no existe" });
    }

    const updatedActa = await pool.query(
      `
      UPDATE actadereunion
      SET 
        idreservarentrevista = COALESCE($1, idreservarentrevista),
        idmotivo = COALESCE($2, idmotivo),
        descripcion = COALESCE($3, descripcion),
        fechadecreacion = COALESCE($4, fechadecreacion),
        estado = COALESCE($5, estado),
        idestudiante = COALESCE($6, idestudiante),
        idmateria = COALESCE($7, idmateria)
      WHERE idacta = $8
      RETURNING *
    `,
      [
        idreservarentrevista,
        idmotivo,
        descripcion?.trim(),
        fechadecreacion,
        estado,
        idestudiante,
        idmateria,
        idActa,
      ]
    );

    res.status(200).json({
      message: "Acta de reunión actualizada exitosamente",
      acta: updatedActa.rows[0],
    });
  } catch (error) {
    console.error("Error al actualizar el acta de reunión:", error);
    res.status(500).json({ error: "Error al actualizar el acta de reunión" });
  }
};


export const eliminarActaReunion = async (req, res) => {
  const { idActa } = req.params;

  try {
    const { rows } = await pool.query(
      `
      UPDATE actadereunion
      SET estado = false
      WHERE idacta = $1
      RETURNING *
    `,
      [idActa]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "El acta de reunión no existe" });
    }

    res.json({ message: "Acta de reunión eliminada (desactivada) exitosamente" });
  } catch (error) {
    console.error("Error al eliminar el acta de reunión:", error);
    res.status(500).json({ error: "Error al eliminar el acta de reunión" });
  }
};


export const getActasByEstudiante = async (req, res) => {
  const { idestudiante } = req.params;

  try {
    const { rows } = await pool.query(
      `
      SELECT 
        actadereunion.idacta,
        actadereunion.idreservarentrevista,
        actadereunion.descripcion,
        actadereunion.fechadecreacion,
        actadereunion.estado,
        materia.nombre AS materia,
        motivo.nombremotivo AS motivo
      FROM actadereunion
      INNER JOIN materia ON actadereunion.idmateria = materia.idmateria
      INNER JOIN motivo ON actadereunion.idmotivo = motivo.idmotivo
      WHERE actadereunion.idestudiante = $1 AND actadereunion.estado = true
      ORDER BY actadereunion.fechadecreacion DESC
    `,
      [idestudiante]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener las actas por estudiante:", error);
    res.status(500).json({ error: "Error al obtener las actas por estudiante" });
  }
};


export const activarActaReunion = async (req, res) => {
  const { idActa } = req.params;

  try {
    const { rows } = await pool.query(
      `
      UPDATE actadereunion
      SET estado = true
      WHERE idacta = $1
      RETURNING *
    `,
      [idActa]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "El acta de reunión no existe" });
    }

    res.json({ message: "Acta de reunión activada exitosamente", acta: rows[0] });
  } catch (error) {
    console.error("Error al activar el acta de reunión:", error);
    res.status(500).json({ error: "Error al activar el acta de reunión" });
  }
};


export const obtenerActasInactivas = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        actadereunion.idacta,
        actadereunion.fechadecreacion,
        actadereunion.descripcion,
        materia.nombre AS materia,
        motivo.nombremotivo AS motivo
      FROM actadereunion
      JOIN materia ON actadereunion.idmateria = materia.idmateria
      JOIN motivo ON actadereunion.idmotivo = motivo.idmotivo
      WHERE actadereunion.estado = false
      ORDER BY actadereunion.fechadecreacion DESC
    `);

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener las actas inactivas:", error);
    res.status(500).json({ error: "Error al obtener las actas inactivas" });
  }
};

