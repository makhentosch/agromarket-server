import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';

// В остальных тестах лимит выключен (NODE_ENV=test). Здесь включаем его,
// чтобы проверить защиту от перебора паролей. Отдельный файл: свой счётчик попыток
describe('Rate limit на вход и регистрацию', () => {
  beforeAll(() => vi.stubEnv('NODE_ENV', 'development'));
  afterAll(() => vi.unstubAllEnvs());

  it('10 неверных паролей - 401, 11-й запрос - 429 с заголовками лимита', async () => {
    const attempt = () => request(app)
      .post('/api/auth/login')
      .send({ email: 'a@a.kz', password: 'wrong-password' });

    const statuses = [];
    for (let i = 0; i < 10; i++) {
      statuses.push((await attempt()).status);
    }
    const blocked = await attempt();

    expect(statuses).toEqual(Array(10).fill(401));
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/слишком много попыток/i);
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(blocked.headers.ratelimit).toMatch(/remaining=0/);
  });

  it('регистрация использует тот же лимит', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Лимит', email: 'limit@test.kz', password: 'qwerty123' });

    expect(res.status).toBe(429);
  });
});
