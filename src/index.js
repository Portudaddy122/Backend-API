import express from 'express';
import {PORT} from './config.js';
import personaRoutes from './routes/persona.routes.js';
import profesorRoutes from './routes/profesor.routes.js';
import administratorRoutes from './routes/administrator.routes.js';
import padresDeFamiliaRoutes from './routes/padres.routes.js';



const app = express();

app.use(express.json());
app.use(personaRoutes);
app.use(profesorRoutes);
app.use(administratorRoutes);
app.use(padresDeFamiliaRoutes);

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });
  



app.listen(PORT);
console.log(`Servidor corriendo el el puerto`, PORT);




