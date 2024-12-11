import { pool } from "../db.js";

// Obtener todos los usuarios del sistema
export const getAllUsers = async (req, res) => {
  try {
    // Consultar todos los administradores
    const administradorQuery = await pool.query(
      `
        SELECT a.idAdministrador AS id, 'Administrador' AS rol, a.Nombres, a.ApellidoPaterno, a.ApellidoMaterno, a.email, a.NumCelular, a.FechaDeNacimiento
        FROM Administrador a
        WHERE a.Estado = true
      `
    );

    // Consultar todos los profesores
    const profesorQuery = await pool.query(
      `
        SELECT p.idProfesor AS id, 'Profesor' AS rol, p.Nombres, p.ApellidoPaterno, p.ApellidoMaterno, p.email, p.NumCelular, p.FechaDeNacimiento
        FROM Profesor p
        WHERE p.Estado = true
      `
    );

    // Consultar todos los psicólogos
    const psicologoQuery = await pool.query(
      `
        SELECT ps.idPsicologo AS id, 'Psicologo' AS rol, ps.Nombres, ps.ApellidoPaterno, ps.ApellidoMaterno, ps.email, ps.NumCelular, ps.FechaDeNacimiento
        FROM Psicologo ps
        WHERE ps.Estado = true
      `
    );

    // Consultar todos los padres de familia
    const padreQuery = await pool.query(
      `
        SELECT pf.idPadre AS id, 'Padre de Familia' AS rol, pf.Nombres, pf.ApellidoPaterno, pf.ApellidoMaterno, pf.email, pf.NumCelular, pf.FechaDeNacimiento
        FROM PadreDeFamilia pf
        WHERE pf.Estado = true
      `
    );

    // Consultar todos los estudiantes
    const estudianteQuery = await pool.query(
      `
        SELECT e.idEstudiante AS id, 'Estudiante' AS rol, e.Nombres, e.ApellidoPaterno, e.ApellidoMaterno, e.FechaNacimiento
        FROM Estudiante e
        WHERE e.Estado = true
      `
    );

    // Combinar los resultados de todas las consultas
    const allUsers = [
      ...administradorQuery.rows,
      ...profesorQuery.rows,
      ...psicologoQuery.rows,
      ...padreQuery.rows,
      ...estudianteQuery.rows,
    ];

    // Responder con los datos combinados
    res.json(allUsers);
  } catch (error) {
    console.error("Error al obtener los usuarios:", error);
    res.status(500).json({ error: "Error al obtener los usuarios" });
  }
};  



// Filtrar usuarios en tablas independientes
export const filterUsuarios = async (req, res) => {
  const { searchTerm } = req.query;

  // Verificar si se envió el término de búsqueda
  if (!searchTerm) {
    return res.status(400).json({ error: 'Debe proporcionar un término de búsqueda.' });
  }

  try {
    const query = `
      SELECT 'Administrador' AS rol, idAdministrador AS id, Nombres, ApellidoPaterno, ApellidoMaterno, Email, NumCelular, FechaDeNacimiento, Estado
      FROM Administrador
      WHERE LOWER(Nombres) LIKE LOWER($1)
      OR LOWER(ApellidoPaterno) LIKE LOWER($1)
      OR LOWER(ApellidoMaterno) LIKE LOWER($1)
      OR LOWER(Email) LIKE LOWER($1)
      OR LOWER(rol) LIKE LOWER($1)

      UNION ALL

      SELECT 'Profesor' AS rol, idProfesor AS id, Nombres, ApellidoPaterno, ApellidoMaterno, Email, NumCelular, FechaDeNacimiento, Estado
      FROM Profesor
      WHERE LOWER(Nombres) LIKE LOWER($1)
      OR LOWER(ApellidoPaterno) LIKE LOWER($1)
      OR LOWER(ApellidoMaterno) LIKE LOWER($1)
      OR LOWER(Email) LIKE LOWER($1)

      UNION ALL

      SELECT 'Padre de Familia' AS rol, idPadre AS id, Nombres, ApellidoPaterno, ApellidoMaterno, Email, NumCelular, FechaDeNacimiento, Estado
      FROM PadreDeFamilia
      WHERE LOWER(Nombres) LIKE LOWER($1)
      OR LOWER(ApellidoPaterno) LIKE LOWER($1)
      OR LOWER(ApellidoMaterno) LIKE LOWER($1)
      OR LOWER(Email) LIKE LOWER($1)
    `;

    const values = [`%${searchTerm}%`];

    const { rows } = await pool.query(query, values);

    // Verificar si se encontraron usuarios
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No se encontraron usuarios.' });
    }

    // Enviar los resultados combinados al cliente
    res.json(rows);
  } catch (error) {
    console.error('Error al filtrar usuarios:', error);
    res.status(500).json({ error: 'Error al filtrar usuarios' });
  }
};




