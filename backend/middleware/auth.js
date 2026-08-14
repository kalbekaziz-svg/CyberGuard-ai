const jwt = require('jsonwebtoken');
const config = require('../config');
const UserService = require('../services/userService');

function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        const user = jwt.verify(token, config.JWT_SECRET);
        if (UserService.isBanned(user.id)) return res.status(403).json({ error: 'Banned' });
        req.user = user;
        next();
    } catch { res.status(401).json({ error: 'Invalid token' }); }
}

function verifyOwner(req, res, next) {
    verifyToken(req, res, () => {
        if (!req.user.is_owner) return res.status(403).json({ error: 'Admin only' });
        next();
    });
}

function generateToken(user) {
    return jwt.sign({ id: user.id, email: user.email, username: user.username, is_owner: user.is_owner }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRY });
}

module.exports = { verifyToken, verifyOwner, generateToken };
