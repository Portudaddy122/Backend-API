import { pool } from "../db.js";

// Función para agendar una entrevista
export const agendarEntrevista = async (req, res) => {
  const { idProfesor, idPsicologo, idPadre, fecha, descripcion, idMotivo } = req.body;

  try {
    // Verificar si el motivo es 'Temporalidad' y no permitir agendarlo
    const motivoTemporalidadId = 2; // Asume que el id para 'Temporalidad' es 2
    if (idMotivo === motivoTemporalidadId) {
      return res.status(400).json({ error: "El motivo 'Temporalidad' no es válido para agendar entrevistas." });
    }

    // Verificar que el motivo es válido y está activo
    const motivoCheck = await pool.query("SELECT * FROM motivo WHERE idmotivo = $1 AND estado = TRUE", [idMotivo]);
    if (motivoCheck.rows.length === 0) {
      return res.status(400).json({ error: "Motivo no válido" });
    }

    const motivo = motivoCheck.rows[0];
    const idPrioridad = motivo.idprioridad;

    // Obtener el tiempo de atención basado en la prioridad
    const tiempoAtencionResult = await pool.query(
      "SELECT duracionatencion FROM tiempoatencion WHERE idprofesor = $1 AND estado = TRUE LIMIT 1",
      [idPrioridad]
    );

    if (tiempoAtencionResult.rows.length === 0) {
      return res.status(400).json({ error: "No se encontró tiempo de atención para la prioridad especificada" });
    }

    const duracionAtencion = tiempoAtencionResult.rows[0].duracionatencion;

    // Crear una nueva entrevista
    const nuevaEntrevista = await pool.query(
      `INSERT INTO reservarentrevista (idprofesor, idpsicologo, idpadre, fecha, descripcion, idmotivo) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [idProfesor, idPsicologo, idPadre, fecha, descripcion, idMotivo]
    );

    // Insertar en la cola de espera con el tiempo de atención correspondiente
    const nuevaCola = await pool.query(
      `INSERT INTO ColaEspera (idreservarentrevista, tiempoesperaestimado) 
       VALUES ($1, $2) RETURNING *`,
      [nuevaEntrevista.rows[0].idreservarentrevista, duracionAtencion]
    );

    res.status(201).json({ message: "Entrevista agendada exitosamente y añadida a la cola", cita: nuevaCola.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al agendar la entrevista" });
  }
};

export const obtenerColaEsperaPrioridadFIFO = async (req, res) => {
  try {
    const motivoTemporalidadId = 2; // Define el motivo de Temporalidad
    const citas = await pool.query(
      `SELECT ce.*, re.fecha, re.descripcion, m.nombremotivo, p.tipoprioridad, 
              prof.nombres AS profesorNombre, prof.apellidopaterno, prof.apellidomaterno, 
              mat.nombre AS nombreMateria, h.horainicio, h.horafin
       FROM ColaEspera ce
       JOIN reservarentrevista re ON ce.idreservarentrevista = re.idreservarentrevista
       JOIN motivo m ON re.idmotivo = m.idmotivo
       JOIN prioridad p ON m.idprioridad = p.idprioridad
       JOIN profesor prof ON re.idprofesor = prof.idprofesor
       JOIN profesor_dicta_materia pdm ON prof.idprofesor = pdm.idprofesor
       JOIN materia mat ON pdm.idmateria = mat.idmateria
       JOIN horario h ON h.idmateria = mat.idmateria
       WHERE ce.estado = TRUE AND m.idmotivo != $1  
       ORDER BY p.idprioridad ASC, re.fecha ASC`,
      [motivoTemporalidadId] // Excluir el motivo de 'Temporalidad' en la consulta
    );

    res.json(citas.rows);
  } catch (error) {
    console.error("Error detallado:", error); // Esto imprime el mensaje de error completo en la consola
    res.status(500).json({ error: "Error al obtener la cola de espera" });
  }
};


// Función para obtener la lista completa de entrevistas
export const obtenerListaEntrevista = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT *
      FROM reservarentrevista
      ORDER BY idcolaespera ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener las entrevistas" });
  }
};

// Función para eliminar registros con valores nulos en cualquier columna
export const eliminarEntrevistasConValoresNulos = async (req, res) => {
  try {
    const result = await pool.query(`
      DELETE FROM reservarentrevista
      WHERE idprofesor IS NULL
         OR idpsicologo IS NULL
         OR idpadre IS NULL
         OR fecha IS NULL
         OR descripcion IS NULL
         OR estado IS NULL
         OR idmotivo IS NULL
    `);

    res.status(200).json({ message: "Registros con valores nulos eliminados", rowsAffected: result.rowCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar registros con valores nulos" });
  }
};