// Obtener todos los usuarios del sistema con nombres concatenados
export const getallUserEntry = async (req, res) => {
  try {
    const query = `
      SELECT 
        a.idAdministrador AS id, 
        'Administrador' AS rol, 
        CONCAT(a.Nombres, ' ', a.ApellidoPaterno, ' ', a.ApellidoMaterno) AS nombreCompleto,
        a.email, 
        a.NumCelular, 
        a.FechaDeNacimiento
      FROM Administrador a
      WHERE a.Estado = true

      UNION ALL

      SELECT 
        p.idProfesor AS id, 
        'Profesor' AS rol, 
        CONCAT(p.Nombres, ' ', p.ApellidoPaterno, ' ', p.ApellidoMaterno) AS nombreCompleto,
        p.email, 
        p.NumCelular, 
        p.FechaDeNacimiento
      FROM Profesor p
      WHERE p.Estado = true

      UNION ALL

      SELECT 
        ps.idPsicologo AS id, 
        'Psicologo' AS rol, 
        CONCAT(ps.Nombres, ' ', ps.ApellidoPaterno, ' ', ps.ApellidoMaterno) AS nombreCompleto,
        ps.email, 
        ps.NumCelular, 
        ps.FechaDeNacimiento
      FROM Psicologo ps
      WHERE ps.Estado = true;
    `;

    // Ejecutar la consulta
    const { rows } = await pool.query(query);

    // Enviar la respuesta con los datos
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener los usuarios:", error);
    res.status(500).json({ error: "Error al obtener los usuarios" });
  }
};

export const filterUsers = async (req, res) => {
  const { searchTerm } = req.query;

  // Validar que exista un término de búsqueda
  if (!searchTerm) {
    return res.status(400).json({ error: "Debe proporcionar un término de búsqueda." });
  }

  try {
    const query = `
      SELECT 
        'Administrador' AS rol, 
        a.idAdministrador AS id, 
        CONCAT(a.Nombres, ' ', a.ApellidoPaterno, ' ', a.ApellidoMaterno) AS nombreCompleto,
        a.email, 
        a.NumCelular, 
        a.FechaDeNacimiento
      FROM Administrador a
      WHERE a.Estado = true AND (
        LOWER(a.Nombres) LIKE LOWER($1) OR
        LOWER(a.ApellidoPaterno) LIKE LOWER($1) OR
        LOWER(a.ApellidoMaterno) LIKE LOWER($1) OR
        LOWER(a.email) LIKE LOWER($1)
      )

      UNION ALL

      SELECT 
        'Profesor' AS rol, 
        p.idProfesor AS id, 
        CONCAT(p.Nombres, ' ', p.ApellidoPaterno, ' ', p.ApellidoMaterno) AS nombreCompleto,
        p.email, 
        p.NumCelular, 
        p.FechaDeNacimiento
      FROM Profesor p
      WHERE p.Estado = true AND (
        LOWER(p.Nombres) LIKE LOWER($1) OR
        LOWER(p.ApellidoPaterno) LIKE LOWER($1) OR
        LOWER(p.ApellidoMaterno) LIKE LOWER($1) OR
        LOWER(p.email) LIKE LOWER($1)
      )

      UNION ALL

      SELECT 
        'Psicologo' AS rol, 
        ps.idPsicologo AS id, 
        CONCAT(ps.Nombres, ' ', ps.ApellidoPaterno, ' ', ps.ApellidoMaterno) AS nombreCompleto,
        ps.email, 
        ps.NumCelular, 
        ps.FechaDeNacimiento
      FROM Psicologo ps
      WHERE ps.Estado = true AND (
        LOWER(ps.Nombres) LIKE LOWER($1) OR
        LOWER(ps.ApellidoPaterno) LIKE LOWER($1) OR
        LOWER(ps.ApellidoMaterno) LIKE LOWER($1) OR
        LOWER(ps.email) LIKE LOWER($1)
      );
    `;

    const values = [`%${searchTerm}%`];
    const { rows } = await pool.query(query);

    // Validar si no se encontraron resultados
    if (rows.length === 0) {
      return res.status(404).json({ error: "No se encontraron usuarios." });
    }

    // Enviar los resultados encontrados
    res.json(rows);
  } catch (error) {
    console.error("Error al filtrar usuarios:", error);
    res.status(500).json({ error: "Error al filtrar usuarios." });
  }
};


