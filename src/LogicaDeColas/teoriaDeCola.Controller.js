import { pool } from "../db.js";
import crypto from 'crypto';
import nodemailer from 'nodemailer';


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
    console.log("Datos recibidos desde el frontend:", req.body);

    // Validar los datos obligatorios
    if ((!idProfesor && !idPsicologo) || (idProfesor && idPsicologo)) {
      console.error("Error: Se debe enviar solo idProfesor o idPsicologo, no ambos.");
      return res.status(400).json({ error: "Debes seleccionar un profesor o un psicólogo, pero no ambos." });
    }

    if (!idPadre || !fecha || !descripcion || !idMotivo) {
      console.error("Error: Campos obligatorios faltantes.");
      return res.status(400).json({ error: "Todos los campos son obligatorios." });
    }

    // Validar el motivo y obtener su prioridad
    const motivoCheck = await pool.query(
      `SELECT m.nombremotivo, p.tipoprioridad 
       FROM motivo m 
       JOIN prioridad p ON m.idprioridad = p.idprioridad 
       WHERE m.idmotivo = $1 AND m.estado = TRUE`,
      [idMotivo]
    );

    if (motivoCheck.rows.length === 0) {
      console.error("Error: Motivo no válido.");
      return res.status(400).json({ error: "Motivo no válido." });
    }

    const { nombremotivo, tipoprioridad } = motivoCheck.rows[0];
    console.log("Prioridad del motivo:", tipoprioridad);

    const duracionAtencion = tipoprioridad.toLowerCase() === 'alta' ? 25 :
                             tipoprioridad.toLowerCase() === 'media' ? 20 : 10;

    // Obtener el idhorario basado en el idProfesor o idPsicologo
    let idhorario;
    let profesional;
    if (idProfesor) {
      const profesorData = await pool.query(
        `SELECT idhorario, nombres, apellidopaterno, apellidomaterno 
         FROM Profesor 
         WHERE idprofesor = $1 AND estado = TRUE`,
        [idProfesor]
      );
      if (profesorData.rows.length === 0) {
        console.error("Error: Profesor no encontrado o no está activo.");
        return res.status(400).json({ error: "Profesor no encontrado o no está activo." });
      }
      idhorario = profesorData.rows[0].idhorario;
      profesional = profesorData.rows[0];
      console.log("Profesor encontrado:", profesional);
    } else if (idPsicologo) {
      const psicologoData = await pool.query(
        `SELECT idhorario, nombres, apellidopaterno, apellidomaterno 
         FROM Psicologo 
         WHERE idpsicologo = $1 AND estado = TRUE`,
        [idPsicologo]
      );
      if (psicologoData.rows.length === 0) {
        console.error("Error: Psicólogo no encontrado o no está activo.");
        return res.status(400).json({ error: "Psicólogo no encontrado o no está activo." });
      }
      idhorario = psicologoData.rows[0].idhorario;
      profesional = psicologoData.rows[0];
      console.log("Psicólogo encontrado:", profesional);
    }

    // Obtener el horario del usuario según el idhorario
    const horarioData = await pool.query(
      `SELECT horainicio::text, horafin::text 
       FROM horario 
       WHERE idhorario = $1 AND estado = TRUE`,
      [idhorario]
    );

    if (horarioData.rows.length === 0) {
      console.error("Error: No se encontró un horario para este usuario.");
      return res.status(400).json({ error: "No se encontró un horario para este usuario." });
    }

    const { horainicio, horafin } = horarioData.rows[0];
    console.log("Horario encontrado:", { horainicio, horafin });

    // Insertar la nueva entrevista
    await pool.query(
      `INSERT INTO reservarentrevista 
       (idprofesor, idpsicologo, idpadre, fecha, descripcion, idmotivo, estado) 
       VALUES ($1, $2, $3, $4, $5, $6, NULL)`,
      [idProfesor || null, idPsicologo || null, idPadre, fecha, descripcion, idMotivo]
    );
    console.log("Entrevista insertada con éxito.");

    // Reordenar entrevistas y recalcular horas
    const entrevistas = await pool.query(
      `SELECT re.idreservarentrevista, 
              re.idmotivo, 
              p.tipoprioridad, 
              re.fecha
       FROM reservarentrevista re
       JOIN motivo m ON re.idmotivo = m.idmotivo
       JOIN prioridad p ON m.idprioridad = p.idprioridad
       WHERE re.fecha = $1
       ORDER BY CASE 
                  WHEN p.tipoprioridad = 'Alta' THEN 1
                  WHEN p.tipoprioridad = 'Media' THEN 2
                  ELSE 3 
                END, re.idreservarentrevista`,
      [fecha]
    );

    let horaActual = horainicio;
    for (const entrevista of entrevistas.rows) {
      const duracion = entrevista.tipoprioridad.toLowerCase() === 'alta' ? 25 :
                       entrevista.tipoprioridad.toLowerCase() === 'media' ? 20 : 10;

      const [horas, minutos] = horaActual.split(":").map(Number);
      const nuevaHoraFinMinutos = horas * 60 + minutos + duracion;
      const nuevaHoraFinHoras = Math.floor(nuevaHoraFinMinutos / 60);
      const nuevaHoraFinRestantesMinutos = nuevaHoraFinMinutos % 60;

      const nuevaHoraFin = `${String(nuevaHoraFinHoras).padStart(2, "0")}:${String(nuevaHoraFinRestantesMinutos).padStart(2, "0")}:00`;

      if (nuevaHoraFin > horafin) {
        console.error("Error: El horario excede el tiempo disponible.");
        return res.status(400).json({
          error: "El horario excede el tiempo disponible del profesor/psicólogo.",
        });
      }

      await pool.query(
        `UPDATE reservarentrevista 
         SET horafinentrevista = $1 
         WHERE idreservarentrevista = $2`,
        [nuevaHoraFin, entrevista.idreservarentrevista]
      );

      console.log(`Entrevista ID ${entrevista.idreservarentrevista} actualizada con hora fin: ${nuevaHoraFin}`);
      horaActual = nuevaHoraFin;
    }

    // Enviar correo al padre de familia
    await enviarCorreoProfesores({
      idPadre,
      idProfesor,
      idPsicologo,
      motivo: nombremotivo,
      materia: "General", // Puedes ajustar para obtener la materia correcta si aplica
      fecha,
      horarioInicio: horainicio,
      descripcion,
    });

    res.status(201).json({ success: "Entrevista agendada y correo enviado correctamente." });
  } catch (error) {
    console.error("Error al agendar la entrevista:", error.message);
    res.status(500).json({ error: `Error al agendar la entrevista: ${error.message}` });
  }
};




