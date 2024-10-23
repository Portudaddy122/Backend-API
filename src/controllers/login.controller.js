import { pool } from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Asegúrate de que la clave secreta esté correctamente definida
const JWT_SECRET = process.env.JWT_SECRET || "secretKey";

export const loginUser = async (req, res) => {
  const { email, contrasenia } = req.body;

  if (!email || !contrasenia) {
    return res.status(400).json({ message: "Por favor, proporcione correo electrónico y contraseña" });
  }

  try {
    let user;
    let userType;
    let userIdColumn;

    // Buscar usuario en tabla de administrador
    const adminResult = await pool.query("SELECT * FROM administrador WHERE email = $1", [email]);
    if (adminResult.rows.length > 0) {
      user = adminResult.rows[0];
      userType = "Administrador";
      userIdColumn = "idadministrador";
    }

    // Buscar usuario en tabla de profesor
    const profResult = await pool.query("SELECT * FROM profesor WHERE email = $1", [email]);
    if (profResult.rows.length > 0) {
      user = profResult.rows[0];
      userType = "Profesor";
      userIdColumn = "idprofesor";
    }

    // Buscar usuario en tabla de psicólogo
    const psyResult = await pool.query("SELECT * FROM psicologo WHERE email = $1", [email]);
    if (psyResult.rows.length > 0) {
      user = psyResult.rows[0];
      userType = "Psicólogo";
      userIdColumn = "idpsicologo";
    }

    // Buscar usuario en tabla de padre de familia
    const padreResult = await pool.query("SELECT * FROM padredefamilia WHERE email = $1", [email]);
    if (padreResult.rows.length > 0) {
      user = padreResult.rows[0];
      userType = "Padre de Familia";
      userIdColumn = "idpadre";
    }

    // Si no se encuentra un usuario en ninguna tabla
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Verificar la contraseña
    const isMatch = await bcrypt.compare(contrasenia, user.contrasenia);
    if (!isMatch) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    // Generar el token JWT
    const token = jwt.sign(
      {
        id: user[userIdColumn],
        role: userType,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: "30 minutes" }
    );

    res.json({
      message: "Inicio de sesión exitoso",
      token,
      user: {
        id: user[userIdColumn],
        role: userType,
        nombres: user.nombres,
        apellidopaterno: user.apellidopaterno,
        apellidomaterno: user.apellidomaterno,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Error en el inicio de sesión:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
