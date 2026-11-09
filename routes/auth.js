import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// Не больше 5 неудачных попыток входа за 15 минут с одного IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Слишком много попыток входа. Попробуйте через 15 минут' },
});

function createToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
  });
}

// POST /api/auth/register - регистрация покупателя
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body ?? {};

  if (typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Укажите имя' });
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'Некорректный e-mail' });
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Пароль - не меньше ${MIN_PASSWORD_LENGTH} символов` });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const hash = await bcrypt.hash(password, 10);

  try {
    // Роль всегда 'user': поле role из тела запроса не используется (защита от mass assignment)
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, name, email, role`,
      [name.trim(), normalizedEmail, hash],
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
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Укажите e-mail и пароль' });
  }

  const { rows } = await pool.query(
    'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
    [email.trim().toLowerCase()],
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