export const registrarIngreso = async (req, res) => {
  const { idUsuario, nombreCompleto, rol, fechaIngreso, horaIngreso } = req.body;

  if (!idUsuario || !nombreCompleto || !rol || !fechaIngreso || !horaIngreso) {
    return res.status(400).json({ message: "Faltan datos para registrar el ingreso" });
  }

  try {
    await pool.query(
      `INSERT INTO Ingresos (idUsuario, nombreCompleto, rol, fechaIngreso, horaIngreso)
       VALUES ($1, $2, $3, $4, $5)`,
      [idUsuario, nombreCompleto, rol, fechaIngreso, horaIngreso]
    );

    res.status(201).json({ message: "Ingreso registrado exitosamente" });
  } catch (error) {
    console.error("Error al registrar el ingreso:", error);
    res.status(500).json({ message: "Error al registrar el ingreso" });
  }
};


export const obtenerIngresos = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT idUsuario, nombreCompleto, rol, fechaIngreso, horaIngreso 
       FROM Ingresos`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener los ingresos:', error);
    res.status(500).json({ message: 'Error al obtener los ingresos' });
  }
};



export const obtenerDatosUsuariosConIngresos = async (req, res) => {
  try {
    const query = `
  SELECT 
    i.idUsuario, 
    CONCAT(u.nombres, ' ', u.apellidopaterno, ' ', u.apellidomaterno) AS nombreCompleto,
    u.rol,
    i.fechaIngreso,
    i.horaIngreso
  FROM Ingresos i
  JOIN (
    SELECT 
      idAdministrador AS idUsuario, nombres, apellidopaterno, apellidomaterno, rol
    FROM Administrador
    WHERE estado = true
    UNION ALL
    SELECT 
      idProfesor AS idUsuario, nombres, apellidopaterno, apellidomaterno, rol
    FROM Profesor
    WHERE estado = true
    UNION ALL
    SELECT 
      idPsicologo AS idUsuario, nombres, apellidopaterno, apellidomaterno, rol
    FROM Psicologo
    WHERE estado = true
  ) u
  ON i.idUsuario = u.idUsuario;
