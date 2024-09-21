import express from 'express';
import {PORT} from './config.js';
import personaRoutes from './routes/persona.routes.js';
import profesorRoutes from './routes/profesor.routes.js';




const app = express();

app.use(express.json());
app.use(personaRoutes);
app.use(profesorRoutes);



app.listen(PORT);
console.log(`Servidor corriendo el el puerto`, PORT);




