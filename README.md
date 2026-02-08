# AutoStyle Backend API

Backend API для интернет-магазина AutoStyle на Node.js + Express + PostgreSQL.

## 📁 Структура проекта

```
backend/
├── server.js        # Главный файл сервера
├── db.js            # Подключение к PostgreSQL
├── schema.sql       # SQL схема базы данных
├── package.json     # Зависимости
├── .env.example     # Пример переменных окружения
└── routes/
    ├── users.js     # API пользователей
    └── orders.js    # API заказов
```

## 🗄️ База данных

### Таблица `users`
| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | Первичный ключ |
| name | VARCHAR(100) | Имя пользователя |
| email | VARCHAR(255) | Email (уникальный) |
| password | VARCHAR(255) | Хэш пароля |
| phone | VARCHAR(20) | Телефон |
| created_at | TIMESTAMP | Дата регистрации |
| updated_at | TIMESTAMP | Дата обновления |

### Таблица `orders`
| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | Первичный ключ |
| user_id | INTEGER | FK на users |
| items | JSONB | Товары в заказе |
| total | DECIMAL | Сумма заказа |
| status | VARCHAR(50) | Статус заказа |
| delivery_address | TEXT | Адрес доставки |
| created_at | TIMESTAMP | Дата создания |
| updated_at | TIMESTAMP | Дата обновления |

## 🔗 API Endpoints

### Users (Пользователи)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/users/register` | Регистрация |
| POST | `/api/users/login` | Вход |
| GET | `/api/users/:id` | Получить пользователя |
| PUT | `/api/users/:id` | Обновить данные |
| DELETE | `/api/users/:id` | Удалить пользователя |

### Orders (Заказы)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/orders` | Создать заказ |
| GET | `/api/orders` | Все заказы |
| GET | `/api/orders/:id` | Получить заказ |
| GET | `/api/orders/user/:userId` | Заказы пользователя |
| PUT | `/api/orders/:id/status` | Обновить статус |
| DELETE | `/api/orders/:id` | Удалить заказ |

## 🚀 Локальная разработка

1. Установите зависимости:
```bash
cd backend
npm install
```

2. Создайте файл `.env`:
```bash
cp .env.example .env
```

3. Настройте PostgreSQL и укажите DATABASE_URL в `.env`

4. Запустите сервер:
```bash
npm run dev
```

## 🚂 Деплой на Railway

### 1. Создайте проект на Railway
- Зайдите на [railway.app](https://railway.app)
- Создайте новый проект

### 2. Добавьте PostgreSQL
- В проекте нажмите "Add New" → "Database" → "PostgreSQL"
- Railway автоматически создаст переменную `DATABASE_URL`

### 3. Подключите GitHub репозиторий
- "Add New" → "GitHub Repo"
- Выберите ваш репозиторий
- Укажите Root Directory: `backend`

### 4. Настройте переменные окружения
В разделе Variables добавьте:
```
NODE_ENV=production
FRONTEND_URL=https://your-username.github.io
```

### 5. Деплой
Railway автоматически задеплоит при пуше в main ветку.

## 📝 Примеры запросов

### Регистрация
```bash
curl -X POST https://your-api.railway.app/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Иван","email":"ivan@test.ru","password":"123456"}'
```

### Вход
```bash
curl -X POST https://your-api.railway.app/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ivan@test.ru","password":"123456"}'
```

### Создание заказа
```bash
curl -X POST https://your-api.railway.app/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"items":[{"id":1,"name":"Товар","price":1000,"quantity":2}],"total":2000}'
```
