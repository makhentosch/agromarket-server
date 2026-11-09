// Обработчик ошибок Express — ровно 4 параметра, иначе Express его не узнает
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  console.error(`[${req.method} ${req.originalUrl}]`, err); // в лог — всё

  // Битый JSON в теле запроса: понятный текст вместо сообщения парсера
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Некорректный JSON в теле запроса' });
  }

  const isProd = process.env.NODE_ENV === 'production';
  res.status(status).json({
    // наружу: для 5xx в продакшене — только общая фраза
    error: status >= 500 && isProd ? 'Внутренняя ошибка сервера' : err.message,
  });
}
