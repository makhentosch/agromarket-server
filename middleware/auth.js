import jwt from 'jsonwebtoken';

// Проверяет JWT из заголовка Authorization: Bearer <токен>
// и кладёт в req.user { id, role }
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: Number(payload.sub), role: payload.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Срок действия токена истёк, войдите снова' });
    }
    return res.status(401).json({ error: 'Недействительный токен' });
  }
}

// Пропускает дальше только пользователей с одной из указанных ролей.
// Подключается после requireAuth
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    next();
  };
}

export const adminOnly = requireRole('admin');
