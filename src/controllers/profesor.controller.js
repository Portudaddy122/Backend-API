import { pool } from "../db.js";


export const getProfesores = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT p.*, pr.idProfesor, pr.contrasenia, pr.usuario FROM Persona p INNER JOIN Profesor pr ON p.idPersona = pr.idPersona');
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
            SELECT p.*, pr.idProfesor, pr.contrasenia, pr.usuario 
            FROM Persona p
            INNER JOIN Profesor pr ON p.idPersona = pr.idPersona
            WHERE pr.idProfesor = $1
        `, [idProfesor]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Profesor no encontrado' });
        }

       
        const persona = rows[0];
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
    const { idDireccion, nombres, apellido_Paterno, apellido_Materno, rol, email, num_celular, fecha_de_nacimiento, contrasenia, usuario } = req.body;
    
    try {
        // Primero insertamos la Persona
        const personaResult = await pool.query(
            `INSERT INTO Persona (idDireccion, nombres, apellido_paterno, apellido_materno, rol, email, num_celular, fecha_de_nacimiento) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING idPersona`,
            [idDireccion, nombres, apellido_Paterno, apellido_Materno, rol, email, num_celular, fecha_de_nacimiento]
        );
        const idPersona = personaResult.rows[0].idpersona;

        // Luego insertamos el Profesor vinculado con la Persona
        const profesorResult = await pool.query(
            `INSERT INTO Profesor (idPersona, Contrasenia, Usuario) 
            VALUES ($1, $2, $3) RETURNING *`,
            [idPersona, contrasenia, usuario]
        );

        res.status(201).json(profesorResult.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

export const updateProfesor = async (req, res) => {
    const { idProfesor } = req.params;
    console.log("ID de Profesor:", idProfesor); 

    const { idDireccion, nombres, apellido_Paterno, apellido_Materno, rol, email, num_celular, fecha_de_nacimiento, contrasenia, usuario } = req.body;

    try {
        
        const profesorResult = await pool.query(
            `SELECT idpersona FROM Profesor WHERE idprofesor = $1`,
            [idProfesor]
        );

        console.log(profesorResult.rows); 

        if (profesorResult.rows.length === 0) {
            return res.status(404).json({ message: 'Profesor no encontrado' });
        }

        const idPersona = profesorResult.rows[0].idpersona;

        const personaResult = await pool.query(
            `UPDATE Persona 
            SET idDireccion = $1, nombres = $2, apellido_paterno = $3, apellido_materno = $4, rol = $5, email = $6, num_celular = $7, fecha_de_nacimiento = $8
            WHERE idPersona = $9 RETURNING *`,
            [idDireccion, nombres, apellido_Paterno, apellido_Materno, rol, email, num_celular, fecha_de_nacimiento, idPersona]
        );

        const updateProfesor = await pool.query(
            `UPDATE Profesor 
            SET contrasenia = $1, usuario = $2 
            WHERE idProfesor = $3 RETURNING *`,
            [contrasenia, usuario, idProfesor]
        );

        res.json(updateProfesor.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};


export const deleteProfesor = async (req, res) => {
    const { idProfesor } = req.params;

    try {
        // Iniciar una transacción
        await pool.query('BEGIN');

        // Primero obtenemos el idPersona relacionado al profesor que queremos eliminar
        const profesorResult = await pool.query('SELECT idpersona FROM Profesor WHERE idprofesor = $1', [idProfesor]);

        if (profesorResult.rows.length === 0) {
            await pool.query('ROLLBACK'); // Si no se encuentra el profesor, se cancela la transacción
            return res.status(404).json({ error: 'Profesor no encontrado' });
        }

        const idPersona = profesorResult.rows[0].idpersona;

        // Eliminamos el profesor de la tabla Profesor
        await pool.query('DELETE FROM Profesor WHERE idprofesor = $1', [idProfesor]);

        // Luego eliminamos la persona de la tabla Persona
        await pool.query('DELETE FROM Persona WHERE idpersona = $1', [idPersona]);

        // Confirmamos la transacción
        await pool.query('COMMIT');

        res.json({ message: 'Profesor y Persona eliminados correctamente' });
    } catch (err) {
        await pool.query('ROLLBACK'); // Si hay algún error, revertimos la transacción
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

