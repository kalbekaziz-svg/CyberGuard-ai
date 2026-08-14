require('dotenv').config();
module.exports = {
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    DB_PATH: process.env.DB_PATH || './data/guardai.db',
    OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434/api/generate',
    BOT_TOKEN: process.env.BOT_TOKEN,
    OWNER_ID: parseInt(process.env.OWNER_ID, 10) || 7562776557,
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change',
    JWT_EXPIRY: '7d',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
    RATE_LIMIT_MAX: 10,
    RATE_LIMIT_WINDOW: 60000
};
