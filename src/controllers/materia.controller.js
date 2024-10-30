
import { pool } from "../db.js";


// Obtener todos los padres de familia
export const getMateria = async (req, res) => {
    try {
        const { rows } = await pool.query(`
        SELECT *
        FROM materia WHERE estado = 'true'
        ORDER BY idMateria ASC
    `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener la materia" });
    }
};

// Obtener un padre de familia por ID
export const getMateriaById = async (req, res) => {
    const { idMateria } = req.params;

    try {
        const { rows } = await pool.query(
            `
        SELECT *
        FROM materia
        WHERE idMateria = $1
        `,
            [idMateria]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "Materia no encontrado" });
        }

        const materia = rows[0];

        if (!motivo.estado) {
            return res.status(400).json({ error: "La Materia está deshabilitado" });
        }

        res.json(materia);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener la materia" });
    }
};
