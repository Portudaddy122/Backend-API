import Router from 'express';
import {createPersona, deletePersona, getPersona, getPersonaId, updatePersona } from '../controllers/person.controlles.js';

const router = Router();

//Obtener el listado de todas las personas en la base de datos
router.get('/obtener/persona', getPersona);

//Obtener los datos de la persona a traves de su id
router.get('/persona/:idPersona', getPersonaId);

//Crear un nuevo usuario persona
router.post('/crear/persona', createPersona);

//Actualizar usuario persona
router.put('/actualizar/persona/:id', updatePersona);

//Eliminar usuario persona
router.delete('/eliminar/persona/:id', deletePersona);


export default router;

