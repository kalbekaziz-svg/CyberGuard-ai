const axios = require('axios');
const config = require('../config');

class AIService {
    static async processText(prompt, mode = 'general') {
        const prompts = {
            cyber: "Ты GuardAI, эксперт по кибербезопасности. Анализируй уязвимости профессионально на English.",
            general: "Ты GuardAI, IT ассистент. Помогай ясно и структурировано на English."
        };
        
        try {
            const res = await axios.post(config.OLLAMA_URL, {
                model: 'qwen2.5:7b',
                prompt: `${prompts[mode]}\n\nUser: ${prompt}\nResponse:`,
                stream: false,
                options: { temperature: 0.5 }
            }, { timeout: 90000 });
            return { success: true, response: res.data.response, model: 'qwen2.5:7b' };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    static async processImage(base64, prompt = 'Analyze this image.') {
        try {
            const res = await axios.post(config.OLLAMA_URL, {
                model: 'llava:7b',
                prompt,
                images: [base64],
                stream: false,
                options: { temperature: 0.3 }
            }, { timeout: 120000 });
            return { success: true, response: res.data.response, model: 'llava:7b' };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    static async checkHealth() {
        try {
            await axios.post(config.OLLAMA_URL, {
                model: 'qwen2.5:7b',
                prompt: 'test',
                stream: false
            }, { timeout: 5000 });
            return true;
        } catch { return false; }
    }
}

module.exports = AIService;
