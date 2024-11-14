import { pool } from "../db.js";

let ultimaHoraAcumulada = null; // Variable global para almacenar la última hora acumulada

export const agendarEntrevista = async (req, res) => {
  const {
    idProfesor,
    idPsicologo,
    idPadre,
    fecha,
    descripcion,
    idMotivo,
    idMateria,
  } = req.body;

  try {
    console.log("=== Iniciando agendamiento de entrevista ===");
    console.log("Datos recibidos:", req.body);

    // Validar campos requeridos
    if (!idProfesor || !idPsicologo || !idPadre || !fecha || !descripcion || !idMotivo || !idMateria) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    // Verificar motivo y obtener su prioridad
    const motivoCheck = await pool.query(
      `SELECT m.nombremotivo, p.tipoprioridad 
       FROM motivo m 
       JOIN prioridad p ON m.idprioridad = p.idprioridad 
       WHERE m.idmotivo = $1 AND m.estado = TRUE`,
      [idMotivo]
    );

    if (motivoCheck.rows.length === 0) {
      return res.status(400).json({ error: "Motivo no válido" });
    }

    const { tipoprioridad } = motivoCheck.rows[0];
    const duracionAtencion = tipoprioridad.toLowerCase() === 'alta' ? 25 :
                             tipoprioridad.toLowerCase() === 'media' ? 20 : 10;

    console.log("Duración de atención según prioridad:", duracionAtencion);

    // Obtener el horario del profesor
    const horarioProfesor = await pool.query(
      `SELECT horainicio::text, horafin::text 
       FROM horario 
       WHERE idmateria = $1 AND estado = TRUE`,
      [idMateria]
    );

    if (horarioProfesor.rows.length === 0) {
      return res.status(400).json({ error: "No se encontró un horario para esta materia" });
    }

    const { horainicio, horafin } = horarioProfesor.rows[0];
    console.log(`Horario del profesor: Inicio - ${horainicio}, Fin - ${horafin}`);

    // Consultar última horafinentrevista para la fecha seleccionada
    let horafinentrevista;
    const ultimaEntrevistaResult = await pool.query(
      `SELECT horafinentrevista::text 
       FROM reservarentrevista 
       WHERE idprofesor = $1 AND fecha = $2 AND estado IS NULL
       ORDER BY horafinentrevista DESC LIMIT 1`,
      [idProfesor, fecha]
    );

    if (ultimaEntrevistaResult.rows.length === 0) {
      // No hay entrevistas previas para la fecha, usar horainicio como base
      horafinentrevista = horainicio;
      console.log(`Primera entrevista del día. Usando horainicio: ${horainicio}`);
    } else {
      horafinentrevista = ultimaEntrevistaResult.rows[0].horafinentrevista;
      console.log(`Última horafinentrevista usada como base: ${horafinentrevista}`);
    }

    // Validar que horafinentrevista no sea null antes de usar split
    if (!horafinentrevista) {
      horafinentrevista = horainicio;
      console.log(`No se encontró horafinentrevista previa, usando horainicio: ${horainicio}`);
    }

    let [horas, minutos] = horafinentrevista.split(":").map(Number);
    let nuevaHoraFinMinutos = horas * 60 + minutos + duracionAtencion;
    const nuevaHoraFinHoras = Math.floor(nuevaHoraFinMinutos / 60);
    const nuevaHoraFinRestantesMinutos = nuevaHoraFinMinutos % 60;
    const nuevaHorafinEntrevista = `${String(nuevaHoraFinHoras).padStart(2, "0")}:${String(nuevaHoraFinRestantesMinutos).padStart(2, "0")}:00`;

    console.log(`Nueva horafinentrevista calculada: ${nuevaHorafinEntrevista}`);

    // Verificar que la nueva hora de fin no exceda el horario permitido
    if (nuevaHorafinEntrevista > horafin) {
      return res.status(400).json({ error: "La entrevista excede el horario permitido" });
    }

    const nuevaEntrevista = await pool.query(
      `INSERT INTO reservarentrevista 
        (idprofesor, idpsicologo, idpadre, fecha, descripcion, idmotivo, horafinentrevista, estado) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, NULL) 
      RETURNING horafinentrevista`,
      [idProfesor, idPsicologo, idPadre, fecha, descripcion, idMotivo, nuevaHorafinEntrevista]
    );

    ultimaHoraAcumulada = nuevaEntrevista.rows[0].horafinentrevista;
    console.log(`Entrevista agendada correctamente con horafinentrevista acumulada: ${ultimaHoraAcumulada}`);

    res.status(201).json({
      success: "Entrevista agendada correctamente",
      horafinentrevista: ultimaHoraAcumulada
    });
  } catch (error) {
    console.error("Error al agendar la entrevista:", error.message);
    res.status(500).json({ error: `Error al agendar la entrevista: ${error.message}` });
  }
};



