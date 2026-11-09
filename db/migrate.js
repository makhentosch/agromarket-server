import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

// Миграция НЕ удаляет данные: создаёт только то, чего ещё нет.
// Её можно запускать сколько угодно раз — результат один и тот же.
// Колонки — один в один как в db/schema.sql (её выполняет db:init)
const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    role          VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(150)  NOT NULL,
    category   VARCHAR(50)   NOT NULL DEFAULT 'Разное',
    price      NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    unit       VARCHAR(20)   NOT NULL DEFAULT 'шт',
    image      TEXT,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    phone         VARCHAR(30),
    volume        INTEGER      NOT NULL CHECK (volume >= 10),
    delivery_date DATE,
    comment       TEXT,
    status        VARCHAR(20)  NOT NULL DEFAULT 'new',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
  )`,
];

async function migrate() {
  for (const sql of statements) {
    await pool.query(sql);
  }

  // Администратор: создаём, только если заданы данные и его ещё нет
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ('Администратор', $1, $2, 'admin')
       ON CONFLICT (email) DO NOTHING`,
      [ADMIN_EMAIL.trim().toLowerCase(), hash],
    );
  }

  console.log(`Миграция выполнена (инструкций: ${statements.length})`);
}

migrate()
  .catch((err) => {
    console.error('Миграция не удалась:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
