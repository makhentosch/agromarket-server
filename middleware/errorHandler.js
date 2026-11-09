// Общий обработчик ошибок — подключается последним.
// Подробности пишем в консоль сервера, клиенту — только общий текст
export function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Некорректный JSON в теле запроса' });
  }
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
}