export const enviarCorreoProfesores = async ({ idPadre, idProfesor, idPsicologo, motivo, materia, fecha, horarioInicio, descripcion }) => {
  try {
    // Validar que todos los campos requeridos están presentes
    if (!idPadre || !motivo || !materia || !fecha || !horarioInicio || !descripcion || (!idProfesor && !idPsicologo)) {
      console.error("Faltan datos para enviar el correo", {
        idPadre, idProfesor, idPsicologo, motivo, materia, fecha, horarioInicio, descripcion
      });
      return;
    }

    // Obtener información del padre de familia
    const padreQuery = await pool.query(
      "SELECT nombres, apellidopaterno, apellidomaterno, email FROM padredefamilia WHERE idPadre = $1",
      [idPadre]
    );

    if (padreQuery.rows.length === 0) {
      console.error("Padre de familia no encontrado");
      return;
    }

    const padre = padreQuery.rows[0];
    const nombresPadre = `${padre.nombres} ${padre.apellidopaterno} ${padre.apellidomaterno}`;
    const emailPadre = padre.email;

    // Obtener información del profesor o psicólogo
    let profesional;
    if (idProfesor) {
      const profesorQuery = await pool.query(
        "SELECT nombres, apellidopaterno, apellidomaterno, email FROM profesor WHERE idprofesor = $1",
        [idProfesor]
      );

      if (profesorQuery.rows.length === 0) {
        console.error("Profesor no encontrado");
        return;
      }

      profesional = profesorQuery.rows[0];
    } else if (idPsicologo) {
      const psicologoQuery = await pool.query(
        "SELECT nombres, apellidopaterno, apellidomaterno, email FROM psicologo WHERE idpsicologo = $1",
        [idPsicologo]
      );

      if (psicologoQuery.rows.length === 0) {
        console.error("Psicólogo no encontrado");
        return;
      }

      profesional = psicologoQuery.rows[0];
    }

    const nombresProfesional = `${profesional.nombres} ${profesional.apellidopaterno} ${profesional.apellidomaterno}`;

    // Crear mensaje de correo
    const mensaje = `
      Estimado(a) ${nombresPadre},

      Nos comunicamos para informarle que se ha programado una entrevista con el siguiente detalle:

      - Motivo: ${motivo}
      - Materia: ${materia}
      - Fecha: ${fecha}
      - Hora de inicio: ${horarioInicio}
      - Descripción: ${descripcion}

      Atentamente,
      ${idProfesor ? "Profesor" : "Psicólogo"}: ${nombresProfesional}
    `;

    // Configurar transporte de correo
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'aleejocr7@gmail.com',
        pass: 'wltk fhvo uomy nlvt'
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Opciones de correo
    const mailOptions = {
      from: 'aleejocr7@gmail.com',
      to: emailPadre,
      subject: 'Cita agendada',
      text: mensaje
    };

    // Enviar correo
    await transporter.sendMail(mailOptions);
    console.log(`Correo enviado a: ${emailPadre}`);
  } catch (error) {
    console.error('Error al enviar el correo:', error.message);
  }
};

