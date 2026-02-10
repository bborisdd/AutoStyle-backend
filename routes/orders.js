const express = require('express');
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/orders - Создание заказа
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { items, total, deliveryAddress } = req.body;
        const userId = req.user.id; // Берём userId из токена

        // Валидация
        if (!items || !total) {
            return res.status(400).json({ 
                error: 'Необходимо указать items и total' 
            });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
                error: 'Корзина не может быть пустой' 
            });
        }

        // Создание заказа
        const result = await query(
            `INSERT INTO orders (user_id, items, total, delivery_address, status) 
             VALUES ($1, $2, $3, $4, 'pending') 
             RETURNING *`,
            [userId, JSON.stringify(items), total, deliveryAddress || null]
        );

        const order = result.rows[0];

        res.status(201).json({
            message: 'Заказ успешно создан',
            order: {
                id: order.id,
                userId: order.user_id,
                items: order.items,
                total: order.total,
                status: order.status,
                deliveryAddress: order.delivery_address,
                createdAt: order.created_at
            }
        });

    } catch (error) {
        console.error('Ошибка создания заказа:', error);
        res.status(500).json({ error: 'Ошибка сервера при создании заказа' });
    }
});

/**
 * GET /api/orders/my - Получение заказов текущего пользователя
 */
router.get('/my', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await query(
            `SELECT * FROM orders 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [userId]
        );

        const orders = result.rows.map(order => ({
            id: order.id,
            userId: order.user_id,
            items: order.items,
            total: order.total,
            status: order.status,
            deliveryAddress: order.delivery_address,
            createdAt: order.created_at,
            updatedAt: order.updated_at
        }));

        res.json({ orders });

    } catch (error) {
        console.error('Ошибка получения заказов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * GET /api/orders/user/:userId - Получение заказов пользователя (deprecated, use /my)
 */
router.get('/user/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Проверка доступа - можно получить только свои заказы
        if (req.user.id !== parseInt(userId)) {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }

        const result = await query(
            `SELECT * FROM orders 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [userId]
        );

        const orders = result.rows.map(order => ({
            id: order.id,
            userId: order.user_id,
            items: order.items,
            total: order.total,
            status: order.status,
            deliveryAddress: order.delivery_address,
            createdAt: order.created_at,
            updatedAt: order.updated_at
        }));

        res.json({ orders });

    } catch (error) {
        console.error('Ошибка получения заказов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * GET /api/orders/:id - Получение заказа по ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'SELECT * FROM orders WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        const order = result.rows[0];
        
        // Проверка доступа - можно получить только свой заказ
        if (order.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }

        res.json({
            order: {
                id: order.id,
                userId: order.user_id,
                items: order.items,
                total: order.total,
                status: order.status,
                deliveryAddress: order.delivery_address,
                createdAt: order.created_at,
                updatedAt: order.updated_at
            }
        });

    } catch (error) {
        console.error('Ошибка получения заказа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * PUT /api/orders/:id/status - Обновление статуса заказа
 */
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
        
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ 
                error: `Некорректный статус. Допустимые значения: ${validStatuses.join(', ')}` 
            });
        }

        const result = await query(
            `UPDATE orders 
             SET status = $1 
             WHERE id = $2 
             RETURNING *`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        const order = result.rows[0];

        res.json({
            message: 'Статус заказа обновлен',
            order: {
                id: order.id,
                status: order.status,
                updatedAt: order.updated_at
            }
        });

    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * DELETE /api/orders/:id - Удаление заказа
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Сначала проверяем, что заказ принадлежит пользователю
        const orderCheck = await query(
            'SELECT user_id FROM orders WHERE id = $1',
            [id]
        );
        
        if (orderCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }
        
        if (orderCheck.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }

        const result = await query(
            'DELETE FROM orders WHERE id = $1 RETURNING id',
            [id]
        );

        res.json({ message: 'Заказ удален' });

    } catch (error) {
        console.error('Ошибка удаления заказа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/**
 * GET /api/orders - Получение всех заказов (для админки)
 */
router.get('/', async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;

        let queryText = `
            SELECT o.*, u.name as user_name, u.email as user_email 
            FROM orders o 
            LEFT JOIN users u ON o.user_id = u.id
        `;
        const params = [];

        if (status) {
            queryText += ' WHERE o.status = $1';
            params.push(status);
        }

        queryText += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await query(queryText, params);

        const orders = result.rows.map(order => ({
            id: order.id,
            userId: order.user_id,
            userName: order.user_name,
            userEmail: order.user_email,
            items: order.items,
            total: order.total,
            status: order.status,
            deliveryAddress: order.delivery_address,
            createdAt: order.created_at,
            updatedAt: order.updated_at
        }));

        res.json({ orders, count: orders.length });

    } catch (error) {
        console.error('Ошибка получения заказов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
