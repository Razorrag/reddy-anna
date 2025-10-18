import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'anna_user',
  password: process.env.DB_PASSWORD || 'annareddy10987',
  database: process.env.DB_NAME || 'annar_db',
  connectionLimit: 10
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export default pool;



