import nodemailer from 'nodemailer';
import { pool } from "../db.js";
import crypto from 'crypto';

export const enviarCorreo = async (req, res) => {
    const { idPadre, motivo, materia, fecha, horario, descripcion, profesor } = req.body;
  
    try {

  
      // Verificar que todos los campos requeridos estén presentes
      if (!idPadre || !motivo || !materia || !fecha || !horario || !descripcion || !profesor) {
        console.error("Faltan datos para enviar el correo");
        return res.status(400).json({ error: "Faltan datos para enviar el correo" });
      }
  
      // Verificar que la información del profesor esté disponible
      if (!profesor.nombres || !profesor.apellidopaterno || !profesor.apellidomaterno) {
        console.error("Información del profesor incompleta");
        return res.status(400).json({ error: "Información del profesor incompleta" });
      }
  

  
      // Obtener información del padre de familia desde la base de datos
      const padreQuery = await pool.query(
        "SELECT nombres, apellidopaterno, apellidomaterno, email FROM padredefamilia WHERE idPadre = $1",
        [idPadre]
      );
  
      if (padreQuery.rows.length === 0) {
        console.error("Padre de familia no encontrado");
        return res.status(404).json({ error: "Padre de familia no encontrado" });
      }
  
      const padre = padreQuery.rows[0];
      const nombresPadre = `${padre.nombres} ${padre.apellidopaterno} ${padre.apellidomaterno}`;
      const emailPadre = padre.email;
  
      const mensaje = `
        Estimado(a) ${nombresPadre},
  
        Nos comunicamos para informarle que se ha programado una entrevista con el siguiente detalle:
  
        - Motivo: ${motivo}
        - Materia: ${materia}
        - Fecha: ${fecha}
        - Hora de inicio: ${horario}
        - Descripción: ${descripcion}
  
        Atentamente,
        Profesor: ${profesor.nombres} ${profesor.apellidopaterno} ${profesor.apellidomaterno}
      `;
  
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
  
      const mailOptions = {
        from: 'aleejocr7@gmail.com',
        to: emailPadre,
        subject: 'Cita agendada',
        text: mensaje
      };
  
      await transporter.sendMail(mailOptions);
      res.status(200).json({ message: 'Correo enviado exitosamente' });
  
    } catch (error) {
      console.error('Error al enviar el correo:', error.message);
      res.status(500).json({ error: 'Error al enviar el correo electrónico' });
    }
  };
  

  export const enviarCodigoConfirmacion = async (req, res) => {
    const { email } = req.body;
  
    try {
  
      // Validar que el correo sea proporcionado
      if (!email) {
        return res.status(400).json({ error: "El correo electrónico es obligatorio." });
      }
  
      // Generar un código de confirmación (6 dígitos)
      const codigoConfirmacion = crypto.randomInt(100000, 999999);
  
      // Configurar el transportador de nodemailer
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'aleejocr7@gmail.com', // Tu correo electrónico
          pass: 'wltk fhvo uomy nlvt' // Contraseña de aplicación generada en Gmail
        },
        tls: {
          rejectUnauthorized: false
        }
      });
  
      // Contenido del correo
      const mensaje = `
        Estimado usuario,
  
        Hemos recibido una solicitud para confirmar tu correo electrónico. Este es tu código de confirmación:
  
        Código: ${codigoConfirmacion}
  
        Si no solicitaste este código, ignora este mensaje.
  
        Atentamente,
        El equipo de soporte
      `;
  
      // Opciones del correo
      const mailOptions = {
        from: 'aleejocr7@gmail.com',
        to: email,
        subject: 'Código de Confirmación',
        text: mensaje
      };
  
      // Enviar el correo
      await transporter.sendMail(mailOptions);
  

  
      // Responder con éxito y el código (puedes guardarlo en la base de datos si lo necesitas)
      res.status(200).json({
        message: 'Correo enviado exitosamente.',
        codigoConfirmacion: codigoConfirmacion,
      });
      
    } catch (error) {
      console.error('Error al enviar el correo:', error.message);
      res.status(500).json({ error: 'Error al enviar el correo electrónico.' });
    }
  };