
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.VITE_DB_URL,
  authToken: process.env.VITE_DB_TOKEN
});

async function fix() {
  try {
    const res = await client.execute("UPDATE weeks SET created_at = datetime('now') WHERE created_at IS NULL");
    console.log("Filas actualizadas:", res.rowsAffected);
  } catch (err) {
    console.error(err);
  }
}
fix();
