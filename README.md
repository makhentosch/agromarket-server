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
| `GET /api/health` | все | сервер и база работают; `version` — коммит, который развёрнут (`503`, если база недоступна) |
| `GET /api/products` | все | каталог (фильтр `?category=Мёд`) |
| `GET /api/categories` | все | категории и количество товаров в каждой |
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
   `npm run coverage` — отчёт о покрытии (сейчас: Lines 84.07%)

Тесты сами пересоздают таблицы в `agromarket_test` перед запуском (`tests/globalSetup.js`)
и откажутся работать, если в настройках подключения нет слова `test` — рабочая база защищена.

## Правила работы с Git
- Ветка `main` защищена: изменения — только через Pull Request
- PR сливается после зелёного CI и одобрения ревьюера
- Ветки: `feature/...`, `fix/...`; коммиты: feat, fix, test, refactor, docs, ci, chore

## Лабораторная 8 — ответы
- **Какие тесты упали, когда убрали adminOnly у POST, и почему:** упал один тест —
  `tests/access.test.js > Изменение каталога: только admin > покупатель — 403`
  с сообщением `AssertionError: expected 201 to be 403`. Без `adminOnly` у `router.post`
  остаётся только `requireAuth`: он проверяет, что токен настоящий, но не проверяет роль,
  поэтому покупатель с обычным токеном смог создать товар (201 вместо 403).
  Тесты «без токена — 401» и «чужой ключ — 401» остались зелёными — их по-прежнему ловит `requireAuth`.
- **Покрытие (Lines) и одна непокрытая строка — почему её не проверяет ни один тест:**
  Lines — 81.56%. Непокрытая строка `routes/auth.js:60` — `throw err;` в регистрации.
  До неё доходит только ошибка базы, отличная от нарушения уникальности e-mail (код `23505`
  обрабатывается строкой выше и даёт 409) — например, PostgreSQL недоступен. В тестах база всегда
  работает, поэтому эта ветка не выполняется; проверить её можно, подменив `pool.query`
  через `vi.spyOn(...).mockRejectedValueOnce(...)`. Ещё одна непокрытая часть — `routes/orders.js:12-30`
  (`POST /api/orders`) — была закрыта: в `access.test.js` добавлены тесты «заявка без токена — 201»
  и «объём меньше 10 кг — 400». У `middleware/logger.js` покрытие 0% — так задумано:
  при `NODE_ENV=test` `app.js` не подключает logger, ошибки в тестах нет.
- **Чем наш unit-тест requireRole отличается от интеграционного теста в access.test.js:**
  unit-тест (`tests/middleware.test.js`) вызывает одну функцию `requireRole('admin')` напрямую
  с поддельными `req`, `res` (методы — `vi.fn()`) и `next`, без Express, HTTP и базы — выполняется
  за миллисекунды и точно указывает на виновную функцию. Интеграционный тест отправляет настоящий
  HTTP-запрос через Supertest: Express → `requireAuth` → `adminOnly` → маршрут → PostgreSQL
  (`agromarket_test`) и проверяет систему целиком, включая выдачу токена при входе.
- **Какие замечания я получил(а) на code-review и что исправил(а):** TODO (заполнить самому)
- **Какие замечания я оставил(а) напарнику:** TODO (заполнить самому)
- **Использовал(а) ли ИИ и для чего:** TODO (заполнить самому)

## Продакшен
- Сайт: https://agromarket-makhentosch.vercel.app
- API: https://agromarket-api-makhentosch.onrender.com/api/health
- Схема: React (Vercel) → Express (Render, Frankfurt) → PostgreSQL (Neon, Frankfurt)

### Переменные окружения (значения — только в панелях сервисов)
| Переменная | Где задана | Секрет |
|---|---|---|
| DATABASE_URL | Render | да |
| JWT_SECRET | Render | да |
| JWT_EXPIRES_IN | Render | нет |
| NODE_ENV | Render | нет |
| CORS_ORIGIN | Render | нет |
| VITE_API_URL | Vercel | нет |
| RENDER_DEPLOY_HOOK_URL | GitHub Secrets | да |
| API_URL, FRONTEND_URL | GitHub Variables (для smoke-теста) | нет |

### Как происходит деплой
1. Изменения — только через Pull Request: CI + ревью
2. Merge в main → CI: test → deploy (Render deploy hook, ref = SHA) → smoke (`scripts/smoke.js`)
3. React собирается Vercel из main автоматически
4. На Render при запуске сначала `npm run db:migrate` (идемпотентная миграция), затем `npm start`
5. Авария: Rollback на Render, затем git revert через PR

