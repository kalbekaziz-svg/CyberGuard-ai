GuardAI 🛡️
GuardAI is an advanced, local-first Telegram bot designed for cybersecurity analysis, penetration testing support, and secure IT assistance. It leverages local Large Language Models (LLMs) via Ollama (⁠qwen2.5:7b⁠ for text and ⁠llava:7b⁠ for vision tasks) to ensure complete data privacy and security.
🚀 Key Features
 Local-First & Privacy-Focused: Powered by Ollama running locally—no external API keys or third-party data sharing required.
 Dual Operation Modes:
 🔒 Cyber Mode: Specialized prompt tuning for deep vulnerability analysis, security code review, and log inspection.
 🌐 General Mode: Versatile assistant mode for standard IT tasks and technical queries.
 Multimodal Capabilities: Send images (network diagrams, error screenshots, code snippets) for AI-driven visual analysis.
 Built-in Access Control: Secure owner-only command panels and a persistent blacklist (⁠banned_users.json⁠) to manage unauthorized access.
 Advanced Logging: Comprehensive logging via Winston for tracking interactions and debugging.
🛠️ Tech Stack
 Node.js (JavaScript runtime)
 Telegraf (Modern Telegram Bot framework)
 Ollama (Local LLM runner: ⁠qwen2.5:7b⁠, ⁠llava:7b⁠)
 Axios (HTTP client for API requests)
 Winston (Logging library)
⚙️ Installation & Setup
1. Prerequisites
Ensure you have the following installed on your system:
 Node.js (v18 or higher)
 Ollama running locally with the required models downloaded:
⁠ollama pull qwen2.5:7b⁠
⁠ollama pull llava:7b⁠
2. Clone the Repository
⁠git clone [https://github.com/your-username/guard-ai.git](https://github.com/your-username/guard-ai.git)⁠
⁠cd guard-ai⁠
3. Install Dependencies
⁠npm install⁠
4. Configure Environment Variables
Create a ⁠.env⁠ file in the root directory and fill it with your credentials:
⁠BOT_TOKEN=your_telegram_bot_token_here⁠
⁠OWNER_ID=your_telegram_numeric_id_here⁠
⁠OLLAMA_URL=http://localhost:11434/api/generate⁠
5. Run the Bot
 Development mode (with auto-restart):
⁠npm run dev⁠
 Production mode:
⁠npm start⁠
👨‍💻 Author Kalbek Aziz
Created as part of an advanced cybersecurity and AI portfolio.