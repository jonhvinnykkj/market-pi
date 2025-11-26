import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Test database connection
pool.query('SELECT NOW()')
  .then(() => console.log('Database connected successfully'))
  .catch(err => console.error('Database connection error:', err));

// Helper function to parse filters
const parseFilter = (raw) => {
  if (typeof raw !== 'string') return { op: 'eq', value: raw };
  const m = raw.match(/^(\w+)\.(.*)$/);
  if (m) return { op: m[1], value: m[2] };
  return { op: 'eq', value: raw };
};

// API Routes
app.get('/api/:table', async (req, res) => {
  const { table } = req.params;
  try {
    const select = req.query.select || '*';
    const params = [];
    let idx = 1;
    const where = [];

    for (const key of Object.keys(req.query)) {
      if (key === 'select') continue;
      const { op, value } = parseFilter(req.query[key]);
      if (op === 'eq') {
        where.push(`${key} = $${idx++}`);
        params.push(value);
      } else if (op === 'neq') {
        where.push(`${key} != $${idx++}`);
        params.push(value);
      } else if (op === 'lte') {
        where.push(`${key} <= $${idx++}`);
        params.push(value);
      } else if (op === 'gte') {
        where.push(`${key} >= $${idx++}`);
        params.push(value);
      }
    }

    const q = `SELECT ${select} FROM ${table}${where.length ? ' WHERE ' + where.join(' AND ') : ''}`;
    const result = await pool.query(q, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
});

app.post('/api/:table', async (req, res) => {
  const { table } = req.params;
  try {
    const body = req.body;
    const rows = Array.isArray(body) ? body : [body];
    const inserted = [];
    for (const row of rows) {
      const cols = Object.keys(row);
      const vals = Object.values(row);
      const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
      const q = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`;
      const r = await pool.query(q, vals);
      inserted.push(r.rows[0]);
    }
    res.json(inserted.length === 1 ? inserted[0] : inserted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
});

app.patch('/api/:table', async (req, res) => {
  const { table } = req.params;
  try {
    const body = req.body || {};
    const filterKeys = Object.keys(req.query).filter(k => k !== 'select');
    if (filterKeys.length === 0) return res.status(400).json({ error: 'Missing filter for update' });

    const setCols = Object.keys(body);
    if (setCols.length === 0) return res.status(400).json({ error: 'Missing body for update' });

    const params = [];
    let idx = 1;
    const setClause = setCols.map((c) => `${c} = $${idx++}`).join(', ');
    params.push(...setCols.map(c => body[c]));

    const where = [];
    for (const key of filterKeys) {
      const { op, value } = parseFilter(req.query[key]);
      if (op === 'eq') {
        where.push(`${key} = $${idx++}`);
        params.push(value);
      }
    }

    const q = `UPDATE ${table} SET ${setClause} WHERE ${where.join(' AND ')} RETURNING *`;
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
});

app.delete('/api/:table', async (req, res) => {
  const { table } = req.params;
  try {
    const filterKeys = Object.keys(req.query).filter(k => k !== 'select');
    if (filterKeys.length === 0) return res.status(400).json({ error: 'Missing filter for delete' });
    const params = [];
    let idx = 1;
    const where = [];
    for (const key of filterKeys) {
      const { op, value } = parseFilter(req.query[key]);
      if (op === 'eq') {
        where.push(`${key} = $${idx++}`);
        params.push(value);
      }
    }
    const q = `DELETE FROM ${table} WHERE ${where.join(' AND ')} RETURNING *`;
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
});

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const user = result.rows[0];
    const session = { access_token: `token_${Date.now()}`, user_id: user.id };
    res.json({ session, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
});

// Serve static files from the dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// Handle client-side routing - serve index.html for all non-API routes
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
