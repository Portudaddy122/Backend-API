import Router from 'express';
import { enviarCorreo } from '../controllers/correo.controller.js';

const router = Router();

router.post('/enviarCorreo', enviarCorreo);

export default router;