export const obtenerColaEsperaPrioridadFIFO = async (req, res) => {
  try {
    const entrevistas = await pool.query(`
      SELECT 
        re.idreservarentrevista, 
        TO_CHAR(re.fecha, 'YYYY-MM-DD') AS fecha, 
        re.descripcion,
        TO_CHAR(re.horafinentrevista, 'HH24:MI:SS') AS horafinentrevista,
        -- Usar la última horafinentrevista como horainicio
        LAG(TO_CHAR(re.horafinentrevista, 'HH24:MI:SS')) OVER (
          PARTITION BY re.idprofesor, re.fecha ORDER BY re.horafinentrevista
        ) AS horainicio,
        -- Duración de atención basada en la prioridad del motivo
        CASE 
          WHEN p.tipoprioridad = 'Alta' THEN 25
          WHEN p.tipoprioridad = 'Media' THEN 20
          ELSE 10
        END AS duracionatencion,
        m.nombremotivo, 
        p.tipoprioridad,
        COALESCE(prof.nombres, '') || ' ' || COALESCE(prof.apellidopaterno, '') AS nombreprofesor,
        prof.email AS emailprofesor,
        prof.numcelular AS telefonoprofesor,
        COALESCE(psico.nombres, '') || ' ' || COALESCE(psico.apellidopaterno, '') AS nombrepsicologo,
        psico.email AS emailpsicologo,
        psico.numcelular AS telefonopsicologo,
        COALESCE(padre.nombres, '') || ' ' || COALESCE(padre.apellidopaterno, '') AS nombrepadre,
        padre.email AS emailpadre,
        padre.numcelular AS telefonopadre,
        CASE 
          WHEN re.estado IS NULL THEN 'Pendiente'
          WHEN re.estado = TRUE THEN 'Completado'
          ELSE 'Cancelado'
        END AS estado_texto
      FROM reservarentrevista re
      JOIN motivo m ON re.idmotivo = m.idmotivo
      JOIN prioridad p ON m.idprioridad = p.idprioridad
      LEFT JOIN profesor prof ON re.idprofesor = prof.idprofesor
      LEFT JOIN psicologo psico ON re.idpsicologo = psico.idpsicologo
      LEFT JOIN padredefamilia padre ON re.idpadre = padre.idpadre
      WHERE re.estado IS NULL
      ORDER BY p.tipoprioridad DESC, re.fecha ASC, re.horafinentrevista ASC
    `);

    res.status(200).json(entrevistas.rows);
  } catch (error) {
    console.error("Error al obtener las entrevistas agendadas:", error.message);
    res.status(500).json({ error: error.message });
  }
};





