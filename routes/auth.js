import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validation/schemas.js';

const router = Router();

function createToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
  });
}

// POST /api/auth/register - регистрация покупателя
router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  // name и email уже очищены схемой: обрезаны пробелы, e-mail в нижнем регистре
  const { name, email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  try {
    // Роль всегда 'user': поля role нет в схеме, zod его отбросил (защита от mass assignment)
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, name, email, role`,
      [name, email, hash],
    );
    const user = rows[0];
    res.status(201).json({ token: createToken(user), user });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Пользователь с таким e-mail уже зарегистрирован' });
    }
    throw err;
  }
});

// POST /api/auth/login - вход по e-mail и паролю
router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const { rows } = await pool.query(
    'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
    [email],
  );
  const found = rows[0];
  const ok = found && (await bcrypt.compare(password, found.password_hash));

  // Одинаковый ответ для неизвестного e-mail и неверного пароля:
  // так нельзя узнать, зарегистрирован ли адрес
  if (!ok) {
    return res.status(401).json({ error: 'Неверный e-mail или пароль' });
  }

  const { password_hash, ...user } = found;
  res.json({ token: createToken(user), user });
});

// GET /api/auth/me - данные текущего пользователя по токену
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [req.user.id],
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  res.json(rows[0]);
});

export default router;
