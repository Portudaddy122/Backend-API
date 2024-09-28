import { pool } from "../db.js";


export const getProfesores = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT p.*, pr.idProfesor, pr.contrasenia, 
            CASE 
                WHEN p.estado = false THEN 'Deshabilitado' 
                ELSE 'Habilitado' 
            END AS estado_usuario
            FROM Persona p 
            INNER JOIN Profesor pr ON p.idPersona = pr.idPersona
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los profesores' });
    }
};


export const getProfesorById = async (req, res) => {
    const { idProfesor } = req.params;
    
    try {
        const { rows } = await pool.query(`
            SELECT p.*, pr.idProfesor, pr.contrasenia, pr.estado AS profesorEstado 
            FROM Persona p
            INNER JOIN Profesor pr ON p.idPersona = pr.idPersona
            WHERE pr.idProfesor = $1
        `, [idProfesor]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Profesor no encontrado' });
        }

        const persona = rows[0];

        // Verificar si el estado del profesor es false
        if (persona.profesorestado === false) {
            return res.status(404).json({ error: 'Usuario deshabilitado' });
        }

        if (persona.rol !== 'Profesor') {
            return res.status(400).json({ error: 'El usuario no es Profesor' });
        }

        res.json(persona);
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el profesor' });
    }
};


export const createProfesor = async (req, res) => {
    const { idDireccion, nombres, apellido_Paterno, apellido_Materno, rol, email, num_celular, fecha_de_nacimiento, contrasenia } = req.body;

    try {
        // Validar campos obligatorios
        const requiredFields = [idDireccion, nombres, apellido_Paterno, apellido_Materno, rol, email, num_celular, fecha_de_nacimiento, contrasenia];
        for (const field of requiredFields) {
            if (field === null || field === undefined || field === '') {
                return res.status(400).json({ error: 'Todos los campos son obligatorios y no pueden ser nulos' });
            }
        }

        if (rol !== 'Profesor') {
            return res.status(400).json({ error: 'El rol debe ser Profesor' });
        }

        // Insertar en la tabla Persona con estado habilitado (true)
        const personaResult = await pool.query(
            `INSERT INTO Persona (idDireccion, nombres, apellido_paterno, apellido_materno, rol, email, num_celular, fecha_de_nacimiento, estado) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING idPersona`,
            [idDireccion, nombres, apellido_Paterno, apellido_Materno, rol, email, num_celular, fecha_de_nacimiento]
        );
        const idPersona = personaResult.rows[0].idpersona;

        // Insertar en la tabla Profesor
        const profesorResult = await pool.query(
            `INSERT INTO Profesor (idPersona, Contrasenia, Estado) 
            VALUES ($1, $2, true) RETURNING *`,
            [idPersona, contrasenia]
        );

        res.status(201).json(profesorResult.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};



export const updateProfesor = async (req, res) => {
    const { idProfesor } = req.params;
    const { 
        idDireccion, 
        nombres, 
        apellido_Paterno, 
        apellido_Materno, 
        rol, 
        email, 
        num_celular, 
        fecha_de_nacimiento, 
        contrasenia, 
        estado 
    } = req.body;

    try {
        // Primero obtenemos el idPersona relacionado al profesor
        const profesorResult = await pool.query('SELECT idpersona FROM Profesor WHERE idprofesor = $1', [idProfesor]);

        if (profesorResult.rows.length === 0) {
            return res.status(404).json({ error: 'Profesor no encontrado' });
        }

        const idPersona = profesorResult.rows[0].idpersona;

        // Actualizamos los datos en la tabla Persona
        await pool.query(`
            UPDATE Persona 
            SET idDireccion = $1, 
                nombres = $2, 
                apellido_paterno = $3, 
                apellido_materno = $4, 
                rol = $5, 
                email = $6, 
                num_celular = $7, 
                fecha_de_nacimiento = $8, 
                estado = $9 
            WHERE idpersona = $10
        `, [idDireccion, nombres, apellido_Paterno, apellido_Materno, rol, email, num_celular, fecha_de_nacimiento, estado, idPersona]);

        // Actualizamos la contraseña en la tabla Profesor
        await pool.query(`
            UPDATE Profesor 
            SET contrasenia = $1 
            WHERE idProfesor = $2
        `, [contrasenia, idProfesor]);

        res.json({ message: 'Profesor actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el profesor' });
    }
};


export const deleteProfesor = async (req, res) => {
    const { idProfesor } = req.params;

    try {
        // Iniciar una transacción
        await pool.query('BEGIN');

        // Primero obtenemos el idPersona relacionado al profesor
        const profesorResult = await pool.query('SELECT idpersona FROM Profesor WHERE idprofesor = $1', [idProfesor]);

        if (profesorResult.rows.length === 0) {
            await pool.query('ROLLBACK'); // Si no se encuentra el profesor, se cancela la transacción
            return res.status(404).json({ error: 'Profesor no encontrado' });
        }

        const idPersona = profesorResult.rows[0].idpersona;

        // Actualizamos el estado del profesor a false (inactivo)
        await pool.query('UPDATE Profesor SET Estado = false WHERE idprofesor = $1', [idProfesor]);

        // También actualizamos el estado de la persona a false
        await pool.query('UPDATE Persona SET Estado = false WHERE idpersona = $1', [idPersona]);

        // Confirmamos la transacción
        await pool.query('COMMIT');

        res.json({ message: 'Profesor marcado como inactivo correctamente' });
    } catch (err) {
        await pool.query('ROLLBACK'); // Si hay algún error, revertimos la transacción
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};
