const config = require('../config');
const limits = new Map();

function rateLimit(req, res, next) {
    const id = req.user?.id || req.ip;
    const now = Date.now();
    
    if (req.user?.is_owner) return next();
    
    if (!limits.has(id)) {
        limits.set(id, { count: 1, reset: now + config.RATE_LIMIT_WINDOW });
        return next();
    }
    
    const limit = limits.get(id);
    if (now > limit.reset) {
        limits.set(id, { count: 1, reset: now + config.RATE_LIMIT_WINDOW });
        return next();
    }
    
    if (limit.count >= config.RATE_LIMIT_MAX) {
        return res.status(429).json({ error: 'Rate limit exceeded', retryAfter: Math.ceil((limit.reset - now) / 1000) });
    }
    
    limit.count++;
    next();
}

module.exports = { rateLimit };