export const obtenerListaEntrevista = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const citas = await pool.query(
      `
      SELECT 
        re.idreservarentrevista,
        TO_CHAR(re.fecha, 'YYYY-MM-DD') AS fecha,
        re.descripcion,
        TO_CHAR(re.horafinentrevista, 'HH24:MI:SS') AS horainicio,
        p.nombres,
        p.apellidopaterno,
        p.apellidomaterno,
        p.email,
        re.estado,
        CASE 
          WHEN re.estado = true THEN 'Completado'
          WHEN re.estado = false THEN 'Cancelado'
          ELSE 'Pendiente'
        END AS accion
      FROM reservarentrevista re
      JOIN padredefamilia p ON re.idpadre = p.idpadre
      WHERE TO_CHAR(re.fecha, 'YYYY-MM-DD') = $1
      ORDER BY re.fecha ASC
      `,
      [today]
    );

    // Agregar verificación para la hora estimada
    const citasConHoraEstimada = citas.rows.map((cita) => {
      if (cita.horainicio) {
        const [horas, minutos, segundos] = cita.horainicio.split(':').map(Number);
        
        // Calcular nueva hora si horainicio es válido
        const duracionAtencion = 25; // Puedes ajustar esto según tus prioridades
        const nuevaHoraFinMinutos = horas * 60 + minutos + duracionAtencion;
        const nuevaHoraFinHoras = Math.floor(nuevaHoraFinMinutos / 60);
        const nuevaHoraFinRestantesMinutos = nuevaHoraFinMinutos % 60;
        const nuevaHorafinEntrevista = `${String(nuevaHoraFinHoras).padStart(2, '0')}:${String(nuevaHoraFinRestantesMinutos).padStart(2, '0')}:00`;

        return { ...cita, nuevaHorafinEntrevista };
      } else {
        // Si horainicio es null, devolver sin cambiar
        return { ...cita, nuevaHorafinEntrevista: null };
      }
    });

    res.status(200).json(citasConHoraEstimada);
  } catch (error) {
    console.error("Error al obtener la lista de entrevistas:", error.message);
    res.status(500).json({ error: `Error al obtener la lista de entrevistas: ${error.message}` });
  }
};


export const eliminarEntrevista = async (req, res) => {
  const { idReservarEntrevista } = req.params;
  const { nuevoEstado } = req.body;

  try {
    // Convertir el estado recibido a booleano directamente
    const estadoBooleano = nuevoEstado === 'completado';

    const resultado = await pool.query(
      `UPDATE reservarentrevista 
       SET estado = $1 
       WHERE idreservarentrevista = $2 
       RETURNING *`,
      [estadoBooleano, idReservarEntrevista]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Entrevista no encontrada" });
    }

    res.status(200).json({
      message: `Estado de la entrevista actualizado a ${estadoBooleano ? 'completado' : 'cancelado'}`,
      entrevista: resultado.rows[0]
    });
  } catch (error) {
    console.error("Error al cambiar el estado de la entrevista:", error.message);
    res.status(500).json({ error: "Error al cambiar el estado de la entrevista" });
  }
};

  export const obtenerListaEntrevistaPorRango = async (req, res) => {
    const { startDate, endDate } = req.body;
    try {
      const citas = await pool.query(
        `
        SELECT 
          re.idreservarentrevista,
          TO_CHAR(re.fecha, 'YYYY-MM-DD') AS fecha,
          re.descripcion,
          TO_CHAR(re.horafinentrevista, 'HH24:MI:SS') AS horainicio,
          p.nombres,
          p.apellidopaterno,
          p.apellidomaterno,
          p.email,
          re.estado,
          CASE 
            WHEN re.estado = true THEN 'Completado'
            WHEN re.estado = false THEN 'Cancelado'
            ELSE 'Pendiente'
          END AS accion
        FROM reservarentrevista re
        JOIN padredefamilia p ON re.idpadre = p.idpadre
        WHERE re.fecha BETWEEN $1 AND $2
        ORDER BY re.fecha ASC
        `,
        [startDate, endDate]
      );
  
      res.status(200).json(citas.rows);
    } catch (error) {
      console.error("Error al obtener la lista de entrevistas:", error.message);
      res.status(500).json({ error: `Error al obtener la lista de entrevistas: ${error.message}` });
    }
  };
  