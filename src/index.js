import express from 'express';
import {PORT} from './config.js';
import personaRoutes from './routes/persona.routes.js';
import profesorRoutes from './routes/profesor.routes.js';
import administratorRoutes from './routes/administrator.routes.js';
import padresDeFamiliaRoutes from './routes/padres.routes.js';
import cors from 'cors';
import Direccion from './routes/direccion.routes.js';



const app = express();

app.use(cors())
app.use(express.json());
app.use(personaRoutes);
app.use(profesorRoutes);
app.use(administratorRoutes);
app.use(padresDeFamiliaRoutes);
app.use(Direccion);




app.listen(PORT);
console.log(`Servidor corriendo el el puerto`, PORT);




