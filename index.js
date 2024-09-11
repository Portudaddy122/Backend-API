import pg from 'pg';
import express from 'express';

const { Client } = pg;
const app = express();
app.use(express.json()); // Para procesar JSON en los requests

const client = new Client({
    user: 'postgres',
    password: 'pasword',
    host: 'localhost',
    port: 5432,
    database: 'DBProyectoDeGrado',
});

// Conectarse a la base de datos al iniciar el servidor
client.connect().then(() => {
    console.log("Conexión a la base de datos exitosa");
}).catch(err => console.error("Error en la conexión a la base de datos", err));


app.listen(4000, () => {
    console.log("Servidor corriendo en el puerto 4000");
});



//PERSONAS

// 1. Obtener todas las persona
app.get('/obtener/personas', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM Persona');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/crear/personas', async (req, res) => {
    const { id_direccion, nombres, primer_apellido, segundo_apellido, rol, correo_electronico, num_celular, Fecha_De_Nacimiento } = req.body;
    try {
        const result = await client.query(
            `INSERT INTO Persona (id_direccion, nombres, primer_apellido, segundo_apellido, rol, correo_electronico, num_celular, Fecha_De_Nacimiento) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [id_direccion, nombres, primer_apellido, segundo_apellido, rol, correo_electronico, num_celular, Fecha_De_Nacimiento]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Actualizar una persona por ID
app.put('/actualizar/personas/:id', async (req, res) => {
    const { id } = req.params;
    const { id_direccion, nombres, primer_apellido, segundo_apellido, rol, correo_electronico, num_celular, Fecha_De_Nacimiento } = req.body;
    try {
        const result = await client.query(
            `UPDATE Persona 
            SET id_direccion = $1, nombres = $2, primer_apellido = $3, segundo_apellido = $4, rol = $5, correo_electronico = $6, num_celular = $7, Fecha_De_Nacimiento = $8 
            WHERE id_persona = $9 RETURNING *`,
            [id_direccion, nombres, primer_apellido, segundo_apellido, rol, correo_electronico, num_celular, Fecha_De_Nacimiento, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Persona no encontrada' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Eliminar una persona por ID
app.delete('/eliminar/personas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await client.query('DELETE FROM Persona WHERE id_persona = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Persona no encontrada' });
        }
        res.json({ message: 'Persona eliminada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//PROFESORES

// Obtener todas las personas con el rol de "profesor"
app.get('/obtener/profesores', async (req, res) => {
    try {
        const selectQuery = `
            SELECT * FROM Persona WHERE Rol = 'Profesor';
            `;
        const result = await client.query(selectQuery);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las personas con el rol de profesor' });
    }
});

//CREAR PROFESORES
app.post('/crear/profesor', async (req, res) => {
    const { id_persona, Contrasenia } = req.body;

    if (!id_persona || !Contrasenia) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    try {
        const query = `
            INSERT INTO Persona (id_profesor, Contrasenia)
            VALUES ($1, $2)
            RETURNING *;
        `;
        const values = [id_persona, Contrasenia];
        const result = await client.query(query, values);
        res.status(201).json(result.rows[0]); // Devolvemos el profesor creado
    } catch (error) {
        console.error("Error al crear el profesor", error);
        res.status(500).json({ error: "Error al crear el profesor" });
    }
});


// Actualizar un profesor por id
app.put('/actualizar/profesor/:id', async (req, res) => {
    const { id } = req.params;  // ID del profesor (ID_Profesor)
    const { 
      Nombres, 
      Primer_Apellido, 
      Segundo_Apellido, 
      Correo_Electronico, 
      Num_Celular, 
      Fecha_De_Nacimiento, 
      Contrasenia 
    } = req.body;  // Datos enviados en el cuerpo de la solicitud
  
    try {
      // Iniciar transacción para asegurar que ambas consultas se ejecuten correctamente
      await pool.query('BEGIN');
  
      // Consulta para actualizar los datos de la tabla Persona
      const updatePersonaQuery = `
        UPDATE Persona
        SET Nombres = $1, Primer_Apellido = $2, Segundo_Apellido = $3, Correo_Electronico = $4, 
            Num_Celular = $5, Fecha_De_Nacimiento = $6
        WHERE ID_Persona = (
          SELECT ID_Persona FROM Profesor WHERE ID_Profesor = $7
        );
      `;
      await pool.query(updatePersonaQuery, [Nombres, Primer_Apellido, Segundo_Apellido, Correo_Electronico, Num_Celular, Fecha_De_Nacimiento, id]);
  
      // Consulta para actualizar la contraseña en la tabla Profesor
      const updateProfesorQuery = `
        UPDATE Profesor
        SET Contrasenia = $1
        WHERE ID_Profesor = $2;
      `;
      await pool.query(updateProfesorQuery, [Contrasenia, id]);
  
      // Si ambas consultas son exitosas, hacemos el commit
      await pool.query('COMMIT');
  
      res.status(200).send('Profesor actualizado correctamente');
    } catch (err) {
      // Si ocurre algún error, revertimos la transacción
      await pool.query('ROLLBACK');
      console.error('Error al actualizar el profesor:', err);
      res.status(500).send('Error al actualizar el profesor');
    }
  });
  
//ESTUDIANTE

//CITAS
