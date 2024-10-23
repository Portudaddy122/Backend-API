import Router from 'express';
import { filterUsuarios, getAllUsers } from '../controllers/users.controller.js';


const router = Router();

//Obtener el listado de todas las personas en la base de datos
router.get('/obtener/usuarios', getAllUsers);

router.get('/usuarios/filtrar', filterUsuarios);


export default router;