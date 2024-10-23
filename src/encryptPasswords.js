import { pool } from "./db.js";
import bcrypt from "bcrypt";

// Función para encriptar contraseñas
async function encryptAndSave(user, tableName, idColumn) {
  // Si la contraseña es null o undefined, la omitimos
  if (!user.contrasenia) {
    console.log(`El usuario con id ${user[idColumn]} no tiene contraseña asignada.`);
    return;
  }

  // Verificamos si la contraseña ya está encriptada
  if (!user.contrasenia.startsWith("$2b$")) {
    const hashedPassword = await bcrypt.hash(user.contrasenia, 10);
    console.log(`Contraseña encriptada para ${tableName} con id: ${user[idColumn]}`);

    const updateQuery = `UPDATE ${tableName} SET contrasenia = $1 WHERE ${idColumn} = $2`;
    await pool.query(updateQuery, [hashedPassword, user[idColumn]]);
  } else {
    console.log(`Contraseña ya estaba encriptada para ${tableName} con id: ${user[idColumn]}`);
  }
}

// Función principal para encriptar las contraseñas en todas las tablas
async function encryptPasswords() {
  try {
    const tables = [
      { name: "administrador", idColumn: "idadministrador" }, // Usar nombre exacto del ID en la base de datos
      { name: "profesor", idColumn: "idprofesor" },
      { name: "psicologo", idColumn: "idpsicologo" },
      { name: "padredefamilia", idColumn: "idpadre" }
    ];

    for (const table of tables) {
      const { name, idColumn } = table;
      const users = await pool.query(`SELECT ${idColumn}, contrasenia FROM ${name}`);

      console.log(`Procesando tabla ${name}`);
      for (const user of users.rows) {
        console.log(user); // Verifica que los datos obtenidos de la base de datos sean correctos
        await encryptAndSave(user, name, idColumn);
      }
    }

    console.log("Proceso de encriptación completado.");
  } catch (error) {
    console.error("Error al cifrar las contraseñas:", error);
  }
}

encryptPasswords();
