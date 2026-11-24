import { z } from 'zod';

// Схемы входных данных. Поля, которых нет в схеме (например, role), отбрасываются

export const registerSchema = z.object({
  name: z.string({ error: 'Укажите имя' }).trim()
    .min(2, 'Имя: минимум 2 символа')
    .max(100, 'Имя: не длиннее 100 символов'),
  email: z.string({ error: 'Укажите e-mail' }).trim().toLowerCase()
    .max(255, 'E-mail слишком длинный')
    .email('Некорректный e-mail'),
  // bcrypt учитывает только первые 72 байта; без верхней границы огромный пароль «положит» сервер
  password: z.string({ error: 'Укажите пароль' })
    .min(8, 'Пароль: минимум 8 символов')
    .max(72, 'Пароль: не длиннее 72 символов'),
});

export const loginSchema = z.object({
  email: z.string({ error: 'Укажите e-mail' }).trim().toLowerCase()
    .max(255, 'E-mail слишком длинный')
    .email('Некорректный e-mail'),
  password: z.string({ error: 'Укажите пароль' })
    .min(1, 'Укажите пароль')
    .max(72, 'Пароль: не длиннее 72 символов'),
});

export const productSchema = z.object({
  name: z.string({ error: 'Укажите название' }).trim()
    .min(2, 'Название: минимум 2 символа')
    .max(150, 'Название: не длиннее 150 символов'),
  // coerce: цена из формы может прийти строкой «3500»
  price: z.coerce.number({ error: 'Цена должна быть числом' })
    .positive('Цена должна быть больше 0')
    .max(10_000_000, 'Цена слишком большая'),
  category: z.string({ error: 'Укажите категорию' }).trim()
    .min(1, 'Укажите категорию')
    .max(50, 'Категория: не длиннее 50 символов'),
  unit: z.string().trim()
    .min(1, 'Укажите единицу измерения')
    .max(20, 'Единица измерения: не длиннее 20 символов')
    .optional(),
  image: z.url('Картинка: нужна ссылка http(s)').max(2000).nullable().optional(),
});

// для PATCH: все поля необязательны, но хотя бы одно должно быть
export const productUpdateSchema = productSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Нет полей для обновления');

const optionalText = (max, message) => z.string().trim().max(max, message).nullable().optional();

export const orderSchema = z.object({
  name: z.string({ error: 'Укажите имя или организацию' }).trim()
    .min(2, 'Имя: минимум 2 символа')
    .max(150, 'Имя: не длиннее 150 символов'),
  email: z.string({ error: 'Укажите e-mail' }).trim().toLowerCase()
    .max(255, 'E-mail слишком длинный')
    .email('Некорректный e-mail'),
  phone: optionalText(30, 'Телефон: не длиннее 30 символов'),
  volume: z.coerce.number({ error: 'Объём должен быть числом' })
    .int('Объём: целое число килограммов')
    .min(10, 'Объём заказа: от 10 кг')
    .max(1_000_000, 'Объём заказа слишком большой'),
  date: z.union([z.iso.date('Некорректная дата'), z.literal('')]).nullable().optional(),
  comment: optionalText(1000, 'Комментарий: не длиннее 1000 символов'),
});
