import express from 'express';
import { PORT } from './config.js';
import profesorRoutes from './routes/profesor.routes.js';
import administratorRoutes from './routes/administrator.routes.js';
import padresDeFamiliaRoutes from './routes/padres.routes.js';
import cors from 'cors';
import Direccion from './routes/direccion.routes.js';
import AllUsers from './routes/users.routes.js';
import estudiantesRoutes from './routes/estudiante.rotes.js';
import PsicologoRoutes from './routes/psicologo.routes.js';
import colasRoutes from './routes/Colas/colas.routes.js';
import cursosRoutes from './routes/curso.routes.js';
import loginRoutes from './routes/login.routes.js';
import motivosRoutes from './routes/motivo.routes.js';
import horarioRoutes from './routes/horario.routes.js';
import materiaRoutes from './routes/materia.routes.js';
import correoRoutes from './routes/correo.routes.js'
import documentRoutes from './routes/document.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import actasRoutes from './routes/actas.routes.js'
import dotenv from 'dotenv';
import schedule from 'node-schedule';
import { enviarCorreo } from './controllers/correo.controller.js';



dotenv.config(); // Cargar las variables de entorno

// Asegúrate de que JWT_SECRET esté cargado correctamente
console.log("JWT_SECRET:", process.env.JWT_SECRET);

const app = express();

app.use(cors());
app.use(express.json());
app.use(profesorRoutes);
app.use(administratorRoutes);
app.use(padresDeFamiliaRoutes);
app.use(Direccion);
app.use(AllUsers);
app.use(estudiantesRoutes);
app.use(PsicologoRoutes);
app.use(colasRoutes);
app.use(cursosRoutes);
app.use(loginRoutes);
app.use(motivosRoutes);
app.use(horarioRoutes);
app.use(materiaRoutes);
app.use(correoRoutes);
app.use(documentRoutes);
app.use(dashboardRoutes);
app.use(actasRoutes);



// Programar la tarea a las 18:00 todos los días
schedule.scheduleJob('0 18 * * *', async () => {
    const hoy = new Date().toISOString().split('T')[0];
    console.log(`Ejecutando tarea programada para la fecha: ${hoy}`);
    
    // Obtener los padres que tienen citas para hoy
    const padres = await pool.query(
      `SELECT idpadre FROM reservarentrevista WHERE fecha = $1 AND estado IS NULL`,
      [hoy]
    );
  
    for (let padre of padres.rows) {
      // Enviar el correo a cada uno
      await enviarCorreo(padre.idpadre, hoy);
    }
  });

app.listen(PORT);
console.log(`Servidor corriendo en el puerto`, PORT);
