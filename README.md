# GuardAI 🛡️

An advanced, local-first Telegram bot designed for cybersecurity analysis, penetration testing support, and secure IT assistance. GuardAI leverages local Large Language Models (LLMs) via [Ollama](https://ollama.ai) to ensure **complete data privacy and security** with no external API dependencies.

**`qwen2.5:7b`** for text analysis • **`llava:7b`** for vision tasks • **100% Local** • **Zero Cloud Dependency**

---

## 📋 Table of Contents

- [Key Features](#-key-features)
- [What's New](#-whats-new)
- [System Requirements](#-system-requirements)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Usage & Commands](#-usage--commands)
- [Configuration](#-configuration)
- [Troubleshooting](#-troubleshooting)
- [Tech Stack](#-tech-stack)
- [Contributing](#-contributing)
- [License](#-license)
- [Author](#-author)

---

## 🚀 Key Features

### 🔐 Privacy & Security First
- **Local-First Architecture**: Powered by Ollama running locally—no external API keys or third-party data sharing
- **Persistent Blacklist**: Built-in ban management with `banned_users.json` for access control
- **Owner-Only Commands**: Secure admin panel restricted to owner access
- **Comprehensive Logging**: Winston-based logging with audit trail

### 🧠 Dual Intelligence Modes
- **🔒 Cyber Mode**: Specialized for vulnerability analysis, security code review, and penetration testing
- **🌐 General Mode**: Versatile IT assistant for standard queries and technical support
- **One-Click Mode Switching**: Toggle between modes instantly from admin panel

### 📸 Multimodal AI Processing
- **Image Analysis**: Send network diagrams, error screenshots, code snippets for visual AI analysis
- **Text Processing**: Deep analysis of security logs, configurations, and code
- **Smart Routing**: Automatically selects optimal model (qwen2.5 for text, llava for images)

### ⚡ Production-Ready Reliability
- **Rate Limiting**: 10 requests/minute per user to prevent abuse (owners exempt)
- **Message Chunking**: Automatically splits long responses to respect Telegram's 4096-char limit
- **Smart Error Handling**: Specific error messages for connection failures, timeouts, and invalid input
- **Health Checks**: Automatic Ollama connectivity verification on startup
- **Input Validation**: Prevents oversized requests before sending to Ollama

### 📊 Advanced Logging
- Processing time tracking for each request
- User interaction audit trail
- Graceful error handling with detailed logs
- JSON-formatted ban list for easy management

---

## ✨ What's New

### Latest Improvements (v1.1.0)
- ✅ **Rate Limiting**: Prevent bot spam with configurable per-user limits
- ✅ **Message Chunking**: Long AI responses automatically split into multiple messages
- ✅ **Ollama Health Check**: Verifies Ollama is running before processing requests
- ✅ **Better Error Messages**: User-friendly error descriptions with specific failure reasons
- ✅ **Input Validation**: Validates text/image sizes before processing
- ✅ **Improved Command Parsing**: Robust argument parsing with validation
- ✅ **Processing Time Tracking**: Logs how long each request takes
- ✅ **Graceful Shutdown**: Clean shutdown on SIGINT/SIGTERM signals

---

## 💻 System Requirements

| Component | Requirement |
|-----------|-------------|
| **OS** | Windows, macOS, or Linux |
| **Node.js** | v18 or higher |
| **RAM** | Minimum 8GB (16GB+ recommended for smooth Ollama operation) |
| **Disk Space** | ~5GB for Ollama models |
| **Ollama** | Latest version from [ollama.ai](https://ollama.ai) |

---

## 🎯 Quick Start

### 1. Prerequisites
```bash
# Install Node.js v18+ from https://nodejs.org
# Install Ollama from https://ollama.ai

# Download required models
ollama pull qwen2.5:7b
ollama pull llava:7b

# Start Ollama (runs on http://localhost:11434)
ollama serve
```

### 2. Setup Bot
```bash
# Clone repository
git clone https://github.com/your-username/guardai.git
cd guardai

# Install dependencies
npm install

# Create .env file
echo BOT_TOKEN=your_telegram_token_here > .env
echo OWNER_ID=your_telegram_id_here >> .env
echo OLLAMA_URL=http://localhost:11434/api/generate >> .env

# Run bot
node index.js
```

### 3. Start Using
- Open Telegram and find your bot
- Send `/start` to initialize
- Send a text message or image for analysis
- Send `/menu` (as owner) to access admin controls

---

## ⚙️ Installation

### Step 1: Prerequisites
Ensure you have the following installed on your system:
- **Node.js** v18 or higher ([download](https://nodejs.org))
- **Ollama** ([download](https://ollama.ai))

### Step 2: Download Ollama Models
```bash
ollama pull qwen2.5:7b    # Text analysis model (~4GB)
ollama pull llava:7b      # Vision analysis model (~4GB)
```

### Step 3: Clone Repository
```bash
git clone https://github.com/your-username/guardai.git
cd guardai
npm install
```

### Step 4: Environment Configuration
Create a `.env` file in the root directory:

```env
# Telegram Bot Token (get from @BotFather)
BOT_TOKEN=your_telegram_bot_token_here

# Your Telegram numeric ID (get from @userinfobot)
OWNER_ID=your_telegram_numeric_id_here

# Ollama API endpoint (default: localhost:11434)
OLLAMA_URL=http://localhost:11434/api/generate
```

**Getting Your Telegram ID:**
1. Open Telegram
2. Search for `@userinfobot`
3. Send `/start` - it will show your numeric ID

**Getting Bot Token:**
1. Search for `@BotFather` on Telegram
2. Send `/newbot`
3. Follow the prompts and copy the token

### Step 5: Run the Bot

```bash
# Make sure Ollama is running in another terminal: ollama serve

# Start the bot
node index.js

# Expected output:
# [timestamp] [info]: 🚀 Checking Ollama connection...
# [timestamp] [info]: ✅ Ollama connection verified.
# [timestamp] [info]: 🛡️  GuardAI successfully initialized and secured...
```

---

## 📱 Usage & Commands

### User Commands
| Command | Description |
|---------|-------------|
| `/start` | Initialize the bot and get welcome message |
| Send text/image | Analyze with current AI model |

### Owner Commands
| Command | Description |
|---------|-------------|
| `/menu` | Show admin control panel |
| `/ban [ID]` | Ban a user by their numeric ID |
| `/unban [ID]` | Remove a user from ban list |

### Admin Panel (via `/menu`)
- **🔄 Mode: [current]** - Toggle between Cyber/General modes
- **📋 Ban List** - View all banned user IDs
- **🛠 Help** - Show admin commands reference

### Example Interactions

**Analyzing Security Code:**
```
User: Please analyze this code for SQL injection vulnerabilities
Bot: [Detailed security analysis in Cyber mode]
```

**Image Analysis:**
```
User: [Send network diagram screenshot]
[Optional caption: "Is this network architecture secure?"]
Bot: [Visual analysis and recommendations]
```

**Mode Switching (Owner):**
```
Owner: /menu
Bot: [Shows control panel]
Owner: [Click 🔄 Mode button]
Bot: Mode changed to: general
```

---

## 🔧 Configuration

### Adjusting Rate Limits

Edit `index.js` to customize rate limiting:

```javascript
const RATE_LIMIT_WINDOW = 60000;  // 1 minute
const RATE_LIMIT_MAX = 10;        // 10 requests per user per window
```

### Changing System Prompts

Modify the `SYSTEM_PROMPTS` object in `index.js`:

```javascript
const SYSTEM_PROMPTS = {
    cyber: "Your custom cybersecurity prompt here...",
    general: "Your custom general assistant prompt here..."
};
```

### Ollama Model Selection

Edit the model names in the `/on('message')` handler:
```javascript
model: 'qwen2.5:7b',  // Change to other Ollama models
```

Available models: `ollama list`

---

## 🆘 Troubleshooting

### ❌ "Ollama server is not running"
```bash
# Solution: Start Ollama in a separate terminal
ollama serve
```

### ❌ "Cannot reach Ollama server"
```bash
# Solution: Verify OLLAMA_URL in .env
# Default: http://localhost:11434/api/generate

# Check if Ollama is accessible
curl http://localhost:11434/api/tags
```

### ❌ "Bot token is missing"
```bash
# Solution: Check .env file exists and contains BOT_TOKEN
# Verify token is valid from @BotFather
cat .env
```

### ❌ "Rate limit exceeded"
**Cause**: User sent more than 10 requests in 1 minute  
**Solution**: Wait for the timer to reset (shown in error message)  
**Note**: Owner (OWNER_ID) is exempt from rate limits

### ❌ "Request timeout"
**Cause**: Ollama taking too long to generate response  
**Solution**: 
- Try a simpler prompt
- Ensure Ollama has enough system resources
- Check if CPU/GPU is available: `ollama list`

### ❌ "Image analysis not working"
```bash
# Solution: Verify llava model is installed
ollama pull llava:7b

# Check image format (JPEG, PNG, WebP supported)
```

### 📊 Checking Logs
```bash
# View real-time logs
tail -f logs/guardai.log

# Search logs for errors
grep ERROR logs/guardai.log
```

---

## 🛠️ Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | JavaScript runtime | v18+ |
| **Telegraf** | Telegram bot framework | ^4.16.3 |
| **Ollama** | Local LLM inference engine | Latest |
| **Axios** | HTTP client for API calls | ^1.18.1 |
| **Winston** | Structured logging | ^3.19.0 |
| **dotenv** | Environment variable management | ^17.4.2 |

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Setup
```bash
npm install
npm run dev  # Requires nodemon for auto-restart
```

### Code Style
- Use clear variable names
- Add comments for complex logic
- Follow ESLint best practices
- Test with multiple input types

---

## 📄 License

This project is open source and available under the MIT License.

---

## 👨‍💻 Author

**Kalbek Aziz**

Created as part of an advanced cybersecurity and AI portfolio project.

---

## 🚀 Roadmap

- [ ] Multi-language support
- [ ] Web UI dashboard
- [ ] Custom model fine-tuning
- [ ] Conversation history/memory
- [ ] Plugin system for custom commands
- [ ] Docker containerization
- [ ] Database integration for analytics

---

**Need Help?** Open an issue or check the troubleshooting section above!