import { pool } from "../db.js";

export const getPersona = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM Persona ORDER BY idPersona ASC'); // Solo obtenemos personas activas
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las personas' });
    }
};

export const getPersonaId = async (req, res) => {
    const { idpersona } = req.params;
    try {
        const { rows } = await pool.query('SELECT * FROM Persona WHERE idpersona = $1 ', [idpersona]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Persona no encontrada o inactiva' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la persona' });
    }
};

export const createPersona = async (req, res) => {
    const { idDireccion, nombres, apellido_Paterno, apellido_Materno, rol, email, num_celular, fecha_de_nacimiento } = req.body;

    // Validar campos obligatorios
    const requiredFields = [idDireccion, nombres, apellido_Paterno, apellido_Materno, rol, email, num_celular, fecha_de_nacimiento];
    for (const field of requiredFields) {
        if (field === null || field === undefined || field === '') {
            return res.status(400).json({ error: 'Todos los campos son obligatorios y no pueden ser nulos' });
        }
    }

    try {
        const result = await pool.query(
            'INSERT INTO Persona (idDireccion, Nombres, Apellido_Paterno, Apellido_Materno, Rol, email, Num_Celular, Fecha_De_Nacimiento, Estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING *',
            [idDireccion, nombres, apellido_Paterno, apellido_Materno, rol, email, num_celular, fecha_de_nacimiento]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

export const updatePersona = async (req, res) => {
    const { idpersona } = req.params;
    const data = req.body;

    // Validar que todos los campos requeridos no sean nulos o vacíos, 
    // pero permite que el campo estado sea válido aunque sea true/false
    const fields = ['iddireccion', 'nombres', 'apellido_paterno', 'apellido_materno', 'rol', 'email', 'num_celular', 'fecha_de_nacimiento'];
    for (const field of fields) {
        if (!data[field]) {
            return res.status(400).json({ error: `El campo ${field} no puede ser nulo o vacío` });
        }
    }

    try {
        // Primero, obtén la persona para verificar su existencia
        const result = await pool.query('SELECT * FROM Persona WHERE idPersona = $1', [idpersona]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Persona no encontrada' });
        }

        // Actualiza los datos de la persona
        const updateResult = await pool.query(
            `UPDATE Persona 
            SET iddireccion = $1, 
                nombres = $2, 
                apellido_paterno = $3, 
                apellido_materno = $4, 
                rol = $5, 
                email = $6, 
                num_celular = $7, 
                fecha_de_nacimiento = $8,
                estado = $9 
            WHERE idpersona = $10 
            RETURNING *`,
            [
                data.iddireccion,
                data.nombres,
                data.apellido_paterno,
                data.apellido_materno,
                data.rol,
                data.email,
                data.num_celular,
                data.fecha_de_nacimiento,
                data.estado, // Asegúrate de que este campo está incluido
                idpersona
            ]
        );

        res.json(updateResult.rows[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};



export const deletePersona = async (req, res) => {
    const { idpersona } = req.params;

    try {
        // Verificar si la persona existe
        const result = await pool.query('SELECT * FROM Persona WHERE idpersona = $1', [idpersona]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Persona no encontrada' });
        }

        // Verificar si la persona ya está inactiva
        const persona = result.rows[0];
        if (!persona.estado) {
            return res.status(400).json({ error: 'Persona ya inactiva' });
        }

        // Actualizar el estado de la persona a false
        await pool.query('UPDATE Persona SET estado = $1 WHERE idpersona = $2', [false, idpersona]);

        res.json({ message: 'Persona desactivada correctamente' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};



export const getUserCount = async (req, res) => {
    try {
      const query = `
        SELECT COUNT(*) AS total_users
        FROM persona
        WHERE estado = true;
      `;
  
      const result = await pool.query(query);
      const totalUsers = parseInt(result.rows[0].total_users, 10);
  
      res.status(200).json({
        total: totalUsers,
      });
    } catch (error) {
      console.error('Error fetching user count:', error);
      res.status(500).json({ error: 'Error fetching user count' });
    }
  };