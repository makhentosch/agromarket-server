import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { pool } from '../db/pool.js';
import { uniqueEmail, getAdminToken } from './helpers.js';

const fields = (res) => res.body.details.map((d) => d.field);

describe('Валидация: регистрация и вход', () => {
  it('регистрация с некорректным e-mail - 400 и поле email в details', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Тест', email: 'не-почта', password: '12345678' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Ошибка валидации');
    expect(fields(res)).toContain('email');
  });

  it('нельзя зарегистрироваться админом через поле role', async () => {
    const email = uniqueEmail('role');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Хакер', email, password: '12345678', role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('user');
    const { rows } = await pool.query('SELECT role FROM users WHERE email = $1', [email]);
    expect(rows[0].role).toBe('user');
  });

  it('пароль из 7 символов - 400 с понятным текстом', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Тест', email: uniqueEmail(), password: '1234567' });

    expect(res.status).toBe(400);
    expect(res.body.details).toContainEqual({ field: 'password', message: 'Пароль: минимум 8 символов' });
  });

  it('пароль длиннее 72 символов - 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Тест', email: uniqueEmail(), password: 'x'.repeat(73) });

    expect(res.status).toBe(400);
    expect(fields(res)).toContain('password');
  });

  it('имя из одной буквы - 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Я', email: uniqueEmail(), password: '12345678' });

    expect(res.status).toBe(400);
    expect(fields(res)).toContain('name');
  });

  it('вход без пароля - 400, а не 500', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@a.kz' });

    expect(res.status).toBe(400);
    expect(fields(res)).toContain('password');
  });
});

describe('Валидация: товары', () => {
  let auth;

  beforeAll(async () => {
    auth = `Bearer ${await getAdminToken()}`;
  });

  it('товар с отрицательной ценой - 400', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', auth)
      .send({ name: 'Мёд', price: -500, category: 'Мёд' });

    expect(res.status).toBe(400);
    expect(res.body.details).toContainEqual({ field: 'price', message: 'Цена должна быть больше 0' });
  });

  it('название длиннее 150 символов - 400, а не 500 из базы', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', auth)
      .send({ name: 'a'.repeat(10_000), price: 100, category: 'Мёд' });

    expect(res.status).toBe(400);
    expect(fields(res)).toContain('name');
  });

  it('цена строкой «3500» из формы принимается как число', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', auth)
      .send({ name: 'Мёд липовый', price: '3500', category: 'Мёд', unit: 'л' });

    expect(res.status).toBe(201);
    expect(Number(res.body.price)).toBe(3500);
    await request(app).delete(`/api/products/${res.body.id}`).set('Authorization', auth);
  });

  it('PATCH товара с пустым телом {} - 400', async () => {
    const res = await request(app)
      .patch('/api/products/1')
      .set('Authorization', auth)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.details[0].message).toBe('Нет полей для обновления');
  });

  it('PATCH меняет только переданные поля', async () => {
    const before = await request(app).get('/api/products/2');

    const res = await request(app)
      .patch('/api/products/2')
      .set('Authorization', auth)
      .send({ price: 320 });

    expect(res.status).toBe(200);
    expect(Number(res.body.price)).toBe(320);
    expect(res.body.name).toBe(before.body.name);
  });

  it('GET /api/products/abc и /api/products/-1 - 400, а не 500', async () => {
    const abc = await request(app).get('/api/products/abc');
    const negative = await request(app).get('/api/products/-1');

    expect(abc.status).toBe(400);
    expect(negative.status).toBe(400);
  });
});

describe('Валидация: заявки и размер тела', () => {
  it('заявка с некорректной датой - 400', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ name: 'ТОО Ферма', email: 'farm@test.kz', volume: 50, date: 'завтра' });

    expect(res.status).toBe(400);
    expect(fields(res)).toContain('date');
  });

  it('тело больше 100 КБ - 413', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'x'.repeat(200_000), email: uniqueEmail(), password: '12345678' });

    expect(res.status).toBe(413);
  });
});
