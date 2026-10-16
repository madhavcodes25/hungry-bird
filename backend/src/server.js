require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => { req.body ??= {}; next(); }); 

app.get('/health', async (req, res) => {
  await pool.query('SELECT 1');           
  res.json({ status: 'ok' });
});
app.use('/auth', require('./routes/auth.js'));
app.use('/restaurants', require('./routes/restaurants'));
app.use('/menu', require('./routes/menu'));

app.use((req, res) => res.status(404).json({ error: 'route not found' }));

app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));