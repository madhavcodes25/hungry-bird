require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const app = express();
// In production set CORS_ORIGIN to your frontend address (comma-separate several). Unset allows any origin.
app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) } : undefined));
app.use(express.json());
app.use((req, res, next) => { req.body ??= {}; next(); });  

app.get('/health', async (req, res) => {
  await pool.query('SELECT 1');            // proves the database connection works
  res.json({ status: 'ok' });
});
app.use('/auth', require('./routes/auth'));
app.use('/restaurants', require('./routes/restaurants'));
app.use('/menu', require('./routes/menu'));
app.use('/orders', require('./routes/orders'));
app.use('/deliveries', require('./routes/deliveries'));
app.use('/requests', require('./routes/requests'));
app.use('/ratings', require('./routes/ratings'));
app.use('/admin', require('./routes/admin'));

app.use((req, res) => res.status(404).json({ error: 'route not found' }));

app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
