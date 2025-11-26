import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Criar pasta de uploads se não existir
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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

// Mapeamento de relacionamentos (foreign keys)
const relationships = {
  products: {
    categories: { foreignKey: 'category_id', targetTable: 'categories' },
    suppliers: { foreignKey: 'supplier_id', targetTable: 'suppliers' },
  },
  stock_movements: {
    products: { foreignKey: 'product_id', targetTable: 'products' },
    profiles: { foreignKey: 'user_id', targetTable: 'profiles' },
  },
  audit_logs: {
    profiles: { foreignKey: 'user_id', targetTable: 'profiles' },
  },
};

// Parser para o select do Supabase (ex: "*, categories (id, name)")
function parseSupabaseSelect(selectStr, table) {
  const relations = [];
  const mainColumns = [];

  // Remove whitespace excessivo
  const cleaned = selectStr.replace(/\s+/g, ' ').trim();

  // Regex para encontrar relações: nome_tabela (colunas)
  const relationRegex = /(\w+)\s*\(([^)]+)\)/g;
  let match;
  let lastIndex = 0;
  let tempStr = cleaned;

  while ((match = relationRegex.exec(cleaned)) !== null) {
    const relationName = match[1];
    const relationColumns = match[2].split(',').map(c => c.trim());

    if (relationships[table] && relationships[table][relationName]) {
      relations.push({
        name: relationName,
        columns: relationColumns,
        ...relationships[table][relationName],
      });
    }

    // Remove a relação da string para pegar as colunas principais
    tempStr = tempStr.replace(match[0], '');
  }

  // Pega as colunas principais (o que sobrou)
  const mainColsStr = tempStr.replace(/,\s*,/g, ',').replace(/^,|,$/g, '').trim();
  if (mainColsStr) {
    mainColsStr.split(',').forEach(col => {
      const trimmed = col.trim();
      if (trimmed && trimmed !== '') {
        mainColumns.push(trimmed);
      }
    });
  }

  return { mainColumns, relations };
}

// Servir arquivos de upload
app.use('/uploads', express.static(uploadsDir));

// Upload de imagens (base64) - DEVE vir antes das rotas genéricas
app.post('/api/upload', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { file, filename } = req.body;

    if (!file || !filename) {
      return res.status(400).json({ error: 'File and filename required' });
    }

    // Decodificar base64
    const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Gerar nome único
    const ext = path.extname(filename) || '.jpg';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const filePath = path.join(uploadsDir, uniqueName);

    // Salvar arquivo
    fs.writeFileSync(filePath, buffer);

    // Retornar URL pública
    const publicUrl = `/uploads/${uniqueName}`;
    res.json({ url: publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: String(error) });
  }
});

// Auth routes - DEVE vir antes das rotas genéricas
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM profiles WHERE username = $1 AND password_hash = $2',
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

// Generic API Routes (tables)
app.get('/api/:table', async (req, res) => {
  const { table } = req.params;
  try {
    const selectRaw = req.query.select || '*';
    const { mainColumns, relations } = parseSupabaseSelect(selectRaw, table);

    const params = [];
    let idx = 1;
    const where = [];
    let orderClause = '';

    for (const key of Object.keys(req.query)) {
      if (key === 'select' || key === 'count') continue;
      if (key === 'order') {
        const orderParts = req.query[key].split('.');
        const orderCol = orderParts[0];
        const orderDir = orderParts[1] === 'desc' ? 'DESC' : 'ASC';
        orderClause = ` ORDER BY ${table}.${orderCol} ${orderDir}`;
        continue;
      }
      const { op, value } = parseFilter(req.query[key]);
      if (op === 'eq') {
        where.push(`${table}.${key} = $${idx++}`);
        params.push(value);
      } else if (op === 'neq') {
        where.push(`${table}.${key} != $${idx++}`);
        params.push(value);
      } else if (op === 'lte') {
        where.push(`${table}.${key} <= $${idx++}`);
        params.push(value);
      } else if (op === 'gte') {
        where.push(`${table}.${key} >= $${idx++}`);
        params.push(value);
      }
    }

    // Construir SELECT com as colunas principais
    let selectClause = mainColumns.length > 0
      ? mainColumns.map(c => c === '*' ? `${table}.*` : `${table}.${c}`).join(', ')
      : `${table}.*`;

    // Adicionar colunas das relações como JSON
    const joins = [];
    relations.forEach(rel => {
      const relCols = rel.columns.map(c => `'${c}', ${rel.targetTable}.${c}`).join(', ');
      selectClause += `, json_build_object(${relCols}) as ${rel.name}`;
      joins.push(`LEFT JOIN ${rel.targetTable} ON ${table}.${rel.foreignKey} = ${rel.targetTable}.id`);
    });

    const q = `SELECT ${selectClause} FROM ${table} ${joins.join(' ')}${where.length ? ' WHERE ' + where.join(' AND ') : ''}${orderClause}`;

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

// Serve static files from the dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// Handle client-side routing - serve index.html for all non-API routes
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
