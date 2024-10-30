import Router from 'express';
import { createHorario, deleteHorario, getHorarioById, getHorarios, updateHorario } from '../controllers/horario.controller.js';

const router = Router();

router.get('/obtener/horarios', getHorarios);
router.get('/obtener/horario/:idHorario', getHorarioById);  // Mantén la consistencia de los nombres de parámetros
router.post('/crear/horario', createHorario);
router.put('/actualizar/horario/:idHorario', updateHorario);
router.delete('/eliminar/horario/:idHorario', deleteHorario);

export default router;getHorarios