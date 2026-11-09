import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, adminOnly } from '../middleware/auth.js';

const router = Router();

const COLUMNS = 'id, name, category, price, unit, image';

// id из адреса: только целое положительное число
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Проверка тела запроса для создания и изменения товара
function validateProduct(body) {
  const { name, price } = body ?? {};
  if (typeof name !== 'string' || name.trim() === '') {
    return 'Укажите название товара';
  }
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
    return 'Цена должна быть неотрицательным числом';
  }
  return null;
}

// GET /api/products?category=Мёд - каталог (доступен всем)
router.get('/', async (req, res) => {
  const { category } = req.query;
  const { rows } = category
    ? await pool.query(`SELECT ${COLUMNS} FROM products WHERE category = $1 ORDER BY id`, [category])
    : await pool.query(`SELECT ${COLUMNS} FROM products ORDER BY id`);
  res.json(rows);
});

// GET /api/products/:id - один товар
router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Некорректный id' });
  }
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM products WHERE id = $1`, [id]);
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  res.json(rows[0]);
});

// POST /api/products - добавить товар (только admin)
router.post('/', requireAuth, adminOnly, async (req, res) => {
  const error = validateProduct(req.body);
  if (error) {
    return res.status(400).json({ error });
  }
  const { name, category = 'Разное', price, unit = 'шт', image = null } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO products (name, category, price, unit, image)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNS}`,
    [name.trim(), category, price, unit, image],
  );
  res.status(201).json(rows[0]);
});

// PUT /api/products/:id - изменить товар (только admin)
router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Некорректный id' });
  }
  const error = validateProduct(req.body);
  if (error) {
    return res.status(400).json({ error });
  }
  const { name, category = 'Разное', price, unit = 'шт', image = null } = req.body;
  const { rows } = await pool.query(
    `UPDATE products SET name = $1, category = $2, price = $3, unit = $4, image = $5
     WHERE id = $6
     RETURNING ${COLUMNS}`,
    [name.trim(), category, price, unit, image, id],
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  res.json(rows[0]);
});

// DELETE /api/products/:id - удалить товар (только admin)
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Некорректный id' });
  }
  const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [id]);
  if (rowCount === 0) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  res.status(204).end();
});

export default router;
