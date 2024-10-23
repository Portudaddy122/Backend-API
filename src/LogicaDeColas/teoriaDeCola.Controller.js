import { pool } from "../db.js";


export const agendarEntrevista = async (req, res) => {
  const { idProfesor, idPsicologo, idPadre, fecha, descripcion, idMotivo } = req.body;

  try {
    
    if (idMotivo === 2) {
      return res.status(400).json({ error: "El motivo 'Temporalidad' no es válido para agendar entrevistas." });
    }

    const motivoCheck = await pool.query("SELECT * FROM Motivo WHERE idMotivo = $1 AND Estado = TRUE", [idMotivo]);
    if (motivoCheck.rows.length === 0) {
      return res.status(400).json({ error: "Motivo no válido" });
    }

    const motivo = motivoCheck.rows[0];
    const idPrioridad = motivo.idprioridad;

    const nuevaEntrevista = await pool.query(
      `INSERT INTO ReservarEntrevista (idProfesor, idPsicologo, idPadre, Fecha, Descripcion, idMotivo) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [idProfesor, idPsicologo, idPadre, fecha, descripcion, idMotivo]
    );


    const tiempoEsperaEstimado = '10 minutos';
    const nuevaCola = await pool.query(
      `INSERT INTO ColaEspera (IdReservarEntrevista, TiempoEsperaEstimado) 
       VALUES ($1, $2) RETURNING *`,
      [nuevaEntrevista.rows[0].idreservarentrevista, tiempoEsperaEstimado]
    );

    res.status(201).json({ message: "Entrevista agendada exitosamente y añadida a la cola", cita: nuevaCola.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al agendar la entrevista" });
  }
};

export const obtenerColaEsperaPrioridadFIFO = async (req, res) => {
    try {
    
      const citas = await pool.query(
        `SELECT ce.*, re.Fecha, re.Descripcion, m.nombreMotivo, p.tipoPrioridad, 
                prof.Nombres AS profesorNombre, prof.ApellidoPaterno, prof.ApellidoMaterno, 
                mat.Nombre AS nombreMateria, h.horaInicio, h.horaFin
         FROM ColaEspera ce
         JOIN ReservarEntrevista re ON ce.IdReservarEntrevista = re.IdReservarEntrevista
         JOIN Motivo m ON re.idMotivo = m.idMotivo
         JOIN Prioridad p ON m.idPrioridad = p.idPrioridad
         JOIN Profesor prof ON re.idProfesor = prof.idProfesor
         JOIN Profesor_Dicta_Materia pdm ON prof.idProfesor = pdm.idProfesor
         JOIN Materia mat ON pdm.idMateria = mat.idMateria
         JOIN Horario h ON h.idMateria = mat.idMateria
         WHERE ce.Estado = TRUE AND m.idMotivo != 2  
         ORDER BY p.idPrioridad ASC, re.Fecha ASC`
      );
  
      res.json(citas.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error al obtener la cola de espera" });
    }
  };
  