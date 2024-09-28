    import { pool } from "../db.js";

    // Obtener todos los padres de familia
    export const getPadresFamilia = async (req, res) => {
        try {
            const { rows } = await pool.query(`
                SELECT p.*, pf.idPadre, pf.contrasenia 
                FROM Persona p 
                INNER JOIN Padre_De_Familia pf ON p.idPersona = pf.idPersona
                ORDER BY p.idPersona ASC
            `);
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: 'Error al obtener los padres de familia' });
        }
    };

    // Obtener un padre de familia por ID
    export const getPadreFamiliaById = async (req, res) => {
        const { idPadre } = req.params;

        try {
            const { rows } = await pool.query(`
                SELECT p.*, pf.idPadre, pf.contrasenia 
                FROM Persona p
                INNER JOIN Padre_De_Familia pf ON p.idPersona = pf.idPersona
                WHERE pf.idPadre = $1 AND p.estado = true
            `, [idPadre]);

            if (rows.length === 0) {
                return res.status(404).json({ error: 'Padre de familia no encontrado o inactivo' });
            }

            res.json(rows[0]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error al obtener el padre de familia' });
        }
    };

    // Crear un nuevo padre de familia
    export const createPadreFamilia = async (req, res) => {
        const { idDireccion, nombres, apellido_Paterno, apellido_Materno, rol, email, num_celular, fecha_de_nacimiento, contrasenia } = req.body;

        if (!idDireccion || !nombres || !apellido_Paterno || !apellido_Materno || !rol || !email || !num_celular || !fecha_de_nacimiento || !contrasenia) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }

        if (rol !== 'Padre de Familia') {
            return res.status(400).json({ error: 'El rol debe ser "Padre de Familia"' });
        }

        try {
            const personaResult = await pool.query(
                `INSERT INTO Persona (idDireccion, Nombres, Apellido_Paterno, Apellido_Materno, Rol, email, Num_Celular, Fecha_De_Nacimiento, Estado) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING idPersona`,
                [idDireccion, nombres, apellido_Paterno, apellido_Materno, rol, email, num_celular, fecha_de_nacimiento]
            );
            const idPersona = personaResult.rows[0].idpersona;

            const padreResult = await pool.query(
                `INSERT INTO Padre_De_Familia (idPersona, Contrasenia, Estado) 
                VALUES ($1, $2, true) RETURNING *`,
                [idPersona, contrasenia]
            );

            res.status(201).json(padreResult.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    };

    // Actualizar un padre de familia
    export const updatePadreFamilia = async (req, res) => {
        const { idPadre } = req.params;
        const { idDireccion, nombres, apellido_Paterno, apellido_Materno, rol, email, num_celular, fecha_de_nacimiento, contrasenia, estado } = req.body;

        if (!idDireccion || !nombres || !apellido_Paterno || !apellido_Materno || !rol || !email || !num_celular || !fecha_de_nacimiento || !contrasenia) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }

        if (rol !== 'Padre de Familia') {
            return res.status(400).json({ error: 'El rol debe ser "Padre de Familia"' });
        }

        try {
            const padreResult = await pool.query(
                `SELECT idPersona FROM Padre_De_Familia WHERE idPadre = $1`,
                [idPadre]
            );

            if (padreResult.rows.length === 0) {
                return res.status(404).json({ error: 'Padre de familia no encontrado' });
            }

            const idPersona = padreResult.rows[0].idpersona;

            const personaResult = await pool.query(
                `UPDATE Persona 
                SET idDireccion = $1, Nombres = $2, Apellido_Paterno = $3, Apellido_Materno = $4, Rol = $5, email = $6, Num_Celular = $7, Fecha_De_Nacimiento = $8, Estado = $9
                WHERE idPersona = $10 RETURNING *`,
                [idDireccion, nombres, apellido_Paterno, apellido_Materno, rol, email, num_celular, fecha_de_nacimiento, estado, idPersona]
            );

            const updatePadre = await pool.query(
                `UPDATE Padre_De_Familia 
                SET Contrasenia = $1
                WHERE idPadre = $2 RETURNING *`,
                [contrasenia, idPadre]
            );

            res.json({ persona: personaResult.rows[0], padre: updatePadre.rows[0] });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    };

    // Eliminar un padre de familia
    export const deletePadreFamilia = async (req, res) => {
        const { idPadre } = req.params;

        try {
            await pool.query('BEGIN');

            const padreResult = await pool.query('SELECT idPersona FROM Padre_De_Familia WHERE idPadre = $1', [idPadre]);

            if (padreResult.rows.length === 0) {
                await pool.query('ROLLBACK');
                return res.status(404).json({ error: 'Padre de familia no encontrado' });
            }

            const idPersona = padreResult.rows[0].idpersona;

            await pool.query('UPDATE Padre_De_Familia SET Estado = false WHERE idPadre = $1', [idPadre]);
            await pool.query('UPDATE Persona SET Estado = false WHERE idPersona = $1', [idPersona]);

            await pool.query('COMMIT');

            res.json({ message: 'Padre de familia inactivado correctamente' });
        } catch (err) {
            await pool.query('ROLLBACK');
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    };
