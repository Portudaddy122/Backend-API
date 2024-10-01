import { pool } from "../db.js";

// Obtener todas las direcciones
export const getDirecciones = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT *
            FROM Direccion
            ORDER BY idDireccion ASC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las direcciones' });
    }
};

