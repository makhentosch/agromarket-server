import pg from 'pg';

// Один пул подключений на всё приложение.
// Адрес базы — из переменной окружения DATABASE_URL (.env)
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
