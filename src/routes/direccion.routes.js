import Router from 'express'
import { getDirecciones } from '../controllers/direccion.controller.js';


const router = Router();


// Ruta para obtener todas las direcciones
router.get('/obtener/direcciones', getDirecciones);

export default router

