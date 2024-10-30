
import { pool } from "../db.js";


// Obtener todos los padres de familia
export const getMotivos = async (req, res) => {
    try {
        const { rows } = await pool.query(`
        SELECT *
        FROM motivo WHERE estado = 'true'
        ORDER BY idMotivo ASC
    `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener el motivo" });
    }
};

// Obtener un padre de familia por ID
export const getMotivosById = async (req, res) => {
    const { idMotivo } = req.params;

    try {
        const { rows } = await pool.query(
            `
        SELECT *
        FROM motivo
        WHERE idMotivo = $1
        `,
            [idMotivo]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "Motivo no encontrado" });
        }

        const motivo = rows[0];

        if (!motivo.estado) {
            return res.status(400).json({ error: "El motivo está deshabilitado" });
        }

        res.json(motivo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener el motivo" });
    }
};



