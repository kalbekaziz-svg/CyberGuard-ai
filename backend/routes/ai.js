const express = require('express');
const router = express.Router();
const AIService = require('../services/aiService');
const UserService = require('../services/userService');
const StatsService = require('../services/statsService');
const { verifyToken } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

router.post('/text', verifyToken, rateLimit, async (req, res) => {
    const { prompt, mode = 'general' } = req.body;
    if (!prompt || prompt.length > 8000) return res.status(400).json({ error: 'Invalid prompt' });
    
    const start = Date.now();
    const result = await AIService.processText(prompt, mode);
    
    if (!result.success) return res.status(503).json({ error: result.error });
    
    const time = Date.now() - start;
    UserService.trackActivity(req.user.id, 'TEXT', result.model, time);
    
    res.json({ response: result.response, model: result.model, time: `${Math.round(time / 1000)}s` });
});

router.post('/image', verifyToken, rateLimit, async (req, res) => {
    const { base64Image, prompt = 'Analyze this image.' } = req.body;
    if (!base64Image) return res.status(400).json({ error: 'No image' });
    
    const start = Date.now();
    const result = await AIService.processImage(base64Image, prompt);
    
    if (!result.success) return res.status(503).json({ error: result.error });
    
    const time = Date.now() - start;
    UserService.trackActivity(req.user.id, 'IMAGE', result.model, time);
    
    res.json({ response: result.response, model: result.model, time: `${Math.round(time / 1000)}s` });
});

router.get('/health', async (req, res) => {
    const ok = await AIService.checkHealth();
    res.json({ status: ok ? 'ok' : 'error' });
});

module.exports = router;
