import Router from 'express';
import {createProfesor, getProfesores, getProfesorById, updateProfesor, deleteProfesor } from '../controllers/profesor.controller.js';


const router = Router();

//Obtener el listado de todas las personas en la base de datos
router.get('/obtener/profesores', getProfesores);

//Obtener los datos de la persona a traves de su id
router.get('/profesor/:idProfesor', getProfesorById);

//Crear un nuevo usuario persona
router.post('/crear/profesor', createProfesor);

//Actualizar usuario persona
router.put('/actualizar/profesor/:idProfesor', updateProfesor );

//Eliminar usuario persona
router.delete('/eliminar/profesor/:idProfesor', deleteProfesor);



export default router;