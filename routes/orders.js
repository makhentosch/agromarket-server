import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, adminOnly } from '../middleware/auth.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_VOLUME = 10;

// POST /api/orders - оптовая заявка из формы на сайте (доступна всем)
router.post('/', async (req, res) => {
  const { name, email, phone = null, volume, date = null, comment = null } = req.body ?? {};

  if (typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Укажите имя или организацию' });
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'Некорректный e-mail' });
  }
  if (!Number.isInteger(volume) || volume < MIN_VOLUME) {
    return res.status(400).json({ error: `Объём заказа - целое число от ${MIN_VOLUME} кг` });
  }

  const { rows } = await pool.query(
    `INSERT INTO orders (name, email, phone, volume, delivery_date, comment)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, email, phone, volume, delivery_date, comment, status, created_at`,
    [name.trim(), email.trim().toLowerCase(), phone || null, volume, date || null, comment || null],
  );
  res.status(201).json(rows[0]);
});

// GET /api/orders - все заявки (только admin)
router.get('/', requireAuth, adminOnly, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, phone, volume, delivery_date, comment, status, created_at
     FROM orders ORDER BY created_at DESC`,
  );
  res.json(rows);
});

export default router;
