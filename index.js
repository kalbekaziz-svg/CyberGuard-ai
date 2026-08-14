require('dotenv').config();

const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

// ==========================================
// 1. CONFIGURATION & ENVIRONMENT VARIABLES
// ==========================================
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = parseInt(process.env.OWNER_ID, 10) || 7562776557;
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';

const BAN_LIST_FILE = path.join(__dirname, 'banned_users.json');

if (!BOT_TOKEN) {
    console.error("[ERROR]: BOT_TOKEN is missing in the .env file!");
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
let currentMode = 'cyber';

// Rate limiting: track user requests (userId -> { count, resetTime })
const userRateLimits = new Map();
let RATE_LIMIT_WINDOW = 60000; // 1 minute
let RATE_LIMIT_MAX = 10; // max 10 requests per minute

// Statistics tracking
const stats = {
    totalRequests: 0,
    totalUsers: new Set(),
    startTime: Date.now(),
    responseTimes: [],
    lastReset: Date.now()
};

// Advanced user tracking
const userActivity = new Map();

const SYSTEM_PROMPTS = {
    cyber: "You are GuardAI, a highly qualified cybersecurity and penetration testing assistant. Your goal is to help analyze vulnerabilities, code, and logs. Respond strictly professionally, deeply, and in English.",
    general: "You are GuardAI, a versatile and reliable IT assistant. Respond clearly, structured, and in English."
};

// ==========================================
// 2. LOGGING
// ==========================================
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] [${level.toUpperCase()}]: ${message}`)
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: path.join(__dirname, 'logs', 'guardai.log') })
    ]
});

if (!fs.existsSync(path.join(__dirname, 'logs'))) {
    fs.mkdirSync(path.join(__dirname, 'logs'));
}

// ==========================================
// 2.5 UTILITY FUNCTIONS
// ==========================================

// Split long messages to respect Telegram's 4096 character limit
function splitMessage(text, maxLength = 4096) {
    const messages = [];
    let currentMessage = '';
    const paragraphs = text.split('\n');
    
    for (const paragraph of paragraphs) {
        if ((currentMessage + paragraph + '\n').length > maxLength) {
            if (currentMessage) messages.push(currentMessage.trim());
            currentMessage = paragraph + '\n';
        } else {
            currentMessage += paragraph + '\n';
        }
    }
    
    if (currentMessage) messages.push(currentMessage.trim());
    return messages;
}

// Rate limiting check
function checkRateLimit(userId) {
    const now = Date.now();
    const userLimit = userRateLimits.get(userId) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    
    if (now > userLimit.resetTime) {
        userRateLimits.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
    }
    
    if (userLimit.count >= RATE_LIMIT_MAX) {
        return { allowed: false, remaining: 0, resetTime: userLimit.resetTime };
    }
    
    userLimit.count++;
    userRateLimits.set(userId, userLimit);
    return { allowed: true, remaining: RATE_LIMIT_MAX - userLimit.count };
}

// Validate input sizes
function validateInput(textPrompt, hasPhoto) {
    const maxTextLength = 8000;
    const maxPhotoSize = 20 * 1024 * 1024; // 20MB
    
    if (textPrompt && textPrompt.length > maxTextLength) {
        return { valid: false, error: `Text too long (max ${maxTextLength} chars, got ${textPrompt.length})` };
    }
    
    return { valid: true };
}

// Health check for Ollama
async function checkOllamaHealth() {
    try {
        await axios.post(OLLAMA_BASE_URL, {
            model: 'qwen2.5:7b',
            prompt: 'test',
            stream: false
        }, { timeout: 5000 });
        return true;
    } catch (error) {
        logger.warn(`Ollama health check failed: ${error.message}`);
        return false;
    }
}

// Track user activity
function trackUserActivity(userId, action) {
    stats.totalUsers.add(userId);
    if (!userActivity.has(userId)) {
        userActivity.set(userId, { requests: 0, lastRequest: null });
    }
    const activity = userActivity.get(userId);
    activity.requests++;
    activity.lastRequest = new Date().toLocaleString();
}

// Get statistics
function getStats() {
    const uptime = Math.round((Date.now() - stats.startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const avgResponseTime = stats.responseTimes.length > 0 
        ? Math.round(stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length)
        : 0;
    
    return `📊 **STATISTICS**\n\n✅ Total Requests: ${stats.totalRequests}\n👥 Total Users: ${stats.totalUsers.size}\n⏱️ Avg Response: ${avgResponseTime}s\n📈 Current Mode: ${currentMode}\n🕐 Uptime: ${hours}h ${minutes}m\n⚙️ Rate Limit: ${RATE_LIMIT_MAX}/min`;
}

// ==========================================
// 3. BAN-LIST MANAGEMENT
// ==========================================
function loadBannedUsers() {
    try {
        if (fs.existsSync(BAN_LIST_FILE)) {
            const data = fs.readFileSync(BAN_LIST_FILE, 'utf8').trim();
            if (!data) return [];
            return JSON.parse(data);
        }
    } catch (err) {
        logger.error(`Error reading ban list (resetting file): ${err.message}`);
        fs.writeFileSync(BAN_LIST_FILE, JSON.stringify([], null, 2));
    }
    return [];
}

function banUser(userId) {
    let banned = loadBannedUsers();
    if (!banned.includes(userId)) {
        banned.push(userId);
        fs.writeFileSync(BAN_LIST_FILE, JSON.stringify(banned, null, 2));
    }
}

function unbanUser(userId) {
    let banned = loadBannedUsers();
    if (banned.includes(userId)) {
        banned = banned.filter(id => id !== userId);
        fs.writeFileSync(BAN_LIST_FILE, JSON.stringify(banned, null, 2));
        return true;
    }
    return false;
}

// ==========================================
// 4. MIDDLEWARE: ACCESS CONTROL (BAN LIST) & RATE LIMITING
// ==========================================
bot.use(async (ctx, next) => {
    const userId = ctx.from ? ctx.from.id : null;
    if (!userId) return;

    const bannedUsers = loadBannedUsers();
    if (bannedUsers.includes(userId)) {
        return; // Silently ignore banned users
    }
    
    // Rate limiting for non-owners
    if (userId !== OWNER_ID) {
        const rateLimit = checkRateLimit(userId);
        if (!rateLimit.allowed) {
            const resetDate = new Date(rateLimit.resetTime);
            return ctx.reply(`⏱️ Rate limit exceeded. Try again after ${resetDate.toLocaleTimeString()}`);
        }
    }

    return next();
});

// Admin keyboard
const getAdminKeyboard = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback(`🔄 Mode: ${currentMode}`, 'toggle_mode'), Markup.button.callback('📊 Stats', 'show_stats')],
        [Markup.button.callback('👥 Users', 'show_users'), Markup.button.callback('📋 Bans', 'show_bans')],
        [Markup.button.callback('⚙️ Settings', 'settings_menu'), Markup.button.callback('🛠 Help', 'help_menu')]
    ]);
};

// Settings keyboard
const getSettingsKeyboard = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback(`📈 Rate Limit: ${RATE_LIMIT_MAX}/min`, 'adjust_ratelimit')],
        [Markup.button.callback('🌡️ Temperature: 0.5', 'adjust_temp')],
        [Markup.button.callback('🔙 Back', 'back_to_menu')]
    ]);
};

// ==========================================
// 5. COMMANDS & ADMIN PANEL
// ==========================================
bot.start((ctx) => {
    const userId = ctx.from.id;
    if (userId === OWNER_ID) {
        ctx.reply(`Welcome, Creator. Control panel is under your command:`, getAdminKeyboard());
    } else {
        ctx.reply(`Hello! I am GuardAI — your IT assistant. Send me a text prompt or an image for analysis.`);
    }
});

bot.command('menu', (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.reply("This command is available only to the Creator.");
    }
    ctx.reply("GuardAI Control Panel:", getAdminKeyboard());
});

bot.action('toggle_mode', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.answerCbQuery("Only the Creator can change the operation mode!", { show_alert: true });
    }
    currentMode = currentMode === 'cyber' ? 'general' : 'cyber';
    await ctx.answerCbQuery(`Mode changed to: ${currentMode}`);
    await ctx.editMessageText(`GuardAI Control Panel. Current mode: *${currentMode}*`, {
        parse_mode: 'Markdown',
        ...getAdminKeyboard()
    });
});

bot.action('show_bans', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return ctx.answerCbQuery("Access denied", { show_alert: true });
    const banned = loadBannedUsers();
    await ctx.answerCbQuery();
    if (banned.length === 0) return ctx.reply("The blacklist is empty.");
    await ctx.reply(`Banned IDs:\n\`\`\`json\n${JSON.stringify(banned, null, 2)}\n\`\`\``, { parse_mode: 'MarkdownV2' });
});

