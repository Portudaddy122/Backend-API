import Router from 'express';
import { agendarEntrevista, eliminarEntrevista, insertarReservaEntrevista, obtenerColaEsperaPrioridadFIFO, obtenerListaEntrevista, obtenerListaEntrevistaPorRango, verEntrevistasPadres } from '../../LogicaDeColas/teoriaDeCola.Controller.js';

const router = Router();

// Ruta para agendar una entrevista y añadirla a la cola
router.post('/agendarEntrevista', agendarEntrevista);

// Ruta para obtener la cola de espera, ordenada por prioridad y FIFO
router.get('/colaEspera', obtenerColaEsperaPrioridadFIFO);

router.get('/listaEntrevistas', obtenerListaEntrevista);

router.get('/verEntrevistasPadres/:idPadre', verEntrevistasPadres);

//borrado logico
router.put('/eliminarEntrevista/:idReservarEntrevista', eliminarEntrevista);

//Entrevista por rango 
router.post('/obtener/entrevistas/rango', obtenerListaEntrevistaPorRango);

router.post('/crear/reservarentrevista', insertarReservaEntrevista);




export default router;
