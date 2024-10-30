import { Router } from 'express';
import { getMateria, getMateriaById } from '../controllers/materia.controller.js';

const router = Router();

// Asegúrate de que esta ruta está bien definida
router.get('/obtener/materia', getMateria);

router.get('/obtener/materiaById/:idMateria', getMateriaById );
export default router;


