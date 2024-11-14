import nodemailer from 'nodemailer';
import { pool } from "../db.js";

export const enviarCorreo = async (req, res) => {
  const { idPadre, motivo, materia, fecha, horario, descripcion, profesor } = req.body;

  try {
    // Obtener información del padre de familia desde la base de datos
    const padreQuery = await pool.query(
      "SELECT nombres, apellidoPaterno, apellidoMaterno, email FROM padredefamilia WHERE idPadre = $1",
      [idPadre]
    );

    if (padreQuery.rows.length === 0) {
      return res.status(404).json({ error: "Padre de familia no encontrado" });
    }

    const padre = padreQuery.rows[0];
    const nombresPadre = `${padre.nombres} ${padre.apellidopaterno} ${padre.apellidomaterno}`;
    const emailPadre = padre.email;

    // Obtener información del profesor desde el `req.body`
    const { nombres, apellidopaterno, apellidomaterno } = profesor;

    // Configurar el servicio de nodemailer
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // false para puerto 587, true para 465
        auth: {
          user: 'aleejocr7@gmail.com',
          pass: 'huet oaxs ckmt qyvz'
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      

    // Crear el mensaje del correo con la hora de inicio correcta
    const mensaje = `
      Estimado(a) ${nombresPadre},

      Nos comunicamos del colegio Instituto de Educación Bancaria para informarle que se ha programado una entrevista con el siguiente detalle:

      - Motivo: ${motivo}
      - Materia: ${materia}
      - Fecha: ${fecha}
      - Hora de inicio: ${horario}  
      - Descripción: ${descripcion}

      Por favor, asegúrese de estar disponible en el horario indicado.

      Atentamente,
      Profesor@: ${nombres} ${apellidopaterno} ${apellidomaterno}
    `;

    const mailOptions = {
      from: 'aleejocr7@gmail.com',
      to: emailPadre,
      subject: 'Cita agendada - Instituto de Educación Bancaria',
      text: mensaje
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Correo enviado exitosamente' });

  } catch (error) {
    console.error('Error al enviar el correo:', error);
    res.status(500).json({ error: 'Error al enviar el correo electrónico' });
  }
};
