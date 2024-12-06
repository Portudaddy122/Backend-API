import express from "express";
import { activarActaReunion, actualizarActaReunion, crearActaReunion, eliminarActaReunion, getActasByEstudiante, obtenerActaReunionPorId, obtenerActasInactivas, obtenerActasReunion } from "../controllers/actas.controller.js";

const router = express.Router();

// Ruta para crear una nueva acta de reunión
router.get("/obtener/actareunion", obtenerActasReunion);


router.get("/obtener/actareunion/:idActa", obtenerActaReunionPorId);

router.get("/actas/inactivas", obtenerActasInactivas);

router.post("/crear/actareunion", crearActaReunion);


router.put("/actualizar/actareunion/:idActa", actualizarActaReunion);


router.put("/eliminar/actareunion/:idActa", eliminarActaReunion);


router.get("/actas/estudiante/:idestudiante", getActasByEstudiante);

router.put("/activar/actareunion/:idActa", activarActaReunion);


export default router;
