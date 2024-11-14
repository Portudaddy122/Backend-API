import Router from 'express';
import { exportExcel, exportToPDF, exportWord } from '../controllers/document.controller.js';

const router = Router();

// Ruta para exportar a Excel
router.get('/export/excel', exportExcel);

// Ruta para exportar a PDF
router.get('/export/pdf', exportToPDF);

// Ruta para exportar a Word
router.get('/export/word', exportWord);

export default router;
