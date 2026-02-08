const { Pool } = require('pg');
require('dotenv').config();

// Конфигурация подключения к PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Проверка подключения
pool.on('connect', () => {
    console.log('✅ Подключение к PostgreSQL установлено');
});

pool.on('error', (err) => {
    console.error('❌ Ошибка подключения к PostgreSQL:', err);
    process.exit(-1);
});

// Функция для выполнения запросов
const query = async (text, params) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Выполнен запрос:', { text: text.substring(0, 50), duration: `${duration}ms`, rows: result.rowCount });
        return result;
    } catch (error) {
        console.error('Ошибка запроса:', error.message);
        throw error;
    }
};

// Инициализация базы данных (создание таблиц)
const initDB = async () => {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schema);
        console.log('✅ Таблицы базы данных созданы/проверены');
    } catch (error) {
        console.error('❌ Ошибка инициализации БД:', error.message);
        throw error;
    }
};

module.exports = {
    query,
    pool,
    initDB
};
