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


// Tarea a las 18:00 todos los días
schedule.scheduleJob('0 18 * * *', async () => {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      console.log(`Ejecutando tarea programada para la fecha: ${hoy}`);
  
      // Obtener los datos de las entrevistas pendientes para la fecha actual
      const entrevistas = await pool.query(
        `SELECT re.idpadre, re.fecha, re.descripcion, m.nombremotivo, 
                h.horainicio::text AS horainicio, h.horafin::text AS horafin, 
                CASE 
                  WHEN p.idprofesor IS NOT NULL THEN CONCAT(pr.nombres, ' ', pr.apellidopaterno, ' ', pr.apellidomaterno)
                  ELSE CONCAT(ps.nombres, ' ', ps.apellidopaterno, ' ', ps.apellidomaterno)
                END AS profesional
         FROM reservarentrevista re
         JOIN motivo m ON re.idmotivo = m.idmotivo
         LEFT JOIN profesor p ON re.idprofesor = p.idprofesor
         LEFT JOIN psicologo ps ON re.idpsicologo = ps.idpsicologo
         LEFT JOIN horario h ON (h.idhorario = p.idhorario OR h.idhorario = ps.idhorario)
         LEFT JOIN profesor pr ON re.idprofesor = pr.idprofesor
         WHERE re.fecha = $1 AND re.estado IS NULL`,
        [hoy]
      );
  
     
      if (entrevistas.rows.length === 0) {
        console.log('No hay entrevistas pendientes para enviar correos.');
        return;
      }
  
      
      for (const entrevista of entrevistas.rows) {
        try {
          await enviarCorreo({
            idPadre: entrevista.idpadre,
            motivo: entrevista.nombremotivo,
            fecha: entrevista.fecha,
            horario: entrevista.horainicio,
            horafin: entrevista.horafin,
            descripcion: entrevista.descripcion,
            profesional: entrevista.profesional,
          });
          console.log(`Correo enviado a ID Padre: ${entrevista.idpadre}`);
        } catch (error) {
          console.error(`Error al enviar correo a ID Padre: ${entrevista.idpadre}`, error);
        }
      }
  
      console.log('Tarea de envío de correos completada.');
    } catch (error) {
      console.error('Error al ejecutar la tarea programada:', error);
    }
  });

app.listen(PORT);
console.log(`Servidor corriendo en el puerto`, PORT);
