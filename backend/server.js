// Contract Tracker Backend (Express + PostgreSQL + JWT)
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import pkg from "pg";
const { Pool } = pkg;
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || "http://localhost:8080";
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

// PostgreSQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "contract_tracker",
  user: process.env.DB_USER || "contract_user",
  password: process.env.DB_PASSWORD || "contract_password",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const sendSlackNotification = async (payload) => {
  if (!SLACK_WEBHOOK_URL) return;
  try {
    await axios.post(SLACK_WEBHOOK_URL, payload);
  } catch (error) {
    console.error('Slack notification failed:', error.message);
  }
};

const createContractMessage = (title, contract, color = '#36a64f') => ({
  username: 'BCFM Contract Tracker',
  icon_emoji: ':cloud:',
  attachments: [{
    color: color,
    title: title,
    fields: [
      { title: 'Sözleşme', value: contract.name, short: true },
      { title: 'Takım', value: contract.team, short: true },
      { title: 'Sahip', value: contract.owner, short: true },
      { title: 'Süre', value: contract.duration === '6ay' ? '6 Ay' : '1 Yıl', short: true }
    ],
    footer: 'BCFM Agreement System',
    ts: Math.floor(Date.now() / 1000)
  }]
});

app.use(
  cors({
    origin: FRONT_ORIGIN,
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(cookieParser());

let pool;
async function initDB() {
  pool = new Pool(dbConfig);
  
  // Test connection
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected successfully');
  } finally {
    client.release();
  }

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      display_name VARCHAR(255)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Aktif',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      duration VARCHAR(50) NOT NULL,
      scope JSONB,
      team VARCHAR(255) NOT NULL,
      owner VARCHAR(255) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contract_history (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      contract_name VARCHAR(255) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      amount DECIMAL(15,2),
      currency VARCHAR(10) DEFAULT 'TL',
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS revenue_history (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'TL',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date);
    CREATE INDEX IF NOT EXISTS idx_revenue_history_customer_year ON revenue_history(customer_id, year);
  `);

  // Check if users exist and create default admin
  const result = await pool.query('SELECT COUNT(*) as c FROM users');
  if (parseInt(result.rows[0].c) === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    await pool.query(
      'INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3)',
      ["admin@example.com", hash, "Admin"]
    );
    console.log("✅ Default user: admin@example.com / admin123");
  }

  console.log('✅ PostgreSQL database initialized');
}

function auth(req, res, next) {
  const t = req.cookies?.token;
  if (!t) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(t, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// ---- health
app.get("/api/health", (req, res) => res.json({ ok: true }));


// ---- auth
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Missing fields" });
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const u = result.rows[0];
  if (!u) return res.status(401).json({ error: "Login failed" });
  if (!bcrypt.compareSync(password, u.password_hash)) return res.status(401).json({ error: "Login failed" });

  const token = jwt.sign({ id: u.id, email: u.email }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
  res.json({ ok: true, user: { id: u.id, email: u.email, displayName: u.display_name } });
});

app.post("/api/logout", (req, res) => {
  res.cookie("token", "", { expires: new Date(0) });
  res.json({ ok: true });
});

app.get("/api/me", auth, async (req, res) => {
  const result = await pool.query('SELECT id, email, display_name FROM users WHERE id = $1', [req.user.id]);
  const u = result.rows[0];
  res.json({ ok: true, user: { id: u.id, email: u.email, displayName: u.display_name } });
});

// ---- customers (name unique)
app.get("/api/customers", auth, async (req, res) => {
  const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
  res.json(result.rows);
});

app.post("/api/customers", auth, async (req, res) => {
  const { name, status } = req.body || {};
  if (!name) return res.status(400).json({ error: "Missing customer name" });
  try {
    const result = await pool.query(
      'INSERT INTO customers (name, status) VALUES ($1, $2) RETURNING *',
      [name.trim(), status || "Aktif"]
    );
    res.json(result.rows[0]);
  } catch (e) {
    if (e.code === '23505') // unique_violation
      return res.status(409).json({ error: "Müşteri zaten var" });
    throw e;
  }
});

app.put("/api/customers/:id", auth, async (req, res) => {
  const { name, status } = req.body || {};
  try {
    const result = await pool.query(
      'UPDATE customers SET name=$1, status=$2 WHERE id=$3 RETURNING *',
      [name, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Customer update error:', e);
    res.status(500).json({ error: "Failed to update customer" });
  }
});

app.delete("/api/customers/:id", auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('Customer deletion error:', e);
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

app.post("/api/customers/sync", auth, async (req, res) => {
  try {
    const contracts = await pool.query('SELECT DISTINCT name FROM contracts');
    let added = 0;
    for (const c of contracts.rows) {
      try {
        await pool.query(
          'INSERT INTO customers (name, status) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
          [c.name, 'Aktif']
        );
        added++;
      } catch (e) {
        // ignore duplicates
      }
    }
    res.json({ added });
  } catch (e) {
    console.error('Sync error:', e);
    res.status(500).json({ error: "Sync failed" });
  }
});

// ---- contracts
app.get("/api/contracts", auth, async (req, res) => {
  const result = await pool.query('SELECT * FROM contracts ORDER BY created_at DESC');
  const rows = result.rows;
  rows.forEach((r) => {
    try { r.scope = r.scope ? (typeof r.scope === 'string' ? JSON.parse(r.scope) : r.scope) : []; } catch { r.scope = []; }
    r.startDate = r.start_date;
    r.endDate = r.end_date;
  });
  res.json(rows);
});

app.post("/api/contracts", auth, async (req, res) => {
  const { name, duration, scope, team, owner, startDate, endDate, notes } = req.body || {};
  if (!name || !duration || !team || !owner || !startDate || !endDate)
    return res.status(400).json({ error: "Missing required fields" });

  const s = Array.isArray(scope) ? scope : [];
  try {
    const result = await pool.query(
      'INSERT INTO contracts (name, duration, scope, team, owner, start_date, end_date, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name.trim(), duration, JSON.stringify(s), team, owner, startDate, endDate, notes || '']
    );
    const row = result.rows[0];
    row.scope = s;
    
    await sendSlackNotification(createContractMessage('Yeni Sözleşme Oluşturuldu', row));
    
    res.json(row);
  } catch (e) {
    console.error('Contract creation error:', e);
    res.status(500).json({ error: "Failed to create contract" });
  }
});

app.put("/api/contracts/:id", auth, async (req, res) => {
  const { name, duration, scope, team, owner, startDate, endDate, notes } = req.body || {};
  const s = Array.isArray(scope) ? scope : [];
  try {
    const result = await pool.query(
      'UPDATE contracts SET name=$1, duration=$2, scope=$3, team=$4, owner=$5, start_date=$6, end_date=$7, notes=$8, updated_at=NOW() WHERE id=$9 RETURNING *',
      [name, duration, JSON.stringify(s), team, owner, startDate, endDate, notes || '', req.params.id]
    );
    const row = result.rows[0];
    if (row) row.scope = s;
    res.json(row);
  } catch (e) {
    console.error('Contract update error:', e);
    res.status(500).json({ error: "Failed to update contract" });
  }
});

app.delete("/api/contracts/:id", auth, async (req, res) => {
  try {
    // Get contract info before deletion for Slack notification
    const contractResult = await pool.query('SELECT * FROM contracts WHERE id = $1', [req.params.id]);
    const contract = contractResult.rows[0];
    
    await pool.query('DELETE FROM contracts WHERE id = $1', [req.params.id]);
    
    // Send Slack notification
    if (contract) {
      await sendSlackNotification(createContractMessage('Sözleşme Silindi', contract, '#ff0000'));
    }
    
    res.json({ ok: true });
  } catch (e) {
    console.error('Contract deletion error:', e);
    res.status(500).json({ error: "Failed to delete contract" });
  }
});

// ---- revenue history
app.get("/api/revenue-history", auth, async (req, res) => {
  const result = await pool.query(`
    SELECT rh.*, c.name as customer_name 
    FROM revenue_history rh 
    JOIN customers c ON rh.customer_id = c.id 
    ORDER BY rh.year DESC, rh.created_at DESC
  `);
  res.json(result.rows);
});

app.post("/api/revenue-history", auth, async (req, res) => {
  const { customerId, year, amount, currency } = req.body || {};
  if (!customerId || !year || !amount) return res.status(400).json({ error: "Missing required fields" });
  
  try {
    const result = await pool.query(
      'INSERT INTO revenue_history (customer_id, year, amount, currency) VALUES ($1, $2, $3, $4) RETURNING *',
      [customerId, year, amount, currency || 'TL']
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Revenue history creation error:', e);
    res.status(500).json({ error: "Failed to create revenue history" });
  }
});

app.put("/api/revenue-history/:id", auth, async (req, res) => {
  const { year, amount, currency } = req.body || {};
  try {
    const result = await pool.query(
      'UPDATE revenue_history SET year=$1, amount=$2, currency=$3 WHERE id=$4 RETURNING *',
      [year, amount, currency, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Revenue history update error:', e);
    res.status(500).json({ error: "Failed to update revenue history" });
  }
});

app.delete("/api/revenue-history/:id", auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM revenue_history WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('Revenue history deletion error:', e);
    res.status(500).json({ error: "Failed to delete revenue history" });
  }
});

// ---- analytics
app.get("/api/analytics/contracts-by-team", auth, async (req, res) => {
  const result = await pool.query(`
    SELECT team, COUNT(*) as count 
    FROM contracts 
    GROUP BY team 
    ORDER BY count DESC
  `);
  res.json(result.rows);
});

// ---- contract history
app.get("/api/contract-history/:customerId", auth, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM contract_history WHERE customer_id = $1 ORDER BY start_date DESC',
    [req.params.customerId]
  );
  res.json(result.rows);
});

app.post("/api/contract-history", auth, async (req, res) => {
  const { customerId, contractName, startDate, endDate, amount, currency, notes } = req.body || {};
  if (!customerId || !contractName || !startDate || !endDate) 
    return res.status(400).json({ error: "Missing required fields" });
  
  try {
    const result = await pool.query(
      'INSERT INTO contract_history (customer_id, contract_name, start_date, end_date, amount, currency, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [customerId, contractName, startDate, endDate, amount || 0, currency || 'TL', notes || '']
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Contract history creation error:', e);
    res.status(500).json({ error: "Failed to create contract history" });
  }
});

app.delete("/api/contract-history/:id", auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM contract_history WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('Contract history deletion error:', e);
    res.status(500).json({ error: "Failed to delete contract history" });
  }
});

// ---- contract notes
app.get("/api/contract-notes/:contractId", auth, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM contract_notes WHERE contract_id = $1 ORDER BY created_at DESC',
    [req.params.contractId]
  );
  res.json(result.rows);
});

app.post("/api/contract-notes", auth, async (req, res) => {
  const { contractId, note } = req.body || {};
  if (!contractId || !note) 
    return res.status(400).json({ error: "Missing required fields" });
  
  try {
    const result = await pool.query(
      'INSERT INTO contract_notes (contract_id, note, created_by) VALUES ($1, $2, $3) RETURNING *',
      [contractId, note, req.user.email]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Contract note creation error:', e);
    res.status(500).json({ error: "Failed to create note" });
  }
});

app.delete("/api/contract-notes/:id", auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM contract_notes WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('Contract note deletion error:', e);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

app.get("/api/analytics/contracts-by-duration", auth, async (req, res) => {
  const result = await pool.query(`
    SELECT duration, COUNT(*) as count 
    FROM contracts 
    GROUP BY duration 
    ORDER BY count DESC
  `);
  res.json(result.rows);
});

app.get("/api/analytics/expiring-contracts", auth, async (req, res) => {
  const result = await pool.query(`
    SELECT * FROM contracts 
    WHERE end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    ORDER BY end_date ASC
  `);
  res.json(result.rows);
});

app.get("/api/analytics/revenue-by-year", auth, async (req, res) => {
  const result = await pool.query(`
    SELECT year, SUM(amount) as total_amount, currency
    FROM revenue_history 
    GROUP BY year, currency 
    ORDER BY year DESC
  `);
  res.json(result.rows);
});

initDB().then(() => {
  app.listen(PORT, () => console.log(`✅ Backend listening on :${PORT}`));
});