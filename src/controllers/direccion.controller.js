import { pool } from "../db.js";

// Obtener todas las direcciones
export const getDirecciones = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT *
            FROM Direccion WHERE estado = 'true'
            ORDER BY idDireccion ASC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las direcciones' });
    }
};

// Obtener una dirección por ID
export const getDireccionById = async (req, res) => {
    const { iddireccion } = req.params;
  
    try {
      const { rows } = await pool.query(
        `SELECT * FROM direccion WHERE iddireccion = $1 AND estado = true`,
        [iddireccion]
      );
  
      if (rows.length === 0) {
        return res.status(404).json({ error: "Dirección no encontrada" });
      }
  
      res.json(rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error al obtener la dirección" });
    }
  };
  
  // Crear una nueva dirección (estado por defecto: true)
  export const createDireccion = async (req, res) => {
    const { zona, calle, num_puerta } = req.body;
   
  
    if (!zona || !calle || !num_puerta) {
      return res.status(400).json({ error: "Todos los campos de la dirección son obligatorios" });
    }
  
    try {
      const result = await pool.query(
        `INSERT INTO direccion (zona, calle, num_puerta, estado) 
         VALUES ($1, $2, $3, true) 
         RETURNING *`,
        [zona, calle, num_puerta]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error al crear la dirección:", error.message);
      res.status(500).json({ error: "Error al crear la dirección" });
    }
  };
  
  
  // Actualizar una dirección
  export const updateDireccion = async (req, res) => {
    const { iddireccion } = req.params;
    const { zona, calle, num_puerta, estado } = req.body;
  
    try {
      const { rows } = await pool.query(
        "SELECT * FROM direccion WHERE iddireccion = $1 AND estado = true",
        [iddireccion]
      );
  
      if (rows.length === 0) {
        return res.status(404).json({ error: "Dirección no encontrada" });
      }
  
      const currentData = rows[0];
  
      const updatedData = {
        zona: zona || currentData.zona,
        calle: calle || currentData.calle,
        num_puerta: num_puerta || currentData.num_puerta,
        estado: estado !== undefined ? estado : currentData.estado
      };
  
      await pool.query(
        `UPDATE direccion 
         SET zona = $1, calle = $2, num_puerta = $3, estado = $4
         WHERE iddireccion = $5`,
        [updatedData.zona, updatedData.calle, updatedData.num_puerta, updatedData.estado, iddireccion]
      );
  
      res.json({ message: "Dirección actualizada correctamente" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error al actualizar la dirección" });
    }
  };
  
  // Eliminar (desactivar) una dirección
  export const deleteDireccion = async (req, res) => {
    const { iddireccion } = req.params;
  
    try {
      const result = await pool.query(
        "SELECT iddireccion FROM direccion WHERE iddireccion = $1 AND estado = true",
        [iddireccion]
      );
  
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Dirección no encontrada o ya desactivada" });
      }
  
      await pool.query(
        "UPDATE direccion SET estado = false WHERE iddireccion = $1",
        [iddireccion]
      );
  
      res.json({ message: "Dirección desactivada correctamente" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error al desactivar la dirección" });
    }
  };