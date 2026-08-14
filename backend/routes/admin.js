const express = require('express');
const router = express.Router();
const UserService = require('../services/userService');
const StatsService = require('../services/statsService');
const { verifyOwner } = require('../middleware/auth');

router.get('/stats', verifyOwner, (req, res) => {
    const stats = StatsService.getStats();
    const bans = StatsService.getBanStats();
    const top = StatsService.getTopUsers(5);
    res.json({ ...stats, bans, topUsers: top });
});

router.get('/users', verifyOwner, (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const offset = parseInt(req.query.offset) || 0;
    const { users, total } = UserService.getAllUsers(limit, offset);
    res.json({ users, total, limit, offset });
});

router.post('/ban/:id', verifyOwner, (req, res) => {
    const id = parseInt(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: 'Cannot ban yourself' });
    UserService.banUser(id);
    res.json({ message: 'User banned' });
});

router.post('/unban/:id', verifyOwner, (req, res) => {
    const id = parseInt(req.params.id);
    UserService.unbanUser(id);
    res.json({ message: 'User unbanned' });
});

module.exports = router;