`;
    const { rows } = await pool.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener los datos de usuarios con ingresos:', error);
    res.status(500).json({ message: 'Error al obtener los datos de usuarios con ingresos.' });
  }
};

export const obtenerIngresosPorRango = async (req, res) => {
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
      return res.status(400).json({ error: "Por favor, proporciona las fechas de inicio y fin." });
  }

  try {
      const query = `
          SELECT 
              nombrecompleto, 
              rol, 
              fechaingreso, 
              horaingreso
          FROM Ingresos
          WHERE fechaingreso BETWEEN $1 AND $2
          ORDER BY fechaingreso ASC, horaingreso ASC
      `;
      const { rows } = await pool.query(query, [startDate, endDate]);

      if (rows.length === 0) {
          return res.status(404).json({ error: "No se encontraron ingresos en el rango de fechas proporcionado." });
      }

      res.json(rows);
  } catch (error) {
      console.error("Error al obtener ingresos por rango de fechas:", error);
      res.status(500).json({ error: "Hubo un error al obtener los ingresos." });
  }
};


export const obtenerCantidadUsuariosConIngresos = async (req, res) => {
  try {
    const query = `
      SELECT COUNT(*) AS cantidad
      FROM Ingresos i
      JOIN (
        SELECT 
          idAdministrador AS idUsuario, nombres, apellidopaterno, apellidomaterno, rol
        FROM Administrador
        WHERE estado = true
        UNION ALL
        SELECT 
          idProfesor AS idUsuario, nombres, apellidopaterno, apellidomaterno, rol
        FROM Profesor
        WHERE estado = true
        UNION ALL
        SELECT 
          idPsicologo AS idUsuario, nombres, apellidopaterno, apellidomaterno, rol
        FROM Psicologo
        WHERE estado = true
      ) u
      ON i.idUsuario = u.idUsuario;
    `;

    const { rows } = await pool.query(query);
    const cantidad = rows[0]?.cantidad || 0; // Asegurarse de manejar valores null o undefined

    res.status(200).json({ cantidad });
  } catch (error) {
    console.error('Error al obtener la cantidad de usuarios con ingresos:', error);
    res.status(500).json({ message: 'Error al obtener la cantidad de usuarios con ingresos.' });
  }
};



// Listar todos los usuarios con estado false
export const listarUsuariosInactivos = async (req, res) => {
  try {
    const query = `
      SELECT 
        'Administrador' AS rol, 
        idAdministrador AS id, 
        Nombres, 
        ApellidoPaterno, 
        ApellidoMaterno, 
        Email, 
        NumCelular 
      FROM Administrador
      WHERE Estado = false

      UNION ALL

      SELECT 
        'Profesor' AS rol, 
        idProfesor AS id, 
        Nombres, 
        ApellidoPaterno, 
        ApellidoMaterno, 
        Email, 
        NumCelular 
      FROM Profesor
      WHERE Estado = false

      UNION ALL

      SELECT 
        'Psicologo' AS rol, 
        idPsicologo AS id, 
        Nombres, 
        ApellidoPaterno, 
        ApellidoMaterno, 
        Email, 
        NumCelular 
      FROM Psicologo
      WHERE Estado = false

      UNION ALL

      SELECT 
        'Padre de Familia' AS rol, 
        idPadre AS id, 
        Nombres, 
        ApellidoPaterno, 
        ApellidoMaterno, 
        Email, 
        NumCelular 
      FROM PadreDeFamilia
      WHERE Estado = false
    `;

    const { rows } = await pool.query(query);

    if (rows.length === 0) {
      return res.status(404).json({ message: "No hay usuarios inactivos." });
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al listar usuarios inactivos:", error);
    res.status(500).json({ error: "Error al listar usuarios inactivos." });
  }
};

// Cambiar el estado de un usuario a true
export const activarUsuario = async (req, res) => {
  const { id, rol } = req.body;

  if (!id || !rol) {
    return res.status(400).json({ error: "Faltan datos: id o rol del usuario." });
  }

  try {
    let tableName;

    // Determinar la tabla según el rol
    switch (rol) {
      case "Administrador":
        tableName = "Administrador";
        break;
      case "Profesor":
        tableName = "Profesor";
        break;
      case "Psicologo":
        tableName = "Psicologo";
        break;
      case "Padre de Familia":
        tableName = "PadreDeFamilia";
        break;
      default:
        return res.status(400).json({ error: "Rol no válido." });
    }

    // Actualizar el estado del usuario a true
    const query = `
      UPDATE ${tableName}
      SET Estado = true
      WHERE id${tableName} = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    res.status(200).json({ message: "Estado del usuario actualizado exitosamente." });
  } catch (error) {
    console.error("Error al actualizar el estado del usuario:", error);
    res.status(500).json({ error: "Error al actualizar el estado del usuario." });
  }
};