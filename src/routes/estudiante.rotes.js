import Router from 'express';
import { createEstudiante, deleteEstudiante, getEstudianteById, getEstudiantes, updateEstudiante } from '../controllers/estudiante.controller.js';

const router = Router();

router.get('/obtener/estudiantes', getEstudiantes);
router.get('/obtener/estudiantes/:idEstudiante', getEstudianteById);  // Mantén la consistencia de los nombres de parámetros
router.post('/crear/estudiante', createEstudiante);
router.put('/actualizar/estudiante/:idEstudiante', updateEstudiante);
router.delete('/eliminar/estudiante/:idEstudiante', deleteEstudiante);

export default router;
