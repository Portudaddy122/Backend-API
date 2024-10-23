import Router from 'express';
import { createCurso, getCursoById, getCursos } from '../controllers/curso.controller.js';

const router = Router();


router.get('/obtener/cursos', getCursos)

router.get('/obtener/cursosById/:idCurso', getCursoById)

router.post('/crear/cursos', createCurso)

export default router;
