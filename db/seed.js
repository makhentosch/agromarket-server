import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

// --- Предохранитель: db:init УДАЛЯЕТ ВСЕ ТАБЛИЦЫ ---
// Разрешаем без вопросов только локальную базу (и базу CI — она тоже localhost)
const target = process.env.DATABASE_URL || process.env.PGHOST || '';
const isLocal = /localhost|127\.0\.0\.1/.test(target);
if (!isLocal && !process.argv.includes('--force')) {
  console.error('Отказ: db:init запущен НЕ на локальной базе — все данные будут удалены.');
  console.error('Если база пустая и вы уверены: node db/seed.js --force');
  process.exit(1);
}

// Пересоздаёт таблицы и заполняет базу начальными данными: npm run db:init

const products = [
  ['Картофель', 'Овощи', 350, 'кг'],
  ['Морковь', 'Овощи', 300, 'кг'],
  ['Помидоры', 'Овощи', 1200, 'кг'],
  ['Огурцы', 'Овощи', 900, 'кг'],
  ['Яблоки апорт', 'Фрукты', 800, 'кг'],
  ['Мёд натуральный', 'Мёд', 4500, 'л'],
  ['Мёд гречишный', 'Мёд', 5200, 'л'],
  ['Молоко фермерское', 'Молочное', 600, 'л'],
  ['Сметана 20%', 'Молочное', 1100, 'кг'],
  ['Яйца деревенские', 'Яйца', 900, 'дес'],
  ['Пшеница твёрдая', 'Зерно', 150, 'кг'],
  ['Гречка', 'Зерно', 700, 'кг'],
];

async function seed() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error('Не заданы ADMIN_EMAIL и ADMIN_PASSWORD в .env');
  }

  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);

  for (const [name, category, price, unit] of products) {
    const image = `https://placehold.co/300x200?text=${encodeURIComponent(name)}`;
    await pool.query(
      'INSERT INTO products (name, category, price, unit, image) VALUES ($1, $2, $3, $4, $5)',
      [name, category, price, unit, image],
    );
  }

  const hash = await bcrypt.hash(adminPassword, 10);
  await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')",
    ['Администратор', adminEmail.trim().toLowerCase(), hash],
  );

  console.log(`Готово: товаров — ${products.length}, админ — ${adminEmail}`);
}

try {
  await seed();
} catch (err) {
  console.error('Ошибка db:init:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