bot.action('show_stats', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return ctx.answerCbQuery("Access denied", { show_alert: true });
    await ctx.answerCbQuery();
    await ctx.reply(getStats(), { parse_mode: 'Markdown' });
});

bot.action('show_users', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return ctx.answerCbQuery("Access denied", { show_alert: true });
    await ctx.answerCbQuery();
    
    if (userActivity.size === 0) {
        return ctx.reply("No user activity recorded yet.");
    }
    
    let userList = '👥 **ACTIVE USERS**\n\n';
    let i = 1;
    for (const [userId, data] of userActivity) {
        const isBanned = loadBannedUsers().includes(userId);
        const status = isBanned ? '🚫' : '✅';
        userList += `${i}. ${status} ID: \`${userId}\` | Requests: ${data.requests} | Last: ${data.lastRequest}\n`;
        i++;
    }
    
    const parts = splitMessage(userList);
    for (const part of parts) {
        await ctx.reply(part, { parse_mode: 'Markdown' });
    }
});

bot.action('settings_menu', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return ctx.answerCbQuery("Access denied", { show_alert: true });
    await ctx.answerCbQuery();
    await ctx.reply('⚙️ **SETTINGS PANEL**', {
        parse_mode: 'Markdown',
        ...getSettingsKeyboard()
    });
});

