const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { authenticateToken, generateToken, checkOwnership } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/users/register - Регистрация пользователя
 */
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Валидация
        if (!name || !email || !password) {
            return res.status(400).json({ 
                error: 'Заполните обязательные поля: имя, email и пароль' 
            });
        }

        // Проверка email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Некорректный email' });
        }

        // Проверка длины пароля
        if (password.length < 6) {
            return res.status(400).json({ 
                error: 'Пароль должен содержать минимум 6 символов' 
            });
        }

        // Проверка существования пользователя
        const existingUser = await query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ 
                error: 'Пользователь с таким email уже существует' 
            });
        }

        // Хеширование пароля
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Создание пользователя
        const result = await query(
            `INSERT INTO users (name, email, password, phone) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, name, email, phone, created_at`,
            [name, email.toLowerCase(), hashedPassword, phone || null]
        );

        const user = result.rows[0];

        // Генерация JWT токена
        const token = generateToken(user);

        res.status(201).json({
            message: 'Регистрация успешна',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Ошибка сервера при регистрации' });
    }
});

/**
 * POST /api/users/login - Вход пользователя
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Валидация
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Введите email и пароль' 
            });
        }

        // Поиск пользователя
        const result = await query(
            'SELECT * FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                error: 'Неверный email или пароль' 
            });
        }

        const user = result.rows[0];

        // Проверка пароля
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ 
                error: 'Неверный email или пароль' 
            });
        }

        // Генерация JWT токена
        const token = generateToken(user);

        res.json({
            message: 'Вход выполнен успешно',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка сервера при входе' });
    }
});

/**
 * GET /api/users/me - Получение текущего пользователя по токену
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const result = await query(
            'SELECT id, name, email, phone, created_at FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json({ user: result.rows[0] });

    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * GET /api/users/:id - Получение информации о пользователе
 */
router.get('/:id', authenticateToken, checkOwnership, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'SELECT id, name, email, phone, created_at FROM users WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json({ user: result.rows[0] });

    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * PUT /api/users/:id - Обновление данных пользователя
 */
router.put('/:id', authenticateToken, checkOwnership, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone } = req.body;

        // Проверка существования пользователя
        const existingUser = await query(
            'SELECT id FROM users WHERE id = $1',
            [id]
        );

        if (existingUser.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Обновление данных
        const result = await query(
            `UPDATE users 
             SET name = COALESCE($1, name), 
                 phone = COALESCE($2, phone)
             WHERE id = $3
             RETURNING id, name, email, phone, created_at, updated_at`,
            [name, phone, id]
        );

        res.json({
            message: 'Данные обновлены',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Ошибка обновления пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * DELETE /api/users/:id - Удаление пользователя
 */
router.delete('/:id', authenticateToken, checkOwnership, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'DELETE FROM users WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json({ message: 'Пользователь удален' });

    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
