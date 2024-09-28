import Router from 'express';
import { createAdministrador, deleteAdministrador, getAdministrador, getAdministradorById, updateAdministrador } from '../controllers/administrator.controller.js';

const router = Router();


//Obtener el listado de todas las personas en la base de datos
router.get('/obtener/administradores', getAdministrador);

router.get('/obtener/administrador/:idAdministrador', getAdministradorById);

router.post('/crear/administrador', createAdministrador);

router.put('/actualizar/administrador/:idAdministrador', updateAdministrador);

router.delete('/eliminar/administrador/:idAdministrador', deleteAdministrador);


export default router;
