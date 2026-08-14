const express = require('express');
const router = express.Router();
const UserService = require('../services/userService');
const { generateToken, verifyToken } = require('../middleware/auth');

router.post('/register', (req, res) => {
    const { email, username, password, passwordConfirm } = req.body;
    if (!email || !username || !password) return res.status(400).json({ error: 'Missing fields' });
    if (password !== passwordConfirm) return res.status(400).json({ error: 'Passwords mismatch' });
    if (password.length < 6) return res.status(400).json({ error: 'Password too short' });
    
    const result = UserService.createUser(email, password, username);
    if (!result.success) return res.status(400).json({ error: result.error });
    
    const token = generateToken(result.user);
    res.status(201).json({ message: 'Registered', user: result.user, token });
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    
    const result = UserService.authenticate(email, password);
    if (!result.success) return res.status(401).json({ error: result.error });
    
    const token = generateToken(result.user);
    res.json({ message: 'Login OK', user: result.user, token });
});

router.post('/telegram', (req, res) => {
    const { telegramId, username } = req.body;
    if (!telegramId) return res.status(400).json({ error: 'No Telegram ID' });
    
    const user = UserService.getOrCreateUser(telegramId, username);
    if (user.is_banned) return res.status(403).json({ error: 'Banned' });
    
    const token = generateToken(user);
    res.json({ message: 'OK', user: { id: user.id, username: user.username }, token });
});

router.get('/me', verifyToken, (req, res) => {
    const user = UserService.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
});

module.exports = router;
