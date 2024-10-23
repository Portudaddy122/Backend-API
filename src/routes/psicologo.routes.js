import Router from 'express';
import { createPsicologo, deletePsicologo, getPsicologoById, getPsicologos, updatePsicologo } from '../controllers/psicologo.controller.js';

const router = Router();

router.get('/obtener/psicologos', getPsicologos);
router.get('/obtener/psicologosById/:idPsicologo', getPsicologoById);  // Asegúrate que el parámetro ID sea coherente
router.post('/crear/psicologo', createPsicologo);
router.put('/actualizar/psicologo/:idPsicologo', updatePsicologo);
router.delete('/eliminar/psicologo/:idPsicologo', deletePsicologo);

export default router;
