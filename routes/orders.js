import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, adminOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { orderSchema } from '../validation/schemas.js';

const router = Router();

// POST /api/orders - оптовая заявка из формы на сайте (доступна всем)
router.post('/', validate(orderSchema), async (req, res) => {
  const { name, email, phone, volume, date, comment } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO orders (name, email, phone, volume, delivery_date, comment)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, email, phone, volume, delivery_date, comment, status, created_at`,
    [name, email, phone || null, volume, date || null, comment || null],
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
