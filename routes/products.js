import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, adminOnly } from '../middleware/auth.js';
import { validate, idParam } from '../middleware/validate.js';
import { productSchema, productUpdateSchema } from '../validation/schemas.js';

const router = Router();

const COLUMNS = 'id, name, category, price, unit, image';

// GET /api/products?category=Мёд - каталог (доступен всем)
router.get('/', async (req, res) => {
  const { category } = req.query;
  const { rows } = category
    ? await pool.query(`SELECT ${COLUMNS} FROM products WHERE category = $1 ORDER BY id`, [category])
    : await pool.query(`SELECT ${COLUMNS} FROM products ORDER BY id`);
  res.json(rows);
});

// GET /api/products/:id - один товар
router.get('/:id', idParam, async (req, res) => {
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM products WHERE id = $1`, [req.params.id]);
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  res.json(rows[0]);
});

// POST /api/products - добавить товар (только admin)
router.post('/', requireAuth, adminOnly, validate(productSchema), async (req, res) => {
  const { name, category, price, unit = 'шт', image = null } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO products (name, category, price, unit, image)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNS}`,
    [name, category, price, unit, image],
  );
  res.status(201).json(rows[0]);
});

// PUT /api/products/:id - заменить товар целиком (только admin)
router.put('/:id', requireAuth, adminOnly, idParam, validate(productSchema), async (req, res) => {
  const { name, category, price, unit = 'шт', image = null } = req.body;
  const { rows } = await pool.query(
    `UPDATE products SET name = $1, category = $2, price = $3, unit = $4, image = $5
     WHERE id = $6
     RETURNING ${COLUMNS}`,
    [name, category, price, unit, image, req.params.id],
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  res.json(rows[0]);
});

// PATCH /api/products/:id - изменить отдельные поля (только admin)
router.patch('/:id', requireAuth, adminOnly, idParam, validate(productUpdateSchema), async (req, res) => {
  // Имена колонок берутся только из схемы, значения передаются параметрами $1, $2 ...
  const fields = Object.keys(req.body);
  const assignments = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
  const { rows } = await pool.query(
    `UPDATE products SET ${assignments} WHERE id = $${fields.length + 1} RETURNING ${COLUMNS}`,
    [...fields.map((field) => req.body[field]), req.params.id],
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  res.json(rows[0]);
});

// DELETE /api/products/:id - удалить товар (только admin)
router.delete('/:id', requireAuth, adminOnly, idParam, async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
  if (rowCount === 0) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  res.status(204).end();
});

export default router;
