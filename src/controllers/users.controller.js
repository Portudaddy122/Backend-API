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
