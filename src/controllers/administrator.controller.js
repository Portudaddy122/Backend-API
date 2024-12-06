import { pool } from "../db.js";
import bcrypt from "bcrypt";

// Obtener todos los administradores
export const getAdministrador = async (req, res) => {
  try {
    const { rows } = await pool.query(`
            SELECT *
            FROM Administrador
            ORDER BY idAdministrador ASC
        `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los administradores" });
  }
};

// Obtener un administrador por ID
export const getAdministradorById = async (req, res) => {
  const { idAdministrador } = req.params;

  try {
    const { rows } = await pool.query(
      `
            SELECT *
            FROM Administrador
            WHERE idAdministrador = $1
        `,
      [idAdministrador]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Administrador no encontrado" });
    }

    const administrador = rows[0];

    if (!administrador.estado) {
      return res.status(400).json({ error: "Administrador está deshabilitado" });
    }

    res.json(administrador);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el administrador" });
  }
};

// Crear un nuevo administrador
export const createAdministrador = async (req, res) => {
  const {
    idDireccion,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    email,
    numCelular,
    fechaDeNacimiento,
    contrasenia,
    rol,
  } = req.body;

  try {
    // Validar que ningún campo esté vacío o contenga solo espacios en blanco
    if (
      !idDireccion ||
      !nombres?.trim() ||
      !apellidoPaterno?.trim() ||
      !apellidoMaterno?.trim() ||
      !email?.trim() ||
      !numCelular?.trim() ||
      !fechaDeNacimiento ||
      !contrasenia?.trim() ||
      !rol?.trim()
    ) {
      return res.status(400).json({ error: "Todos los campos son obligatorios y no pueden contener solo espacios en blanco" });
    }

    // Validar que los nombres y apellidos no contengan caracteres especiales
    const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (
      !namePattern.test(nombres) ||
      !namePattern.test(apellidoPaterno) ||
      !namePattern.test(apellidoMaterno)
    ) {
      return res.status(400).json({
        error: "Los nombres y apellidos no deben contener caracteres especiales",
      });
    }

    // Validar que el rol sea "Administrador"
    if (rol !== "Administrador") {
      return res.status(400).json({ error: "El rol debe ser 'Administrador'" });
    }

    // Validar que el email no esté repetido
    const emailCheck = await pool.query(
      "SELECT idAdministrador FROM Administrador WHERE email = $1",
      [email.trim()]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        error: "El correo electrónico ya está registrado por otro usuario",
      });
    }
    const hashedPassword = await bcrypt.hash(contrasenia.trim(), 10);

    // Insertar en la tabla Administrador
    const adminResult = await pool.query(
      `INSERT INTO Administrador (idDireccion, Nombres, ApellidoPaterno, ApellidoMaterno, email, NumCelular, FechaDeNacimiento, Contrasenia, Rol, Estado) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING *`,
      [
        idDireccion,
        nombres.trim(),
        apellidoPaterno.trim(),
        apellidoMaterno.trim(),
        email.trim(),
        numCelular.trim(),
        fechaDeNacimiento,
        hashedPassword,
        rol.trim(),
      ]
    );

    res.status(201).json(adminResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
// Actualizar un administrador
export const updateAdministrador = async (req, res) => {
  const { idAdministrador } = req.params;
  const {
    iddireccion,
    nombres,
    apellidopaterno,
    apellidomaterno,
    email,
    numcelular,
    fechadenacimiento,
    contrasenia,
    estado,
    rol,
  } = req.body;

  try {
    const { rows } = await pool.query("SELECT * FROM administrador WHERE idadministrador = $1", [idAdministrador]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Administrador no encontrado" });
    }
    const currentData = rows[0];

    let hashedPassword = currentData.contrasenia;
    if (contrasenia && contrasenia !== currentData.contrasenia) {
      hashedPassword = await bcrypt.hash(contrasenia.trim(), 10);
    }

    await pool.query(
      `UPDATE administrador 
       SET iddireccion = COALESCE($1, iddireccion), 
           nombres = COALESCE($2, nombres), 
           apellidopaterno = COALESCE($3, apellidopaterno), 
           apellidomaterno = COALESCE($4, apellidomaterno), 
           email = COALESCE($5, email), 
           numcelular = COALESCE($6, numcelular), 
           fechadenacimiento = COALESCE($7, fechadenacimiento), 
           contrasenia = COALESCE($8, contrasenia), 
           estado = COALESCE($9, estado), 
           rol = COALESCE($10, rol)
       WHERE idadministrador = $11`,
      [
        iddireccion,
        nombres?.trim(),
        apellidopaterno?.trim(),
        apellidomaterno?.trim(),
        email?.trim(),
        numcelular?.trim(),
        fechadenacimiento,
        hashedPassword,
        estado,
        rol,
        idAdministrador
      ]
    );

    res.json({ message: "Administrador actualizado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};




// Eliminar un administrador (desactivar)
export const deleteAdministrador = async (req, res) => {
  const { idAdministrador } = req.params;

  try {
    await pool.query("BEGIN");

    const adminResult = await pool.query(
      "SELECT idAdministrador FROM Administrador WHERE idAdministrador = $1 AND Estado = true",
      [idAdministrador]
    );

    if (adminResult.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res
        .status(404)
        .json({ error: "Administrador no encontrado o ya desactivado" });
    }

    await pool.query(
      "UPDATE Administrador SET Estado = false WHERE idAdministrador = $1",
      [idAdministrador]
    );

    await pool.query("COMMIT");

    res.json({ message: "Administrador desactivado correctamente" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};