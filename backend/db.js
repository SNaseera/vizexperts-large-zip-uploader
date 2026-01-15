import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host: "mysql",
  user: "root",
  password: "root",
  database: "uploads",
  connectionLimit: 10
});
