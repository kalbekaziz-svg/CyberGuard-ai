const db = require('../db');
const crypto = require('crypto');

class UserService {
    static getOrCreateUser(telegramId, username = null) {
        let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
        if (!user) {
            db.prepare('INSERT INTO users (telegram_id, username) VALUES (?, ?)').run(telegramId, username || `user_${telegramId}`);
            user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
        }
        return user;
    }

    static createUser(email, password, username) {
        try {
            const hash = crypto.createHash('sha256').update(password).digest('hex');
            db.prepare('INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)').run(email, username, hash);
            return { success: true, user: db.prepare('SELECT id, email, username FROM users WHERE email = ?').get(email) };
        } catch (e) { return { success: false, error: e.message }; }
    }

    static authenticate(email, password) {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) return { success: false, error: 'User not found' };
        const hash = crypto.createHash('sha256').update(password).digest('hex');
        if (hash !== user.password_hash) return { success: false, error: 'Invalid password' };
        if (user.is_banned) return { success: false, error: 'User banned' };
        return { success: true, user: { id: user.id, email: user.email, username: user.username } };
    }

    static banUser(userId) {
        db.prepare('UPDATE users SET is_banned = 1 WHERE id = ?').run(userId);
        db.prepare('INSERT INTO bans (user_id) VALUES (?)').run(userId);
    }

    static unbanUser(userId) {
        db.prepare('UPDATE users SET is_banned = 0 WHERE id = ?').run(userId);
    }

    static getUserById(id) {
        return db.prepare('SELECT id, username, email, is_owner, created_at FROM users WHERE id = ?').get(id);
    }

    static getAllUsers(limit = 50, offset = 0) {
        const users = db.prepare('SELECT id, username, email, is_owner, is_banned FROM users LIMIT ? OFFSET ?').all(limit, offset);
        const total = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        return { users, total };
    }

    static trackActivity(userId, action, model, time) {
        db.prepare('INSERT INTO activity (user_id, action, model, processing_time_ms) VALUES (?, ?, ?, ?)').run(userId, action, model, time);
    }

    static isBanned(id) {
        const user = db.prepare('SELECT is_banned FROM users WHERE id = ?').get(id);
        return user ? user.is_banned : false;
    }
}

module.exports = UserService;
