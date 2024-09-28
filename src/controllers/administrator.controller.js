import { pool } from "../db.js";

// Obtener todos los administradores
export const getAdministrador = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT p.*, a.idAdministrador, a.contrasenia 
            FROM Persona p 
            INNER JOIN Administrador a ON p.idPersona = a.idPersona
            ORDER BY p.idPersona ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los administradores' });
    }
};

// Obtener un administrador por ID
export const getAdministradorById = async (req, res) => {
    const { idAdministrador } = req.params;
    
    try {
        const { rows } = await pool.query(`
            SELECT p.*, a.idAdministrador, a.contrasenia 
            FROM Persona p
            INNER JOIN Administrador a ON p.idPersona = a.idPersona
            WHERE a.idAdministrador = $1
        `, [idAdministrador]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Administrador no encontrado' });
        }

        const administrador = rows[0];

        // Comprobar si el administrador está desactivado
        if (!administrador.estado) {
            return res.status(400).json({ error: 'Administrador está deshabilitado' });
        }

        res.json(administrador);
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el administrador' });
    }
};

// Crear un nuevo administrador
export const createAdministrador = async (req, res) => {
    const { idDireccion, nombres, apellido_Paterno, apellido_Materno, rol, email, num_celular, fecha_de_nacimiento, contrasenia } = req.body;

    // Validar que todos los campos estén completos
    if (!idDireccion || !nombres || !apellido_Paterno || !apellido_Materno || !rol || !email || !num_celular || !fecha_de_nacimiento || !contrasenia) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        // Validar que el rol sea "Administrador"
        if (rol !== 'Administrador') {
            return res.status(400).json({ error: 'El rol debe ser Administrador' });
        }

        const personaResult = await pool.query(
            `INSERT INTO Persona (idDireccion, nombres, apellido_paterno, apellido_materno, rol, email, num_celular, fecha_de_nacimiento, estado) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING idPersona`,  // Estado se establece en true
            [idDireccion, nombres, apellido_Paterno, apellido_Materno, rol, email, num_celular, fecha_de_nacimiento]
        );

        const idPersona = personaResult.rows[0].idpersona;

        // Insertar el nuevo administrador con estado true
        const adminResult = await pool.query(
            `INSERT INTO Administrador (idPersona, Contrasenia, Estado) 
            VALUES ($1, $2, true) RETURNING *`, 
            [idPersona, contrasenia]
        );

        res.status(201).json(adminResult.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

/// Actualizar un administrador
export const updateAdministrador = async (req, res) => {
    const { idAdministrador } = req.params;
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
        estado // Estado puede ser true o false
    } = req.body;

    // Validar que todos los campos estén completos
    if (!idDireccion || !nombres || !apellido_Paterno || !apellido_Materno || !rol || !email || !num_celular || !fecha_de_nacimiento || !contrasenia || estado === undefined) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        // Validar que el rol sea "Administrador"
        if (rol !== 'Administrador') {
            return res.status(400).json({ error: 'El rol debe ser Administrador' });
        }

        const adminResult = await pool.query(
            `SELECT idpersona FROM Administrador WHERE idadministrador = $1`,
            [idAdministrador]
        );

        if (adminResult.rows.length === 0) {
            return res.status(404).json({ error: 'Administrador no encontrado' });
        }

        const idPersona = adminResult.rows[0].idpersona;

        // Actualizar los datos de la persona
        const personaResult = await pool.query(
            `UPDATE Persona 
            SET idDireccion = $1, nombres = $2, apellido_paterno = $3, apellido_materno = $4, rol = $5, email = $6, num_celular = $7, fecha_de_nacimiento = $8, Estado = $9
            WHERE idPersona = $10 RETURNING *`,
            [idDireccion, nombres, apellido_Paterno, apellido_Materno, rol, email, num_celular, fecha_de_nacimiento, estado, idPersona]
        );

        // Actualizar el estado del administrador
        const updateAdmin = await pool.query(
            `UPDATE Administrador 
            SET contrasenia = $1, Estado = $2
            WHERE idAdministrador = $3 RETURNING *`,
            [contrasenia, estado, idAdministrador] // Se actualiza también el estado
        );

        res.json({ persona: personaResult.rows[0], administrador: updateAdmin.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};


// Eliminar un administrador (desactivar)
export const deleteAdministrador = async (req, res) => {
    const { idAdministrador } = req.params;

    try {
        await pool.query('BEGIN');

        const adminResult = await pool.query(
            'SELECT idpersona FROM Administrador WHERE idadministrador = $1 AND Estado = true',
            [idAdministrador]
        );

        if (adminResult.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ error: 'Administrador no encontrado o ya desactivado' });
        }

        const idPersona = adminResult.rows[0].idpersona;

        await pool.query('UPDATE Administrador SET Estado = false WHERE idAdministrador = $1', [idAdministrador]);
        await pool.query('UPDATE Persona SET Estado = false WHERE idPersona = $1', [idPersona]);

        await pool.query('COMMIT');

        res.json({ message: 'Administrador desactivado correctamente' });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};
