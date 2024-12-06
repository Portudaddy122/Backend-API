import { Router } from "express";
import {
  getActiveUsersCount,
  getActiveProfessorsCount,
  getWeeklyInterviews,
  getInterviewStatusCounts,
  getMostRequestedSubject,
  getMostRequestedProfessor
} from "../controllers/dashboard.controller.js";

const router = Router();

router.get("/cantidad/usuarios", getActiveUsersCount);
router.get("/cantidad/profesores", getActiveProfessorsCount);
router.get("/entrevistas/semanales", getWeeklyInterviews);



router.get("/entrevistas/estado", getInterviewStatusCounts);
router.get("/materia/masDemandada", getMostRequestedSubject);
router.get("/profesor/mas-demandado", getMostRequestedProfessor);

export default router;
