import { pool } from "../db.js";

// Obtener la cantidad de profesores activos
export const getActiveProfessorsCount = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT COUNT(*) AS total
      FROM profesor
      WHERE estado = true
    `);
    res.json({ total: parseInt(rows[0].total) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener la cantidad de profesores activos" });
  }
};

// Obtener la cantidad total de usuarios activos
export const getActiveUsersCount = async (req, res) => {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM profesor WHERE estado = true) AS profesores,
          (SELECT COUNT(*) FROM administrador WHERE estado = true) AS administradores,
          (SELECT COUNT(*) FROM psicologo WHERE estado = true) AS psicologos,
          (SELECT COUNT(*) FROM estudiante WHERE estado = true) AS estudiantes,
          (SELECT COUNT(*) FROM padredefamilia WHERE estado = true) AS padres
      `;
      const { rows } = await pool.query(query);
  
      // Asegurarnos de que obtenemos datos
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: "No se encontraron usuarios activos" });
      }
  
      const counts = rows[0];
      const total = Object.values(counts).reduce((acc, count) => acc + parseInt(count), 0);
  
      res.json({ counts, total });
    } catch (error) {
      console.error("Error al obtener la cantidad de usuarios activos:", error.message);
      res.status(500).json({ error: "Error al obtener la cantidad de usuarios activos" });
    }
  };




// Obtener entrevistas semanales
export const getWeeklyInterviews = async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT 
          EXTRACT(DOW FROM fecha) AS dia_semana,
          COUNT(*) AS total
        FROM reservarentrevista
        WHERE fecha >= NOW() - INTERVAL '7 days'
          AND EXTRACT(DOW FROM fecha) BETWEEN 1 AND 5  -- Solo de lunes a viernes
        GROUP BY dia_semana
        ORDER BY dia_semana
      `);
  
      // Formateamos los resultados para que el frontend los entienda
      const interviewCounts = Array(5).fill(0); // Inicializamos un array para lunes a viernes
  
      rows.forEach(row => {
        const dayIndex = parseInt(row.dia_semana) - 1; // Convertimos el día (1 = lunes) a índice (0)
        interviewCounts[dayIndex] = parseInt(row.total);
      });
  
      res.json(interviewCounts);
    } catch (error) {
      console.error("Error al obtener entrevistas semanales:", error);
      res.status(500).json({ error: "Error al obtener entrevistas semanales" });
    }
  };
  

// Obtener estado de entrevistas
export const getInterviewStatusCounts = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE estado = true) AS completadas,
        COUNT(*) FILTER (WHERE estado = false) AS no_realizadas
      FROM reservarentrevista
    `);
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el estado de entrevistas" });
  }
};


// Materia más demandada
export const getMostRequestedSubject = async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT m.nombre, COUNT(*)::integer AS cantidad
        FROM materia m
        JOIN reservarentrevista r ON m.idmateria = r.idmotivo
        WHERE m.estado = true
        GROUP BY m.nombre
        ORDER BY cantidad DESC
        LIMIT 5
      `);
  
      // Verifica que los datos devueltos sean un array
      if (Array.isArray(rows) && rows.length > 0) {
        const formattedData = rows.map(row => ({
          nombre: row.nombre,
          cantidad: parseInt(row.cantidad, 10)
        }));
        res.json(formattedData);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Error al obtener la materia más demandada:", error);
      res.status(500).json({ error: "Error al obtener la materia más demandada" });
    }
  };
  

// Profesor más demandado
export const getMostRequestedProfessor = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.nombres || ' ' || p.apellidopaterno AS profesor, COUNT(*) AS cantidad
      FROM profesor p
      JOIN reservarentrevista r ON p.idprofesor = r.idprofesor
      WHERE p.estado = true AND r.estado IS NOT NULL
      GROUP BY profesor
      ORDER BY cantidad DESC
      LIMIT 1
    `);
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el profesor más demandado" });
  }
};
