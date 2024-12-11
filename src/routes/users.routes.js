import Router from 'express';
import { activarUsuario, filterUsers, filterUsuarios, getallUserEntry, getAllUsers, listarUsuariosInactivos, obtenerCantidadUsuariosConIngresos, obtenerDatosUsuariosConIngresos, obtenerIngresos, obtenerIngresosPorRango, registrarIngreso } from '../controllers/users.controller.js';


const router = Router();

//Obtener el listado de todas las personas en la base de datos
router.get('/obtener/usuarios', getAllUsers);

router.get('/usuarios/filtrar', filterUsuarios);

// Ruta para obtener el listado de todas las personas en la base de datos
router.get('/obtener/usuarios', getallUserEntry);

// Ruta para filtrar usuarios en base a un término de búsqueda
router.get('/usuarios/filtrar', filterUsers);

router.get('/ingresos', obtenerIngresos);

router.get('/usuarios-ingresos', obtenerDatosUsuariosConIngresos);

router.post("/ingresos/rango", obtenerIngresosPorRango);

router.get('/cantidad-usuarios-ingresos', obtenerCantidadUsuariosConIngresos);

router.post('/ingresoslogin', registrarIngreso);
// Listar usuarios inactivos
router.get('/usuarios/inactivos', listarUsuariosInactivos);

// Activar usuario (cambiar estado a true)
router.put('/usuarios/activar', activarUsuario);
export default router;