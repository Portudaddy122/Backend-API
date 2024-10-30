import Router from 'express';
import { agendarEntrevista, obtenerColaEsperaPrioridadFIFO, obtenerListaEntrevista } from '../../LogicaDeColas/teoriaDeCola.Controller.js';

const router = Router();

// Ruta para agendar una entrevista y añadirla a la cola
router.post('/agendarEntrevista', agendarEntrevista);

// Ruta para obtener la cola de espera, ordenada por prioridad y FIFO
router.get('/colaEspera', obtenerColaEsperaPrioridadFIFO);

router.get('/listaEntrevistas', obtenerListaEntrevista);


export default router;
