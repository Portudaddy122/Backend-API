import { pool } from "../db.js";

export const getPersona = async (req, res) => {

    const {rows} = await pool.query('SELECT * FROM persona')
    console.log(rows);
    res.json(rows)
}


export const getPersonaId = async (req, res) => {
    const {idPersona} = req.params;
    try {
        const { rows } = await pool.query('SELECT * FROM persona WHERE idPersona = $1', [idPersona]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Persona no encontrada' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la persona' });
    }
}


export const createPersona = async (req, res) => {

    const { iddireccion, nombres, apellido_Paterno, apellido_Materno, rol, email, num_celular, fecha_de_nacimiento } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO Persona (iddireccion, nombres, apellido_paterno, apellido_materno, rol, email, num_celular, fecha_de_nacimiento) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [iddireccion, nombres, apellido_Paterno, apellido_Materno, rol, email, num_celular, fecha_de_nacimiento]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


export const updatePersona = async (req, res) => {
    const {id} = req.params;
    const data = req.body;
    try{
    const result = await pool.query('UPDATE Persona SET iddireccion = $1, nombres = $2, apellido_paterno = $3, apellido_materno = $4, rol = $5, email = $6, num_celular = $7, fecha_de_nacimiento = $8 WHERE idpersona = $9 RETURNING * ',
    [data.iddireccion, data.nombres,data.apellido_paterno, data.apellido_materno,
        data.rol, data.email, data.num_celular, data.fecha_de_nacimiento, id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Persona no encontrada' });
    }
     res.json(result.rows[0]);
   }catch(err){
    res.status(500).json({ message: err.message});
   }
    
}

export const deletePersona = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM Persona WHERE idPersona = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Persona no encontrada' });
        }
        res.json({ message: 'Persona eliminada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
