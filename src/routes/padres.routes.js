import Router from 'express'
import { createPadreFamilia, deletePadreFamilia, getPadreFamiliaById, getPadresFamilia, updatePadreFamilia } from '../controllers/padres.controller.js';

const router = Router();

router.get('/obtener/padresdefamilia', getPadresFamilia); 


router.get('/obtener/padredefamilia/:idPadre', getPadreFamiliaById); 


router.post('/crear/padredefamilia', createPadreFamilia);


router.put('/actualizar/padredefamilia/:idPadre', updatePadreFamilia); 


router.delete('/eliminar/padredefamilia/:idPadre', deletePadreFamilia);

export default router