`npm run db:init` на облачной базе запрещён предохранителем: без флага `--force` он работает только с `localhost`.

## Лабораторная 9 — ответы
- **Что напечатал предохранитель seed.js на облачной базе и зачем он нужен:**
  `Отказ: db:init запущен НЕ на локальной базе — все данные будут удалены.`
  `Если база пустая и вы уверены: node db/seed.js --force`.
  `db:init` удаляет все таблицы; предохранитель не даёт по привычке стереть покупателей и заявки
  в продакшене. Пустую базу Neon заполнили один раз с `--force`
  («Готово: товаров — 12, админ — admin@agromarket.kz»), повторная миграция ничего не сломала
  («Миграция выполнена (инструкций: 3)»).
- **Почему на Vercel сначала не загрузился каталог и как исправили:** на сайте было
  «Не удалось загрузить товары», в консоли — `Access to fetch at '.../api/products' from origin
  'https://agromarket-makhentosch.vercel.app' has been blocked by CORS policy: ... No
  'Access-Control-Allow-Origin' header is present`. Сервер разрешал запросы только с адресов из
  `CORS_ORIGIN`, а там был один `http://localhost:5173`. Добавили на Render точный Origin сайта
  без слэша: `CORS_ORIGIN=https://agromarket-makhentosch.vercel.app,http://localhost:5173`
  и задеплоили — каталог загрузился.
- **Почему в PR job deploy — skipped; почему каталог не работает на Preview Vercel:** у job `deploy`
  условие `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` — в Pull Request код
  ещё не одобрен и не слит, деплоить его в продакшен нельзя. Preview-версия Vercel открывается
  по своему адресу (`agromarket-makhentosch-git-<ветка>-....vercel.app`), которого нет
  в `CORS_ORIGIN`, поэтому API отвечает ей без заголовка CORS и браузер блокирует запрос.
- **Время конвейера от Merge до зелёного smoke:** ~1,5 мин (CD: merge 09:53:43 → smoke пройден
  09:55:10; категории: 09:55:48 → 09:57:15). В логе smoke видно переключение версии:
  `#1–#3: версия e9bfe33` → `#4: версия 31ec980`.
- **Работал ли сайт во время «сломанного» деплоя с JWT_SECRET=123 и почему:** да. Новая версия
  выполнила миграцию и сразу завершилась: `JWT_SECRET слишком короткий для продакшена (нужно от 32
  символов)`, `Exited with status 1`, в Events — Deploy failed. При этом `/api/health` отвечал
  `{"status":"ok","db":"ok","version":"7e6c168"}` — продолжала работать старая версия: Render
  переключает трафик только на версию, которая запустилась и прошла Health Check (zero-downtime).
- **Rollback или git revert — что вы сделаете ночью при аварии и что утром:** ночью — Rollback
  на Render: одна кнопка, через минуту работает прошлая сборка (проверили: откат на `31ec980` —
  `/api/categories` стал 404, `version` = `31ec980`). Утром — `git revert` через PR, чтобы `main`
  снова совпадал с продакшеном и исправление прошло тесты, ревью и smoke. После эксперимента
  актуальную версию вернули через Actions → Re-run all jobs.
- **Аудит (часть 7), пункты 1–7:**
  1. `git log --all --oneline -S "neon.tech"` и `-S "npg_"` — пусто в обоих репозиториях;
  2. `/api/products/abc` на продакшене и локально одинаково: `400 {"error":"Некорректный id"}` —
     id проверяется до запроса в базу; текст 500 в продакшене скрывает errorHandler (unit-тест);
  3. есть `strict-transport-security: max-age=31536000; includeSubDomains`,
     `x-content-type-options: nosniff`, `content-security-policy`; `x-powered-by` нет;
  4. `http://agromarket-api-makhentosch.onrender.com/api/health` → `301` на `https://`;
  5. вход `Admin12345` на продакшене: TODO (проверить самому)
  6. 6 неверных входов подряд → 6-й ответ 429: TODO (проверить самому)
  7. Neon, Backup & Restore — окно восстановления: TODO (посмотреть самому)
- **Холодный старт:** первый ответ TODO с, повторный TODO с, почему: TODO (заполнить самому)
- **Использовал(а) ли ИИ и для чего:** TODO (заполнить самому)