export const obtenerFechasHabilitadas = async (req, res) => {
  const { idhorario } = req.query; // Obtener idhorario desde el cliente

  try {
    if (!idhorario) {
      return res.status(400).json({ error: "El parámetro idhorario es obligatorio." });
    }

    // Obtener el horario del usuario
    const horarioData = await pool.query(
      `SELECT horainicio::text, horafin::text, dia 
       FROM horario 
       WHERE idhorario = $1 AND estado = TRUE`,
      [idhorario]
    );

    if (horarioData.rows.length === 0) {
      return res.status(404).json({ error: "Horario no encontrado." });
    }

    const horarios = horarioData.rows;

    // Obtener fechas habilitadas (de lunes a viernes)
    const fechasHabilitadas = [];
    const hoy = new Date();
    for (let i = 0; i < 30; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);

      // Verificar si el día de la semana está en el horario
      const diaSemana = fecha.getDay(); // 0: Domingo, 1: Lunes, ..., 6: Sábado
      const dia = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][diaSemana];

      if (horarios.some(h => h.dia === dia)) {
        fechasHabilitadas.push(fecha.toISOString().split("T")[0]);
      }
    }

    res.json(fechasHabilitadas);
  } catch (error) {
    console.error("Error al obtener fechas habilitadas:", error.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};














export const obtenerColaEsperaPrioridadFIFO = async (req, res) => {
  const { idhorario } = req.query;

  console.log("IDHorario recibido desde el frontend:", idhorario);

  if (!idhorario) {
    console.error("Error: El parámetro idhorario es obligatorio.");
    return res.status(400).json({ error: "El parámetro idhorario es obligatorio." });
  }

  try {
    // Validar que el horario existe y está activo
    const horarioData = await pool.query(
      `SELECT horainicio::text, horafin::text 
       FROM horario 
       WHERE idhorario = $1 AND estado = TRUE`,
      [idhorario]
    );

    if (horarioData.rows.length === 0) {
      console.error("Error: No se encontró un horario válido para el idhorario proporcionado.");
      return res.status(400).json({ error: "No se encontró un horario válido para el idhorario proporcionado." });
    }

    const { horainicio, horafin } = horarioData.rows[0];
    console.log("Horario encontrado:", { horainicio, horafin });

    // Procesar entrevistas
    const entrevistas = await pool.query(
      `SELECT 
         re.idreservarentrevista,
         TO_CHAR(re.fecha, 'YYYY-MM-DD') AS fecha,
         re.descripcion,
         CONCAT(p.nombres, ' ', p.apellidopaterno, ' ', p.apellidomaterno) AS nombre_completo,
         p.email,
         m.nombremotivo AS motivo,
         pr.tipoprioridad AS prioridad,
         re.estado
       FROM reservarentrevista re
       JOIN padredefamilia p ON re.idpadre = p.idpadre
       JOIN motivo m ON re.idmotivo = m.idmotivo
       JOIN prioridad pr ON m.idprioridad = pr.idprioridad
       WHERE re.fecha = CURRENT_DATE
       ORDER BY CASE 
                  WHEN pr.tipoprioridad = 'Alta' THEN 1
                  WHEN pr.tipoprioridad = 'Media' THEN 2
                  ELSE 3 
                END, re.idreservarentrevista`
    );

    console.log("Entrevistas obtenidas:", entrevistas.rows);

    const entrevistasRecalculadas = [];
    let horaActual = horainicio; // Inicializamos con el horainicio del horario

    for (const entrevista of entrevistas.rows) {
      const duracion = entrevista.prioridad.toLowerCase() === 'alta' ? 25 :
                       entrevista.prioridad.toLowerCase() === 'media' ? 20 : 10;

      const [horas, minutos] = horaActual.split(":").map(Number);
      const nuevaHoraFinMinutos = horas * 60 + minutos + duracion;
      const nuevaHoraFinHoras = Math.floor(nuevaHoraFinMinutos / 60);
      const nuevaHoraFinRestantesMinutos = nuevaHoraFinMinutos % 60;

      const nuevaHoraFin = `${String(nuevaHoraFinHoras).padStart(2, "0")}:${String(nuevaHoraFinRestantesMinutos).padStart(2, "0")}:00`;

      if (nuevaHoraFin > horafin) {
        console.log(
          `Entrevista ID ${entrevista.idreservarentrevista} excede el horario permitido. Fin calculado: ${nuevaHoraFin}, Fin permitido: ${horafin}`
        );
        break;
      }

      entrevistasRecalculadas.push({
        ...entrevista,
        horainicio: horaActual,
        horafin: nuevaHoraFin,
      });

      console.log(
        `Entrevista ID ${entrevista.idreservarentrevista} recalculada. Inicio: ${horaActual}, Fin: ${nuevaHoraFin}`
      );

      horaActual = nuevaHoraFin;
    }

    console.log("Entrevistas recalculadas finalizadas:", entrevistasRecalculadas);

    res.status(200).json(entrevistasRecalculadas);
  } catch (error) {
    console.error("Error al obtener la cola de espera:", error.message);
    res.status(500).json({ error: `Error al obtener la cola de espera: ${error.message}` });
  }
};

export const obtenerListaEntrevistaPorFecha = async (req, res) => {
  const { fecha } = req.params;
  const { idProfesor, idPsicologo } = req.query;

  console.log("Fecha recibida:", fecha);
  console.log("IDProfesor recibido:", idProfesor);
  console.log("IDPsicologo recibido:", idPsicologo);

  // Validar que se envíe un identificador válido (Profesor o Psicólogo)
  if (!idProfesor && !idPsicologo) {
    console.error("Error: Se requiere el idProfesor o el idPsicologo.");
    return res.status(400).json({ error: "Se requiere el idProfesor o el idPsicologo." });
  }

  try {
    // Determinar el idhorario según el rol del usuario
    let idhorario;

    if (idProfesor) {
      const profesorData = await pool.query(
        `SELECT idhorario 
         FROM Profesor 
         WHERE idprofesor = $1 AND estado = TRUE`,
        [idProfesor]
      );

      if (profesorData.rows.length === 0) {
        console.error("Error: No se encontró un profesor activo con el ID proporcionado.");
        return res.status(400).json({ error: "No se encontró un profesor activo con el ID proporcionado." });
      }

      idhorario = profesorData.rows[0].idhorario;
      console.log("IDHorario del profesor:", idhorario);
    } else if (idPsicologo) {
      const psicologoData = await pool.query(
        `SELECT idhorario 
         FROM Psicologo 
         WHERE idpsicologo = $1 AND estado = TRUE`,
        [idPsicologo]
      );

      if (psicologoData.rows.length === 0) {
        console.error("Error: No se encontró un psicólogo activo con el ID proporcionado.");
        return res.status(400).json({ error: "No se encontró un psicólogo activo con el ID proporcionado." });
      }

      idhorario = psicologoData.rows[0].idhorario;
      console.log("IDHorario del psicólogo:", idhorario);
    }

    // Obtener horario asociado al idhorario
    const horarioData = await pool.query(
      `SELECT horainicio::text, horafin::text 
       FROM horario 
       WHERE idhorario = $1 AND estado = TRUE`,
      [idhorario]
    );

    if (horarioData.rows.length === 0) {
      console.error("Error: No se encontró un horario válido para el idhorario proporcionado.");
      return res.status(400).json({ error: "No se encontró un horario válido para el idhorario proporcionado." });
    }

    const { horainicio, horafin } = horarioData.rows[0];
    console.log("Horario asociado encontrado:", { horainicio, horafin });

    // Obtener entrevistas para la fecha especificada, pero filtrando por el idProfesor o idPsicologo
    const entrevistas = await pool.query(
      `SELECT 
         re.idreservarentrevista,
         TO_CHAR(re.fecha, 'YYYY-MM-DD') AS fecha,
         re.descripcion,
         CONCAT(p.nombres, ' ', p.apellidopaterno, ' ', p.apellidomaterno) AS nombre_completo,
         p.email,
         m.nombremotivo AS motivo,
         pr.tipoprioridad AS prioridad,
         re.estado
       FROM reservarentrevista re
       JOIN padredefamilia p ON re.idpadre = p.idpadre
       JOIN motivo m ON re.idmotivo = m.idmotivo
       JOIN prioridad pr ON m.idprioridad = pr.idprioridad
       WHERE TO_CHAR(re.fecha, 'YYYY-MM-DD') = $1
       AND (
         (re.idprofesor = $2 AND $2 IS NOT NULL) OR
         (re.idpsicologo = $3 AND $3 IS NOT NULL)
       )
       ORDER BY CASE 
                  WHEN pr.tipoprioridad = 'Alta' THEN 1
                  WHEN pr.tipoprioridad = 'Media' THEN 2
                  ELSE 3 
                END, re.idreservarentrevista`,
      [fecha, idProfesor, idPsicologo]
    );

    if (entrevistas.rows.length === 0) {
      console.log("No se encontraron entrevistas para la fecha especificada.");
      return res.status(200).json([]);
    }

    console.log("Entrevistas obtenidas:", entrevistas.rows);

    // Recalcular las horas basándose en el horario del usuario
    const entrevistasRecalculadas = [];
    let horaActual = horainicio;

    for (const entrevista of entrevistas.rows) {
      const duracion = entrevista.prioridad.toLowerCase() === 'alta' ? 25 :
                       entrevista.prioridad.toLowerCase() === 'media' ? 20 : 10;

      const [horas, minutos] = horaActual.split(":").map(Number);
      const nuevaHoraFinMinutos = horas * 60 + minutos + duracion;
      const nuevaHoraFinHoras = Math.floor(nuevaHoraFinMinutos / 60);
      const nuevaHoraFinRestantesMinutos = nuevaHoraFinMinutos % 60;

      const nuevaHoraFin = `${String(nuevaHoraFinHoras).padStart(2, "0")}:${String(nuevaHoraFinRestantesMinutos).padStart(2, "0")}:00`;

      if (nuevaHoraFin > horafin) {
        console.log(`Entrevista ID ${entrevista.idreservarentrevista} excede el horario permitido. Fin calculado: ${nuevaHoraFin}, Fin permitido: ${horafin}`);
        break;
      }

      entrevistasRecalculadas.push({
        ...entrevista,
        horainicio: horaActual,
        horafin: nuevaHoraFin,
      });

      console.log(`Entrevista ID ${entrevista.idreservarentrevista} recalculada. Inicio: ${horaActual}, Fin: ${nuevaHoraFin}`);

      horaActual = nuevaHoraFin;
    }

    console.log("Entrevistas recalculadas finalizadas:", entrevistasRecalculadas);

    res.status(200).json(entrevistasRecalculadas);
  } catch (error) {
    console.error("Error al obtener las entrevistas por fecha:", error.message);
    res.status(500).json({ error: `Error al obtener las entrevistas por fecha: ${error.message}` });
  }
};
export const insertarReservaEntrevista = async (req, res) => {
  const { idProfesor, idPsicologo, idPadre, fecha, idMotivo, descripcion } = req.body;

  console.log("Datos recibidos del frontend:", req.body);

  try {
    // Validar campos obligatorios
    if ((!idProfesor && !idPsicologo) || !idPadre || !fecha || !idMotivo) {
      return res.status(400).json({ error: "Todos los campos obligatorios deben ser completados." });
    }

    // Validar motivo y obtener su prioridad
    const motivoCheck = await pool.query(
      `SELECT m.nombremotivo, p.tipoprioridad 
       FROM motivo m 
       JOIN prioridad p ON m.idprioridad = p.idprioridad 
       WHERE m.idmotivo = $1 AND m.estado = TRUE`,
      [idMotivo]
    );

    if (motivoCheck.rows.length === 0) {
      return res.status(400).json({ error: "Motivo no válido." });
    }

    const { nombremotivo, tipoprioridad } = motivoCheck.rows[0];
    const duracionAtencion = tipoprioridad.toLowerCase() === "alta" ? 25 :
                             tipoprioridad.toLowerCase() === "media" ? 20 : 10;

    // Obtener el horario y materia del profesor o psicólogo
    const horarioData = await pool.query(
      `SELECT h.horainicio::text, h.horafin::text, 
              ${idProfesor ? "m.nombre AS materia" : "'Psicólogo' AS materia"} 
       FROM horario h
       LEFT JOIN materia m ON h.idmateria = m.idmateria
       WHERE h.idhorario = (
         SELECT idhorario FROM ${idProfesor ? "profesor" : "psicologo"} 
         WHERE ${idProfesor ? "idprofesor" : "idpsicologo"} = $1 AND estado = TRUE
       )`,
      [idProfesor || idPsicologo]
    );

    if (horarioData.rows.length === 0) {
      return res.status(400).json({ error: "No se encontró un horario válido." });
    }

    const { horainicio, horafin, materia } = horarioData.rows[0];

    // Obtener entrevistas existentes para la fecha
    const entrevistasPrevias = await pool.query(
      `SELECT re.idreservarentrevista, re.idpadre, m.nombremotivo, pr.tipoprioridad AS prioridad
       FROM reservarentrevista re
       JOIN motivo m ON re.idmotivo = m.idmotivo
       JOIN prioridad pr ON m.idprioridad = pr.idprioridad
       WHERE re.fecha = $1
       AND (
         (re.idprofesor = $2 AND $2 IS NOT NULL) OR 
         (re.idpsicologo = $3 AND $3 IS NOT NULL)
       )
       ORDER BY CASE 
                  WHEN pr.tipoprioridad = 'Alta' THEN 1
                  WHEN pr.tipoprioridad = 'Media' THEN 2
                  ELSE 3 
                END, re.idreservarentrevista`,
      [fecha, idProfesor, idPsicologo]
    );

    let horaActual = horainicio;
    const recalculatedInterviews = [];

    // Procesar entrevistas previas y recalcular horarios
    for (const entrevista of entrevistasPrevias.rows) {
      const duracion = entrevista.prioridad.toLowerCase() === "alta" ? 25 :
                       entrevista.prioridad.toLowerCase() === "media" ? 20 : 10;

      const [horas, minutos] = horaActual.split(":").map(Number);
      const nuevaHoraFinMinutos = horas * 60 + minutos + duracion;
      const nuevaHoraFinHoras = Math.floor(nuevaHoraFinMinutos / 60);
      const nuevaHoraFinRestantesMinutos = nuevaHoraFinMinutos % 60;

      const nuevaHoraFin = `${String(nuevaHoraFinHoras).padStart(2, "0")}:${String(nuevaHoraFinRestantesMinutos).padStart(2, "0")}:00`;

      if (nuevaHoraFin > horafin) {
        console.log(`No hay espacio disponible para la entrevista ID ${entrevista.idreservarentrevista}.`);
        break;
      }

      recalculatedInterviews.push({
        ...entrevista,
        horainicio: horaActual,
        horafin: nuevaHoraFin,
      });

      horaActual = nuevaHoraFin;
    }

    // Validar espacio para la nueva entrevista
    const nuevaEntrevistaInicio = horaActual;
    const nuevaEntrevistaFinMinutos = Number(nuevaEntrevistaInicio.split(":")[0]) * 60 +
                                      Number(nuevaEntrevistaInicio.split(":")[1]) + duracionAtencion;

    const nuevaEntrevistaFin = `${String(Math.floor(nuevaEntrevistaFinMinutos / 60)).padStart(2, "0")}:${String(nuevaEntrevistaFinMinutos % 60).padStart(2, "0")}:00`;

    if (nuevaEntrevistaFin > horafin) {
      console.log("La nueva entrevista excede el horario permitido. Será marcada como no válida.");

      // Enviar correos a las entrevistas válidas
      for (const entrevista of recalculatedInterviews) {
        const emailQuery = await pool.query(
          `SELECT email FROM padredefamilia WHERE idpadre = $1`,
          [entrevista.idpadre]
        );

        const { email } = emailQuery.rows[0];

        await enviarCorreoPadres({
          idPadre: entrevista.idpadre,
          motivo: entrevista.nombremotivo,
          materia,
          fecha,
          horario: entrevista.horainicio,
          horafin: entrevista.horafin,
          descripcion: descripcion || "",
          profesor: { nombres: idPsicologo ? "Psicólogo" : "Profesor" },
        });

        console.log(`Correo enviado a: ${email}`);
      }

      return res.status(400).json({
        error: "La nueva entrevista excede el horario permitido. Correos enviados para las entrevistas válidas.",
      });
    } else {
      await pool.query(
        `INSERT INTO reservarentrevista 
         (idprofesor, idpsicologo, idpadre, fecha, descripcion, idmotivo, estado)
         VALUES ($1, $2, $3, $4, $5, $6, NULL)`,
        [idProfesor, idPsicologo, idPadre, fecha, descripcion || '', idMotivo]
      );

      recalculatedInterviews.push({
        idpadre: idPadre,
        nombremotivo: nombremotivo,
        prioridad: tipoprioridad,
        horainicio: nuevaEntrevistaInicio,
        horafin: nuevaEntrevistaFin,
      });

      console.log("Nueva entrevista insertada correctamente.");
    }

    res.status(201).json({
      message: "Nueva entrevista agendada y procesada correctamente. Se confirmara la hora a su correo a las 18:00",
      success: true, // Indicamos que fue exitoso
    });    
  } catch (error) {
    console.error("Error al insertar la reserva de entrevista:", error);
    res.status(500).json({ error: "Error al insertar la reserva de entrevista." });
  }
};




export const enviarCorreoPadres = async ({
  idPadre,
  motivo,
  materia,
  fecha,
  horario,
  horafin, // Recibir el nuevo parámetro
  descripcion,
  profesor,
}) => {
  console.log("Datos recibidos para enviar correo:", {
    idPadre,
    motivo,
    materia,
    fecha,
    horario,
    horafin, // Mostrar también el valor de horafin
    descripcion,
    profesor,
  });

  try {
    // Verificar que todos los campos requeridos estén presentes
    if (!idPadre || !motivo || !materia || !fecha || !horario || !horafin || !profesor) {
      console.error("Faltan datos para enviar el correo", {
        idPadre,
        motivo,
        materia,
        fecha,
        horario,
        horafin,
        descripcion,
        profesor,
      });
      return;
    }

    // Obtener información del padre de familia desde la base de datos
    const padreQuery = await pool.query(
      "SELECT nombres, apellidopaterno, apellidomaterno, email FROM padredefamilia WHERE idpadre = $1",
      [idPadre]
    );

    if (padreQuery.rows.length === 0) {
      console.error("Padre de familia no encontrado para idPadre:", idPadre);
      return;
    }

    const padre = padreQuery.rows[0];
    const nombresPadre = `${padre.nombres} ${padre.apellidopaterno} ${padre.apellidomaterno}`;
    const emailPadre = padre.email;

    if (!emailPadre) {
      console.error("Correo electrónico del padre no encontrado para idpadre:", idPadre);
      return;
    }

    console.log("Correo a enviar a:", emailPadre);

    const mensaje = `
    Estimado(a) ${nombresPadre},
  
    Nos comunicamos del Intituto de Educacion Bancaria para informarle que se ha programado una entrevista con el siguiente detalle:
  
    - Motivo: ${motivo}
    - Materia: ${materia}
    - Fecha: ${fecha}
    - Hora de inicio: ${horario}
    - Hora de fin: ${horafin}
  
    Atentamente,
    Profesor: ${profesor.nombres}
  `;
  


    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: "aleejocr7@gmail.com",
        pass: "pnlt odwp nrmb vsko",
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: "aleejocr7@gmail.com",
      to: emailPadre,
      subject: "Cita agendada",
      text: mensaje,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Correo enviado a: ${emailPadre}`);
  } catch (error) {
    console.error("Error al enviar el correo:", error.message);
  }
};











export const eliminarEntrevista = async (req, res) => {
  const { idReservarEntrevista } = req.params; // ID de la entrevista a modificar
  const { nuevoEstado } = req.body; // Nuevo estado proporcionado en el cuerpo de la solicitud

  try {
    // Validar que se proporcionen los datos necesarios
    if (!idReservarEntrevista || nuevoEstado === undefined) {
      return res.status(400).json({ error: "Faltan datos requeridos para cambiar el estado de la entrevista." });
    }

    // Convertir el nuevo estado en un booleano según el valor proporcionado
    const estadoBooleano = nuevoEstado === 'completado';

    // Actualizar el estado de la entrevista en la base de datos
    const resultado = await pool.query(
      `UPDATE reservarentrevista 
       SET estado = $1 
       WHERE idreservarentrevista = $2
       RETURNING *`,
      [estadoBooleano, idReservarEntrevista]
    );

    // Verificar si se encontró la entrevista
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Entrevista no encontrada." });
    }

    res.status(200).json({
      message: `Estado de la entrevista actualizado a ${estadoBooleano ? 'completado' : 'cancelado'}`,
      entrevista: resultado.rows[0]
    });
  } catch (error) {
    console.error("Error al cambiar el estado de la entrevista:", error.message);
    res.status(500).json({ error: "Error al cambiar el estado de la entrevista." });
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
        m.nombres AS materia,
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