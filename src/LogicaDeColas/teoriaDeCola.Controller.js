import { pool } from "../db.js";

let ultimaHoraAcumulada = null;

export const agendarEntrevista = async (req, res) => {
  const {
    idProfesor,
    idPsicologo,
    idPadre,
    fecha,
    descripcion,
    idMotivo,
  } = req.body;

  try {

    // Validar que al menos uno de los IDs (Profesor o Psicologo) sea proporcionado, pero no ambos
    if ((!idProfesor && !idPsicologo) || (idProfesor && idPsicologo)) {
      return res.status(400).json({ error: "Debes seleccionar un profesor o un psicólogo, pero no ambos." });
    }

    // Validar que los campos requeridos no sean nulos
    if (!idPadre || !fecha || !descripcion || !idMotivo) {
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



    // Obtener el horario y estado del usuario (profesor o psicólogo)
    let idhorario, estadoUsuario;
    if (idProfesor) {
      const profesorData = await pool.query(
        `SELECT idhorario, estado FROM Profesor WHERE idprofesor = $1`,
        [idProfesor]
      );
      if (profesorData.rows.length === 0 || !profesorData.rows[0].estado) {
        return res.status(400).json({ error: "Profesor no encontrado o no está activo" });
      }
      idhorario = profesorData.rows[0].idhorario;
    } else if (idPsicologo) {
      const psicologoData = await pool.query(
        `SELECT idhorario, estado FROM Psicologo WHERE idpsicologo = $1`,
        [idPsicologo]
      );
      if (psicologoData.rows.length === 0 || !psicologoData.rows[0].estado) {
        return res.status(400).json({ error: "Psicólogo no encontrado o no está activo" });
      }
      idhorario = psicologoData.rows[0].idhorario;
    }

    // Obtener `horainicio` y `horafin` usando `idhorario`
    const horarioData = await pool.query(
      `SELECT horainicio::text, horafin::text 
       FROM horario 
       WHERE idhorario = $1 AND estado = TRUE`,
      [idhorario]
    );

    if (horarioData.rows.length === 0) {
      return res.status(400).json({ error: "No se encontró un horario para este usuario" });
    }

    const { horainicio, horafin } = horarioData.rows[0];


    // Consultar la última `horafinentrevista` para la fecha seleccionada
    let horafinentrevista;
    const ultimaEntrevistaResult = await pool.query(
      `SELECT horafinentrevista::text 
       FROM reservarentrevista 
       WHERE (idprofesor = $1 OR idpsicologo = $2) AND fecha = $3 AND estado IS NULL
       ORDER BY horafinentrevista DESC LIMIT 1`,
      [idProfesor || null, idPsicologo || null, fecha]
    );

    if (ultimaEntrevistaResult.rows.length === 0) {
      horafinentrevista = horainicio;

    } else {
      horafinentrevista = ultimaEntrevistaResult.rows[0].horafinentrevista;

    }

    // Calcular la nueva `horafinentrevista`
    let [horas, minutos] = horafinentrevista.split(":").map(Number);
    let nuevaHoraFinMinutos = horas * 60 + minutos + duracionAtencion;
    const nuevaHoraFinHoras = Math.floor(nuevaHoraFinMinutos / 60);
    const nuevaHoraFinRestantesMinutos = nuevaHoraFinMinutos % 60;
    const nuevaHorafinEntrevista = `${String(nuevaHoraFinHoras).padStart(2, "0")}:${String(nuevaHoraFinRestantesMinutos).padStart(2, "0")}:00`;

    // Validar si la nueva hora excede el horario permitido
    if (nuevaHorafinEntrevista > horafin) {
      return res.status(400).json({
        error: "No hay espacio disponible para agendar una nueva entrevista.",
        details: {
          horainicio,
          horafin,
          nuevaHorafinEntrevista,
          motivo: "La duración de atención excede el horario disponible del profesor.",
        },
      });
    }
    
    

    // Insertar la nueva entrevista en la base de datos
    const nuevaEntrevista = await pool.query(
      `INSERT INTO reservarentrevista 
        (idprofesor, idpsicologo, idpadre, fecha, descripcion, idmotivo, horafinentrevista, estado) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, NULL) 
      RETURNING horafinentrevista`,
      [idProfesor || null, idPsicologo || null, idPadre, fecha, descripcion, idMotivo, nuevaHorafinEntrevista]
    );

    ultimaHoraAcumulada = nuevaEntrevista.rows[0].horafinentrevista;
    res.status(201).json({
      success: "Entrevista agendada correctamente",
      horafinentrevista: ultimaHoraAcumulada
    });

  } catch (error) {
    console.error("Error al agendar la entrevista:", error.message);
    res.status(500).json({ error: `Error al agendar la entrevista: ${error.message}` });
  }
};


export const insertarReservaEntrevista = async (req, res) => {
  const { idProfesor, idPadre, fecha, descripcion, idMotivo } = req.body;


  try {
    if (!idProfesor || !idPadre || !fecha || !idMotivo) { 
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



    // Obtener el horario del profesor
    const horarioData = await pool.query(
      `SELECT horainicio::text, horafin::text 
       FROM horario h
       INNER JOIN profesor p ON h.idhorario = p.idhorario
       WHERE p.idprofesor = $1 AND h.estado = TRUE`,
      [idProfesor]
    );

    if (horarioData.rows.length === 0) {
      return res.status(400).json({ error: "No se encontró un horario para este profesor" });
    }

    const { horainicio, horafin } = horarioData.rows[0];


    // Consultar la última hora fin de entrevista para la fecha seleccionada
    let horafinentrevista;
    const ultimaEntrevistaResult = await pool.query(
      `SELECT horafinentrevista::text 
       FROM reservarentrevista 
       WHERE idprofesor = $1 AND fecha = $2 AND estado IS NULL
       ORDER BY horafinentrevista DESC LIMIT 1`,
      [idProfesor, fecha]
    );

    if (ultimaEntrevistaResult.rows.length === 0) {
      horafinentrevista = horainicio;

    } else {
      horafinentrevista = ultimaEntrevistaResult.rows[0].horafinentrevista;

    }

    // Calcular la nueva `horafinentrevista`
    let [horas, minutos] = horafinentrevista.split(":").map(Number);
    let nuevaHoraFinMinutos = horas * 60 + minutos + duracionAtencion;
    const nuevaHoraFinHoras = Math.floor(nuevaHoraFinMinutos / 60);
    const nuevaHoraFinRestantesMinutos = nuevaHoraFinMinutos % 60;
    const nuevaHorafinEntrevista = `${String(nuevaHoraFinHoras).padStart(2, "0")}:${String(nuevaHoraFinRestantesMinutos).padStart(2, "0")}:00`;



    // Validar si la nueva hora excede el horario permitido
    if (nuevaHorafinEntrevista > horafin) {
      return res.status(400).json({ error: "La entrevista excede el horario permitido" });
    }

    // Insertar la nueva reserva de entrevista
    const nuevaReserva = await pool.query(
      `INSERT INTO reservarentrevista 
       (idprofesor, idpadre, fecha, descripcion, idmotivo, horafinentrevista, estado)
       VALUES ($1, $2, $3, $4, $5, $6, NULL) 
       RETURNING *`,
      [idProfesor, idPadre, fecha, descripcion || '', idMotivo, nuevaHorafinEntrevista]
    );



    res.status(201).json({ message: "Reserva de entrevista creada con éxito", data: nuevaReserva.rows[0] });
  } catch (error) {
    console.error("Error al insertar la reserva de entrevista:", error);
    res.status(500).json({ error: "Error al insertar la reserva de entrevista" });
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
        END AS accion,
        -- Agregamos el campo horafinentrevista para calcular nuevaHorafinEntrevista
        re.horafinentrevista
      FROM reservarentrevista re
      JOIN padredefamilia p ON re.idpadre = p.idpadre
      WHERE re.fecha BETWEEN $1 AND $2
      ORDER BY re.fecha ASC
      `,
      [startDate, endDate]
    );

    // Procesar los resultados para incluir nuevaHorafinEntrevista
    const duracionAtencion = 25; // Puedes ajustar esto según la prioridad si es necesario

    const citasConNuevaHora = citas.rows.map((cita) => {
      // Si horafinentrevista es null, no se puede calcular la nueva hora
      if (!cita.horafinentrevista) {
        return { ...cita, nuevaHorafinEntrevista: 'No disponible' };
      }

      const [horas, minutos] = cita.horafinentrevista.split(":").map(Number);
      const nuevaHoraFinMinutos = horas * 60 + minutos + duracionAtencion;
      const nuevaHoraFinHoras = Math.floor(nuevaHoraFinMinutos / 60);
      const nuevaHoraFinRestantesMinutos = nuevaHoraFinMinutos % 60;
      const nuevaHorafinEntrevista = `${String(nuevaHoraFinHoras).padStart(2, '0')}:${String(nuevaHoraFinRestantesMinutos).padStart(2, '0')}:00`;

      return { ...cita, nuevaHorafinEntrevista };
    });

    res.status(200).json(citasConNuevaHora);
  } catch (error) {
    console.error("Error al obtener la lista de entrevistas:", error.message);
    res.status(500).json({ error: `Error al obtener la lista de entrevistas: ${error.message}` });
  }
};

export const verEntrevistasPadres = async (req, res) => {
  const { idPadre } = req.params;



  try {
    if (!idPadre) {
      return res.status(400).json({ error: "El idPadre es obligatorio" });
    }

    const entrevistas = await pool.query(`
      SELECT 
        re.idreservarentrevista AS id,
        TO_CHAR(re.fecha, 'YYYY-MM-DD') AS fecha,
        CONCAT(prof.nombres, ' ', prof.apellidopaterno, ' ', prof.apellidomaterno) AS profesor,
        m.nombre AS materia,
        TO_CHAR(re.horafinentrevista, 'HH24:MI:SS') AS horafinentrevista, -- Alias más claro
        CASE 
          WHEN re.estado IS NULL THEN 'Pendiente'
          WHEN re.estado = TRUE THEN 'Completada'
          ELSE 'No realizada'
        END AS estado
      FROM reservarentrevista re
      INNER JOIN profesor prof ON re.idprofesor = prof.idprofesor
      INNER JOIN horario h ON prof.idhorario = h.idhorario
      INNER JOIN materia m ON h.idmateria = m.idmateria
      WHERE re.idpadre = $1
      ORDER BY re.fecha ASC, re.horafinentrevista ASC;
    `, [idPadre]);



    if (entrevistas.rows.length === 0) {
      return res.status(404).json({ error: "No se encontraron entrevistas para este padre de familia" });
    }

    res.status(200).json({
      success: true,
      data: entrevistas.rows,
    });
  } catch (error) {
    console.error("Error al obtener el historial de citas:", error.message);
    res.status(500).json({ error: "Error al obtener el historial de citas" });
  }
};