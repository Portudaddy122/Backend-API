import { Router } from 'express';
import { loginUser } from '../controllers/login.controller.js';

const router = Router();

// Asegúrate de que esta ruta está bien definida
router.post('/login', loginUser);

export default router;
