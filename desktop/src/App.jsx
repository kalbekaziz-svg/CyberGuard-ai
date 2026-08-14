import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

function App() {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [mode, setMode] = useState('login');

    const login = async () => {
        try {
            const res = await API.post('/auth/login', { email, password });
            setToken(res.data.token);
            localStorage.setItem('token', res.data.token);
            setEmail(''); setPassword('');
        } catch (err) {
            alert('Ошибка: ' + err.response?.data?.error);
        }
    };

    const register = async () => {
        try {
            const res = await API.post('/auth/register', { email, username, password, passwordConfirm: password });
            setToken(res.data.token);
            localStorage.setItem('token', res.data.token);
            setEmail(''); setPassword(''); setUsername('');
        } catch (err) {
            alert('Ошибка: ' + err.response?.data?.error);
        }
    };

    const sendPrompt = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        try {
            const res = await API.post('/ai/text', { prompt, mode: 'general' }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResponse(res.data.response);
            setPrompt('');
        } catch (err) {
            setResponse('Ошибка: ' + err.response?.data?.error);
        }
        setLoading(false);
    };

    if (!token) return (
        <div className="auth-container">
            <h1>🛡️ GuardAI</h1>
            <div className="auth-box">
                <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                {mode === 'register' && <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />}
                <button onClick={mode === 'login' ? login : register}>{mode === 'login' ? 'Login' : 'Register'}</button>
                <button className="toggle" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
                    {mode === 'login' ? 'Нету аккаунта? Регистр' : 'Уже есть аккаунт? Логин'}
                </button>
            </div>
        </div>
    );

    return (
        <div className="chat-container">
            <div className="header">
                <h1>GuardAI Desktop</h1>
                <button className="logout" onClick={() => { setToken(null); localStorage.removeItem('token'); }}>Logout</button>
            </div>
            <div className="chat-box">
                <div className="messages">
                    {response && <div className="message bot">{response}</div>}
                </div>
                <div className="input-area">
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Задай вопрос..." />
                    <button onClick={sendPrompt} disabled={loading}>{loading ? 'Загрузка...' : 'Отправить'}</button>
                </div>
            </div>
        </div>
    );
}

export default App;
