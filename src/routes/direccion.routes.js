import Router from 'express';
import {
  getDirecciones,
  getDireccionById,
  createDireccion,
  updateDireccion,
  deleteDireccion
} from '../controllers/direccion.controller.js';

const router = Router();

// Ruta para obtener todas las direcciones activas
router.get('/obtener/direcciones', getDirecciones);

// Ruta para obtener una dirección por ID
router.get('/obtener/direccion/:iddireccion', getDireccionById);

// Ruta para crear una nueva dirección (estado por defecto: true)
router.post('/crear/direccion', createDireccion);

// Ruta para actualizar una dirección
router.put('/actualizar/direccion/:iddireccion', updateDireccion);

// Ruta para desactivar (eliminar lógicamente) una dirección
router.delete('/eliminar/direccion/:iddireccion', deleteDireccion);

export default router;