bot.action('adjust_ratelimit', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return ctx.answerCbQuery("Access denied", { show_alert: true });
    await ctx.answerCbQuery();
    await ctx.reply('Send: /limit [N] to change rate limit (e.g., /limit 20)');
});

bot.action('adjust_temp', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return ctx.answerCbQuery("Access denied", { show_alert: true });
    await ctx.answerCbQuery();
    await ctx.reply('🌡️ Temperature controls creativity (0.0-1.0). Lower = focused, Higher = creative. Current: 0.5');
});

bot.action('back_to_menu', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return ctx.answerCbQuery("Access denied", { show_alert: true });
    await ctx.answerCbQuery();
    await ctx.editMessageText('GuardAI Control Panel:', getAdminKeyboard());
});

bot.action('help_menu', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.reply("I am GuardAI, an AI assistant. Send me a question and I will help you.");
    }
    await ctx.answerCbQuery();
    await ctx.reply(`🛠️ **ADMINISTRATOR COMMANDS**\n\n/menu — Show control panel\n/stats — View statistics\n/ban [ID] — Ban a user\n/unban [ID] — Unban a user\n/limit [N] — Set rate limit\n\n📌 Click buttons in /menu for quick access.`, { parse_mode: 'Markdown' });
});

bot.command('ban', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const args = ctx.message.text.trim().split(/\s+/);
    if (args.length < 2) return ctx.reply("Usage: /ban [ID]");
    const targetId = parseInt(args[1], 10);
    if (isNaN(targetId) || targetId <= 0) return ctx.reply("❌ Invalid ID. Must be a positive number.");
    
    if (targetId === OWNER_ID) return ctx.reply("❌ Cannot ban the owner.");
    
    banUser(targetId);
    logger.warn(`USER MANUALLY BANNED: ID ${targetId}`);
    ctx.reply(`✅ User ${targetId} has been added to the blacklist.\n📊 Total banned: ${loadBannedUsers().length}`);
});

bot.command('unban', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const args = ctx.message.text.trim().split(/\s+/);
    if (args.length < 2) return ctx.reply("Usage: /unban [ID]");
    const targetId = parseInt(args[1], 10);
    if (isNaN(targetId) || targetId <= 0) return ctx.reply("❌ Invalid ID. Must be a positive number.");
    
    if (unbanUser(targetId)) {
        logger.info(`USER UNBANNED: ID ${targetId}`);
        ctx.reply(`✅ User ${targetId} has been unbanned.\n📊 Total banned: ${loadBannedUsers().length}`);
    } else {
        ctx.reply(`❌ ID not found in the ban list.`);
    }
});

bot.command('stats', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return ctx.reply("Admin only.");
    ctx.reply(getStats(), { parse_mode: 'Markdown' });
});

bot.command('limit', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const args = ctx.message.text.trim().split(/\s+/);
    if (args.length < 2) return ctx.reply("Usage: /limit [N] (N = requests per minute)");
    const newLimit = parseInt(args[1], 10);
    if (isNaN(newLimit) || newLimit <= 0) return ctx.reply("❌ Invalid limit. Must be positive.");
    
    RATE_LIMIT_MAX = newLimit;
    logger.info(`Rate limit changed to ${newLimit}/min`);
    ctx.reply(`✅ Rate limit updated to ${newLimit} requests/minute.`);
});

