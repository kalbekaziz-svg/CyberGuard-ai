// 1. Load environment variables from the .env file at the very beginning
require('dotenv').config();

const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const winston = require('winston'); // Winston logger

// 2. Configure Winston Logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level}: ${message}`)
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// 3. Initialize variables from the .env file
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_ID;
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;
const OLLAMA_VISION_MODEL = process.env.OLLAMA_VISION_MODEL;
const REQUEST_WINDOW_MS = 60_000;
const REQUESTS_PER_WINDOW = 10;
const MAX_TEXT_LENGTH = 8_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const requestCounts = new Map();

// Check if BOT_TOKEN is present
if (!BOT_TOKEN) {
    logger.error("BOT_TOKEN not found in the .env file!");
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

function isOwner(ctx) {
    return Boolean(OWNER_ID) && String(ctx.from?.id) === OWNER_ID;
}

function requireOwner(ctx) {
    if (isOwner(ctx)) return true;
    ctx.reply('This control is available to the bot owner only.');
    return false;
}

bot.use(async (ctx, next) => {
    if (!ctx.from || isOwner(ctx) || (!ctx.message?.text && !ctx.message?.photo)) return next();
    const now = Date.now();
    for (const [userId, entry] of requestCounts) {
        if (now - entry.startedAt >= REQUEST_WINDOW_MS) requestCounts.delete(userId);
    }
    const entry = requestCounts.get(ctx.from.id);
    if (!entry || now - entry.startedAt >= REQUEST_WINDOW_MS) {
        requestCounts.set(ctx.from.id, { startedAt: now, count: 1 });
    } else if (entry.count >= REQUESTS_PER_WINDOW) {
        return ctx.reply('Rate limit reached. Please try again in a minute.');
    } else {
        entry.count++;
    }
    return next();
});

// Simple memory storage for statistics and active modes
let statsData = {
    totalRequests: 0,
    totalUsers: new Set(),
    currentMode: 'cyber'
};

// --- Helper function to query local Ollama server ---
async function askOllama(model, prompt, images = []) {
    try {
        logger.info(`Sending request to Ollama model: ${model}`);
        const payload = {
            model: model,
            prompt: prompt,
            stream: false
        };

        if (images.length > 0) {
            payload.images = images;
        }

        const response = await axios.post(`${OLLAMA_API_URL}/api/generate`, payload, {
            timeout: 120_000,
            maxBodyLength: MAX_IMAGE_BYTES + 256_000,
            maxContentLength: 2 * 1024 * 1024
        });
        logger.info(`Successfully received response from Ollama model: ${model}`);
        return response.data.response;
    } catch (error) {
        logger.error(`Ollama API Error (${model}): ${error.message}`);
        return "⚠️ Error: Could not connect to local Ollama server.";
    }
}

// --- Bot Logic & Functional Handlers ---

// /start command
bot.command(['start', 'menu'], (ctx) => {
    logger.info(`User ${ctx.from.id} triggered /start or /menu`);
    if (!isOwner(ctx)) return ctx.reply('Welcome! Send a message or photo to analyze it.');
    const welcomeText = isOwner(ctx)
        ? "Welcome, Creator. Control panel is under your command:" 
        : "Welcome! Use the control panel below:";
    
    ctx.reply(welcomeText, Markup.keyboard([
        [`🔄 Mode: ${statsData.currentMode}`, '📊 Stats'],
        ['👥 Users', '⚙️ Settings'],
        ['🛠 Help']
    ]).resize());
});

// Button: Stats
bot.hears('📊 Stats', (ctx) => {
    if (!requireOwner(ctx)) return;
    logger.info(`User ${ctx.from.id} requested stats`);
    ctx.reply(
        `📊 **STATISTICS**\n\n` +
        `✅ Total Requests: ${statsData.totalRequests}\n` +
        `👥 Total Users: ${statsData.totalUsers.size}\n` +
        `📈 Current Mode: ${statsData.currentMode}`,
        { parse_mode: 'Markdown' }
    );
});

// Button: Mode Switcher
bot.hears(/Mode:/, (ctx) => {
    if (!requireOwner(ctx)) return;
    statsData.currentMode = statsData.currentMode === 'cyber' ? 'secure' : 'cyber';
    logger.info(`User ${ctx.from.id} switched mode to: ${statsData.currentMode}`);
    ctx.reply(`⚡ Mode switched to: *${statsData.currentMode}*`, {
        parse_mode: 'Markdown',
        ...Markup.keyboard([
            [`🔄 Mode: ${statsData.currentMode}`, '📊 Stats'],
            ['👥 Users', '⚙️ Settings'],
            ['🛠 Help']
        ]).resize()
    });
});

// Button: Users count
bot.hears('👥 Users', (ctx) => {
    if (!requireOwner(ctx)) return;
    logger.info(`User ${ctx.from.id} checked unique users count`);
    ctx.reply(`👥 Unique users interacted with bot: ${statsData.totalUsers.size}`);
});

// Button: Settings
bot.hears('⚙️ Settings', (ctx) => {
    if (!requireOwner(ctx)) return;
    logger.info(`User ${ctx.from.id} accessed settings panel`);
    ctx.reply(
        `⚙️ **Current Configuration:**\n` +
        `• Text Model: ${OLLAMA_MODEL}\n` +
        `• Vision Model: ${OLLAMA_VISION_MODEL}\n` +
        `• API URL: ${OLLAMA_API_URL}`,
        { parse_mode: 'Markdown' }
    );
});

// Button: Help
bot.hears('🛠 Help', (ctx) => {
    logger.info(`User ${ctx.from.id} requested help information`);
    ctx.reply(
        `🛠 **AVAILABLE FEATURES**\n\n` +
        `1. **Text & Code Analysis**: Send any text or code snippet, and local Ollama (${OLLAMA_MODEL}) will analyze it.\n` +
        `2. **Photo Parsing**: Send an image to have it parsed via ${OLLAMA_VISION_MODEL}.\n` +
        `3. **Control Panel**: Use the keyboard buttons to manage stats and modes.`,
        { parse_mode: 'Markdown' }
    );
});

// Handler for incoming photos (Real parsing using OLLAMA_VISION_MODEL)
bot.on('photo', async (ctx) => {
    statsData.totalRequests++;
    statsData.totalUsers.add(ctx.from.id);
    logger.info(`Received photo from user ${ctx.from.id}`);

    try {
        await ctx.reply("🔍 Analyzing image with local vision model...");
        
        const photoArray = ctx.message.photo;
        const largestPhoto = photoArray[photoArray.length - 1];
        if (largestPhoto.file_size > MAX_IMAGE_BYTES) {
            return ctx.reply('Image is too large. Please send an image under 8 MB.');
        }
        const prompt = ctx.message.caption || 'Describe this image or extract any code/text from it.';
        if (prompt.length > MAX_TEXT_LENGTH) {
            return ctx.reply(`Caption is too long. Maximum length is ${MAX_TEXT_LENGTH} characters.`);
        }
        const fileLink = await ctx.telegram.getFileLink(largestPhoto.file_id);
        
        logger.info(`Downloading photo from Telegram: ${fileLink.href}`);
        const imageResponse = await axios.get(fileLink.href, {
            responseType: 'arraybuffer', timeout: 30_000,
            maxContentLength: MAX_IMAGE_BYTES, maxBodyLength: MAX_IMAGE_BYTES
        });
        const base64Image = Buffer.from(imageResponse.data).toString('base64');

        const aiResponse = await askOllama(OLLAMA_VISION_MODEL, prompt, [base64Image]);

        await sendModelResponse(ctx, 'Vision Analysis Result', aiResponse);
        logger.info(`Successfully processed photo for user ${ctx.from.id}`);
    } catch (error) {
        logger.error(`Photo parsing error for user ${ctx.from.id}: ${error.message}`);
        await ctx.reply("❌ Failed to process the image with local model.");
    }
});

// Handler for text and code parsing using OLLAMA_MODEL
async function sendModelResponse(ctx, title, response) {
    const text = `${title}:\n\n${String(response || 'No response returned.')}`;
    const chunks = text.match(/[\s\S]{1,4000}/g) || [];
    for (const chunk of chunks) await ctx.reply(chunk);
}

bot.on('text', async (ctx) => {
    const text = ctx.message.text;

    if (text.length > MAX_TEXT_LENGTH) {
        return ctx.reply(`Message is too long. Maximum length is ${MAX_TEXT_LENGTH} characters.`);
    }
    
    // Ignore menu button clicks to prevent triggering AI generation on UI navigation
    if (text.startsWith('🔄') || text === '📊 Stats' || text === '👥 Users' || text === '⚙️ Settings' || text === '🛠 Help') {
        return;
    }

    statsData.totalRequests++;
    statsData.totalUsers.add(ctx.from.id);
    logger.info(`Received text message from user ${ctx.from.id} (Length: ${text.length} chars)`);

    try {
        await ctx.reply("⏳ Processing with local model (" + OLLAMA_MODEL + ")...");
        const aiResponse = await askOllama(OLLAMA_MODEL, text);
        await sendModelResponse(ctx, 'AI Response', aiResponse);
        logger.info(`Successfully responded to text prompt for user ${ctx.from.id}`);
    } catch (error) {
        logger.error(`Text parsing error for user ${ctx.from.id}: ${error.message}`);
        await ctx.reply("❌ Error getting response from local Ollama.");
    }
});

// Launch the bot via polling
bot.launch().then(() => {
    logger.info(`Functional Bot successfully started! Connected to Ollama at ${OLLAMA_API_URL}`);
});

// Enable graceful stop
process.once('SIGINT', () => {
    logger.warn('Bot stopping due to SIGINT...');
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    logger.warn('Bot stopping due to SIGTERM...');
    bot.stop('SIGTERM');
});
