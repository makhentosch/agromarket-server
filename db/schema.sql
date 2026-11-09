-- Схема базы «АгроМаркета». Выполняется командой npm run db:init
-- ВНИМАНИЕ: таблицы удаляются и создаются заново, все данные пропадают

DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role          VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(150)  NOT NULL,
  category   VARCHAR(50)   NOT NULL DEFAULT 'Разное',
  price      NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  unit       VARCHAR(20)   NOT NULL DEFAULT 'шт',
  image      TEXT,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Оптовые заявки из формы на сайте
CREATE TABLE orders (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  phone         VARCHAR(30),
  volume        INTEGER      NOT NULL CHECK (volume >= 10),
  delivery_date DATE,
  comment       TEXT,
  status        VARCHAR(20)  NOT NULL DEFAULT 'new',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