// ==========================================
// 6. MESSAGE PROCESSING & LOGGING
// ==========================================
bot.on('message', async (ctx) => {
    const textPrompt = ctx.message.text || ctx.message.caption || '';
    const hasPhoto = ctx.message.photo;

    if (!textPrompt && !hasPhoto) {
        return ctx.reply("Please send text or an image for analysis.");
    }

    // Validate input
    const validation = validateInput(textPrompt, hasPhoto);
    if (!validation.valid) {
        return ctx.reply(`❌ ${validation.error}`);
    }

    ctx.sendChatAction('typing');

    try {
        let response;
        const startTime = Date.now();
        
        if (hasPhoto) {
            const photoArray = ctx.message.photo;
            const fileId = photoArray[photoArray.length - 1].file_id;
            
            try {
                const fileLink = await ctx.telegram.getFileLink(fileId);
                const imageResponse = await axios.get(fileLink.href, { responseType: 'arraybuffer', timeout: 30000 });
                const base64Image = Buffer.from(imageResponse.data, 'binary').toString('base64');

                response = await axios.post(OLLAMA_BASE_URL, {
                    model: 'llava:7b',
                    prompt: textPrompt || 'Analyze this image.',
                    images: [base64Image],
                    stream: false,
                    options: { temperature: 0.3 }
                }, { timeout: 120000 });
            } catch (photoError) {
                logger.error(`Photo processing error: ${photoError.message}`);
                return ctx.reply(`❌ Failed to process image: ${photoError.message.includes('timeout') ? 'Request timeout' : 'Invalid image format'}`);
            }
        } else {
            try {
                response = await axios.post(OLLAMA_BASE_URL, {
                    model: 'qwen2.5:7b',
                    prompt: `${SYSTEM_PROMPTS[currentMode]}\n\nUser: ${textPrompt}\nResponse:`,
                    stream: false,
                    options: { temperature: 0.5 }
                }, { timeout: 90000 });
            } catch (apiError) {
                if (apiError.code === 'ECONNREFUSED') {
                    logger.error(`Ollama not running: ${apiError.message}`);
                    return ctx.reply(`❌ Ollama server is not running. Please start Ollama and try again.`);
                } else if (apiError.code === 'ENOTFOUND') {
                    logger.error(`Ollama host not found: ${apiError.message}`);
                    return ctx.reply(`❌ Cannot reach Ollama server. Check OLLAMA_URL configuration.`);
                } else {
                    throw apiError;
                }
            }
        }

        const aiResponse = response.data.response;
        const processingTime = Math.round((Date.now() - startTime) / 1000);
        
        // Track statistics
        stats.totalRequests++;
        stats.responseTimes.push(processingTime);
        if (stats.responseTimes.length > 100) stats.responseTimes.shift();
        trackUserActivity(ctx.from.id, 'message');
        
        // Split response if it exceeds Telegram's limit
        const messageParts = splitMessage(aiResponse);
        
        for (let i = 0; i < messageParts.length; i++) {
            if (ctx.from.id === OWNER_ID && i === messageParts.length - 1) {
                // Only show admin keyboard on the last message
                await ctx.reply(messageParts[i], getAdminKeyboard());
            } else {
                await ctx.reply(messageParts[i]);
            }
        }

        const shortPrompt = textPrompt.length > 35 ? textPrompt.substring(0, 32) + '...' : textPrompt;
        const shortAnswer = aiResponse.length > 50 ? aiResponse.replace(/\n/g, ' ').substring(0, 47) + '...' : aiResponse.replace(/\n/g, ' ');
        logger.info(`[${processingTime}s] ${ctx.from.id} (${currentMode}): "${shortPrompt}" → "${shortAnswer}"`);

    } catch (error) {
        logger.error(`Ollama API Error: ${error.message}`);
        const errorMsg = error.message.includes('ECONNREFUSED') 
            ? "❌ Cannot connect to Ollama. Is it running?"
            : error.message.includes('timeout')
            ? "⏱️ Request timeout. Ollama is taking too long. Try a simpler prompt."
            : `❌ Error: ${error.message.substring(0, 100)}`;
        
        await ctx.reply(errorMsg);
    }
});

// ==========================================
// 7. LAUNCH BOT
// ==========================================
async function startBot() {
    logger.info("🚀 Checking Ollama connection...");
    const ollamaHealthy = await checkOllamaHealth();
    
    if (!ollamaHealthy) {
        logger.warn("⚠️  WARNING: Ollama server is not responding. Bot will continue but may fail on requests.");
    } else {
        logger.info("✅ Ollama connection verified.");
    }
    
    bot.launch().then(() => {
        logger.info("🛡️  GuardAI successfully initialized and secured. Listening for commands...");
    }).catch((err) => {
        logger.error(`Startup error: ${err.message}`);
        process.exit(1);
    });
}

startBot();

process.once('SIGINT', () => {
    logger.info("Shutting down gracefully...");
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    logger.info("Shutting down gracefully...");
    bot.stop('SIGTERM');
});