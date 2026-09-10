/* Pool MySQL partagé + aides de requête */
const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  dateStrings: ['DATE'],
  namedPlaceholders: false
});

/* Toutes les lignes */
const tous = async (sql, params = []) => {
  const [lignes] = await pool.query(sql, params);
  return lignes;
};

/* Première ligne, ou null */
const un = async (sql, params = []) => {
  const lignes = await tous(sql, params);
  return lignes[0] || null;
};

/* INSERT / UPDATE / DELETE — renvoie le ResultSetHeader */
const executer = async (sql, params = []) => {
  const [res] = await pool.query(sql, params);
  return res;
};

/* Transaction : la callback reçoit la connexion */
const transaction = async fn => {
  const cx = await pool.getConnection();
  try {
    await cx.beginTransaction();
    const r = await fn(cx);
    await cx.commit();
    return r;
  } catch (e) {
    await cx.rollback();
    throw e;
  } finally {
    cx.release();
  }
};

module.exports = { pool, tous, un, executer, transaction };
