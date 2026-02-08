const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDB } = require('./db');
const usersRouter = require('./routes/users');
const ordersRouter = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json());

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
    next();
});

// Роуты API
app.use('/api/users', usersRouter);
app.use('/api/orders', ordersRouter);

// Корневой маршрут
app.get('/', (req, res) => {
    res.json({
        message: 'AutoStyle API',
        version: '1.0.0',
        endpoints: {
            users: '/api/users',
            orders: '/api/orders'
        }
    });
});

// Проверка здоровья сервера
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Запуск сервера
const startServer = async () => {
    try {
        // Инициализация базы данных
        await initDB();
        
        app.listen(PORT, () => {
            console.log(`🚀 Сервер запущен на порту ${PORT}`);
            console.log(`📍 http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Не удалось запустить сервер:', error);
        process.exit(1);
    }
};

startServer();
