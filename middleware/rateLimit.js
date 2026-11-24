import rateLimit from 'express-rate-limit';

// Защита от перебора паролей и массовой регистрации:
// вход и регистрация вместе - не больше 10 попыток за 15 минут с одного IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // окно 15 минут
  limit: 10,                // не больше 10 попыток с одного IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Слишком много попыток. Попробуйте через 15 минут' },
  skip: () => process.env.NODE_ENV === 'test', // тесты ЛР8 не должны упираться в лимит
});
