import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import { logger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json({ limit: '10kb' }));

// В тестах лог каждого запроса только мешает читать результат
if (process.env.NODE_ENV !== 'test') {
  app.use(logger);
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);

// Неизвестный адрес
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

app.use(errorHandler); // обработчик ошибок — по-прежнему последним

export default app; // приложение БЕЗ запуска сервера
