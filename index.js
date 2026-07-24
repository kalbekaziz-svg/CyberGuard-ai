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
// 4. MIDDLEWARE: ACCESS CONTROL (BAN LIST)
// ==========================================
bot.use(async (ctx, next) => {
    const userId = ctx.from ? ctx.from.id : null;
    if (!userId) return;

    const bannedUsers = loadBannedUsers();
    if (bannedUsers.includes(userId)) {
        return; // Silently ignore banned users
    }

    return next();
});

// Admin keyboard
const getAdminKeyboard = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback(`🔄 Mode: ${currentMode}`, 'toggle_mode')],
        [Markup.button.callback('📋 Ban List', 'show_bans'), Markup.button.callback('🛠 Help', 'help_menu')]
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

bot.action('help_menu', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.reply("I am GuardAI, an AI assistant. Send me a question and I will help you.");
    }
    await ctx.answerCbQuery();
    await ctx.reply("Administrator commands:\n/menu — Control buttons\n/ban [ID] — Ban a violator\n/unban [ID] — Unban a user");
});

bot.command('ban', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply("Usage: /ban [ID]");
    const targetId = parseInt(args[1], 10);
    if (isNaN(targetId)) return ctx.reply("Invalid ID.");
    
    banUser(targetId);
    logger.warn(`USER MANUALLY BANNED: ID ${targetId}`);
    ctx.reply(`User ${targetId} has been added to the blacklist.`);
});

bot.command('unban', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply("Usage: /unban [ID]");
    const targetId = parseInt(args[1], 10);
    
    if (unbanUser(targetId)) {
        logger.info(`USER UNBANNED: ID ${targetId}`);
        ctx.reply(`User ${targetId} has been unbanned.`);
    } else {
        ctx.reply(`ID not found in the ban list.`);
    }
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

    ctx.sendChatAction('typing');

    try {
        let response;
        if (hasPhoto) {
            const photoArray = ctx.message.photo;
            const fileId = photoArray[photoArray.length - 1].file_id;
            const fileLink = await ctx.telegram.getFileLink(fileId);

            const imageResponse = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
            const base64Image = Buffer.from(imageResponse.data, 'binary').toString('base64');

            response = await axios.post(OLLAMA_BASE_URL, {
                model: 'llava:7b',
                prompt: textPrompt || 'Analyze this image.',
                images: [base64Image],
                stream: false,
                options: { temperature: 0.3 }
            }, { timeout: 90000 });
        } else {
            response = await axios.post(OLLAMA_BASE_URL, {
                model: 'qwen2.5:7b',
                prompt: `${SYSTEM_PROMPTS[currentMode]}\n\nUser: ${textPrompt}\nResponse:`,
                stream: false,
                options: { temperature: 0.5 }
            }, { timeout: 60000 });
        }

        const aiResponse = response.data.response;
        
        if (ctx.from.id === OWNER_ID) {
            await ctx.reply(aiResponse, getAdminKeyboard());
        } else {
            await ctx.reply(aiResponse);
        }

        const shortPrompt = textPrompt.length > 35 ? textPrompt.substring(0, 32) + '...' : textPrompt;
        const shortAnswer = aiResponse.length > 50 ? aiResponse.replace(/\n/g, ' ').substring(0, 47) + '...' : aiResponse.replace(/\n/g, ' ');
        logger.info(`Request from ID ${ctx.from.id} (${currentMode}): "${shortPrompt}" | AI Response: "${shortAnswer}"`);

    } catch (error) {
        logger.error(`Ollama API Error: ${error.message}`);
        await ctx.reply("Error connecting to the local Ollama server.");
    }
});

// ==========================================
// 7. LAUNCH BOT
// ==========================================
bot.launch().then(() => {
    logger.info("GuardAI successfully initialized and secured. Listening for commands...");
}).catch((err) => {
    logger.error(`Startup error: ${err.message}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));