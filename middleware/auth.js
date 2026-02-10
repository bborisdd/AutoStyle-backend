const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'autostyle-secret-key-2024';

/**
 * Middleware для проверки JWT токена
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Токен истёк' });
            }
            return res.status(403).json({ error: 'Недействительный токен' });
        }

        req.user = user;
        next();
    });
}

/**
 * Опциональная проверка токена (не блокирует запрос)
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (!err) {
            req.user = user;
        }
        next();
    });
}

/**
 * Генерация JWT токена
 */
function generateToken(user) {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email,
            name: user.name 
        },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

/**
 * Проверка что пользователь имеет доступ к ресурсу
 */
function checkOwnership(req, res, next) {
    const resourceUserId = parseInt(req.params.id || req.params.userId);
    
    if (req.user.id !== resourceUserId) {
        return res.status(403).json({ error: 'Доступ запрещён' });
    }
    
    next();
}

module.exports = {
    authenticateToken,
    optionalAuth,
    generateToken,
    checkOwnership
};
