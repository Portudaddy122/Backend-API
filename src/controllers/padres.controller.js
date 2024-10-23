import { pool } from "../db.js";
import bcrypt from "bcrypt";

// Obtener todos los padres de familia
export const getPadresFamilia = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT *
      FROM PadreDeFamilia
      ORDER BY idPadre ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los padres de familia" });
  }
};

// Obtener un padre de familia por ID
export const getPadreFamiliaById = async (req, res) => {
  const { idPadre } = req.params;

  try {
    const { rows } = await pool.query(
      `
      SELECT *
      FROM PadreDeFamilia
      WHERE idPadre = $1
      `,
      [idPadre]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Padre de familia no encontrado" });
    }

    const padre = rows[0];

    if (!padre.estado) {
      return res.status(400).json({ error: "Padre de familia está deshabilitado" });
    }

    res.json(padre);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el padre de familia" });
  }
};

// Crear un nuevo padre de familia
export const createPadreFamilia = async (req, res) => {
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
    // Validar campos obligatorios y que no tengan solo espacios en blanco
    if (
      !idDireccion ||
      !nombres?.trim() ||
      !apellidoPaterno?.trim() ||
      !apellidoMaterno?.trim() ||
      !rol?.trim() ||
      !email?.trim() ||
      !numCelular?.trim() ||
      !fechaDeNacimiento ||
      !contrasenia?.trim()
    ) {
      return res
        .status(400)
        .json({ error: "Todos los campos son obligatorios y no pueden contener solo espacios en blanco" });
    }

    // Validar que los nombres y apellidos no contengan caracteres especiales
    const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (
      !namePattern.test(nombres) ||
      !namePattern.test(apellidoPaterno) ||
      !namePattern.test(apellidoMaterno)
    ) {
      return res.status(400).json({ error: "Los nombres y apellidos no deben contener caracteres especiales" });
    }

    // Validar que el rol sea "Padre de Familia"
    if (rol !== "Padre de Familia") {
      return res.status(400).json({ error: 'El rol debe ser "Padre de Familia"' });
    }

    // Validar que el email no esté repetido
    const emailCheck = await pool.query(
      "SELECT idPadre FROM PadreDeFamilia WHERE email = $1",
      [email.trim()]
    );
    if (emailCheck.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "El correo electrónico ya está registrado por otro usuario" });
    }
    const hashedPassword = await bcrypt.hash(contrasenia.trim(), 10);
    // Insertar en la tabla PadreDeFamilia
    const padreResult = await pool.query(
      `INSERT INTO PadreDeFamilia (idDireccion, Nombres, ApellidoPaterno, ApellidoMaterno, email, NumCelular, FechaDeNacimiento, Contrasenia, Rol, Estado) 
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

    res.status(201).json(padreResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Actualizar un padre de familia (con validación y preservando valores actuales)
// Actualizar un padre de familia
export const updatePadreFamilia = async (req, res) => {
  const { idPadre } = req.params;
  const {
    idDireccion,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    email,
    numCelular,
    fechaDeNacimiento,
    contrasenia,
    estado,
    rol,
  } = req.body;
  // Validar campos obligatorios si se envían
  if (
    (idDireccion && idDireccion === "") ||
    (nombres && !nombres.trim()) ||
    (apellidoPaterno && !apellidoPaterno.trim()) ||
    (apellidoMaterno && !apellidoMaterno.trim()) ||
    (email && !email.trim()) ||
    (numCelular && !numCelular.trim()) ||
    (fechaDeNacimiento && !fechaDeNacimiento.trim()) ||
    (contrasenia && !contrasenia.trim()) ||
    (rol && !rol.trim())
  ) {
    return res.status(400).json({ error: "Todos los campos son obligatorios y no pueden contener solo espacios en blanco" });
  }

  // Validar que los nombres y apellidos no contengan caracteres especiales si se proporcionan
  const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  if (nombres && !namePattern.test(nombres)) {
    return res.status(400).json({
      error: "Los nombres no deben contener caracteres especiales",
    });
  }
  if (apellidoPaterno && !namePattern.test(apellidoPaterno)) {
    return res.status(400).json({
      error: "El apellido paterno no debe contener caracteres especiales",
    });
  }
  if (apellidoMaterno && !namePattern.test(apellidoMaterno)) {
    return res.status(400).json({
      error: "El apellido materno no debe contener caracteres especiales",
    });
  }

  // Validar que el rol sea "Padre de Familia"
  if (rol && rol !== "Padre de Familia") {
    return res.status(400).json({ error: 'El rol debe ser "Padre de Familia"' });
  }

  // Validar que el email no esté repetido si se proporciona
  if (email) {
    const emailCheck = await pool.query(
      "SELECT idPadre FROM PadreDeFamilia WHERE email = $1 AND idPadre != $2",
      [email.trim(), idPadre]
    );
    if (emailCheck.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "El correo electrónico ya está registrado por otro usuario" });
    }
  }
  try {
    const { rows } = await pool.query("SELECT * FROM PadreDeFamilia WHERE idPadre = $1", [idPadre]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Padre de familia no encontrado" });
    }
    const currentData = rows[0];

    let hashedPassword = currentData.contrasenia; // Mantener la contraseña actual si no se proporciona
    if (contrasenia) {
      hashedPassword = await bcrypt.hash(contrasenia.trim(), 10); // Cifrar si se proporciona una nueva
    }

    await pool.query(
      `UPDATE PadreDeFamilia 
        SET idDireccion = $1, Nombres = $2, ApellidoPaterno = $3, ApellidoMaterno = $4, email = $5, NumCelular = $6, FechaDeNacimiento = $7, Contrasenia = $8, Rol = $9, Estado = $10
        WHERE idPadre = $11`,
      [
        idDireccion || currentData.iddireccion,
        nombres?.trim() || currentData.nombres,
        apellidoPaterno?.trim() || currentData.apellidopaterno,
        apellidoMaterno?.trim() || currentData.apellidomaterno,
        email?.trim() || currentData.email,
        numCelular?.trim() || currentData.numcelular,
        fechaDeNacimiento || currentData.fechadenacimiento,
        hashedPassword, // Usar la nueva contraseña cifrada o mantener la actual
        rol?.trim() || currentData.rol,
        estado !== undefined ? estado : currentData.estado,
        idPadre,
      ]
    );

    res.json({ message: "Padre de familia actualizado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

  

// Eliminar un padre de familia (desactivar)
export const deletePadreFamilia = async (req, res) => {
  const { idPadre } = req.params;

  try {
    await pool.query("BEGIN");

    const padreResult = await pool.query(
      "SELECT idPadre FROM PadreDeFamilia WHERE idPadre = $1 AND Estado = true",
      [idPadre]
    );

    if (padreResult.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res
        .status(404)
        .json({ error: "Padre de familia no encontrado o ya desactivado" });
    }

    await pool.query(
      "UPDATE PadreDeFamilia SET Estado = false WHERE idPadre = $1",
      [idPadre]
    );

    await pool.query("COMMIT");

    res.json({ message: "Padre de familia desactivado correctamente" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};



// Obtener todos los padres de familia
export const getDatesPadresFamilia = async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT idPadre, nombres, apellidoPaterno, apellidoMaterno FROM PadreDeFamilia ORDER BY idPadre ASC`);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los padres de familia" });
  }
};
