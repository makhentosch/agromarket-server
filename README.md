![CI](https://github.com/makhentosch/agromarket-server/actions/workflows/ci.yml/badge.svg)

# АгроМаркет — сервер (REST API)

Учебный интернет-магазин фермерских продуктов. Сервер на Node.js + Express + PostgreSQL:
каталог товаров, регистрация и вход по JWT, роли `user` / `admin`, оптовые заявки.

## Запуск

1. Установить зависимости: `npm install`
2. Создать базу `agromarket` в PostgreSQL (pgAdmin или `CREATE DATABASE agromarket;`)
3. Скопировать `.env.example` в `.env` и указать свой пароль от PostgreSQL и `JWT_SECRET`
4. Создать таблицы и заполнить базу: `npm run db:init` (**удаляет все данные!**)
5. Запустить сервер: `npm run dev` → `http://localhost:3000`

## API

| Метод и адрес | Доступ | Что делает |
|---|---|---|
| `GET /api/health` | все | проверка, что сервер работает |
| `GET /api/products` | все | каталог (фильтр `?category=Мёд`) |
| `GET /api/products/:id` | все | один товар, `404` — если нет |
| `POST /api/products` | admin | добавить товар |
| `PUT /api/products/:id` | admin | изменить товар |
| `DELETE /api/products/:id` | admin | удалить товар (`204`) |
| `POST /api/auth/register` | все | регистрация покупателя (`201`, `409` — e-mail занят) |
| `POST /api/auth/login` | все | вход, выдаёт JWT; не больше 5 неудачных попыток за 15 минут (`429`) |
| `GET /api/auth/me` | вошедший | данные текущего пользователя |
| `POST /api/orders` | все | оптовая заявка из формы на сайте |
| `GET /api/orders` | admin | список заявок |

Токен передаётся в заголовке `Authorization: Bearer <токен>`.
Без токена — `401`, с токеном без нужной роли — `403`.

## Безопасность

- пароли хранятся только в виде хеша bcrypt, `password_hash` никогда не отдаётся клиенту;
- роль при регистрации всегда `user` — поле `role` из тела запроса игнорируется;
- на неверный пароль и неизвестный e-mail сервер отвечает одинаково;
- `helmet`, CORS только для адреса фронтенда, лимит тела запроса 10 КБ;
- секреты — только в `.env`, который не попадает в Git.

## Тестирование
1. Создать базу `agromarket_test` (pgAdmin или psql)
2. Скопировать `.env` в `.env.test` и указать в нём тестовую базу
3. `npm test` — все тесты, `npm run test:watch` — режим наблюдения,
   `npm run coverage` — отчёт о покрытии (сейчас: Lines 81.56%)

Тесты сами пересоздают таблицы в `agromarket_test` перед запуском (`tests/globalSetup.js`)
и откажутся работать, если в настройках подключения нет слова `test` — рабочая база защищена.

## Правила работы с Git
- Ветка `main` защищена: изменения — только через Pull Request
- PR сливается после зелёного CI и одобрения ревьюера
- Ветки: `feature/...`, `fix/...`; коммиты: feat, fix, test, refactor, docs, ci, chore
