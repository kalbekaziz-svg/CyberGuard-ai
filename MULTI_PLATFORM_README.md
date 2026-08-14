# GuardAI 2.0 🛡️ - Multi-Platform Edition

**Local AI Assistant** для Telegram, Web, Desktop (Windows/Mac/Linux) и Mobile (iOS/Android) - всё с одним бэкендом!

## 📋 Структура проекта

```
guardai/
├── index.js                    # Telegram Bot (основной, не трогали)
├── backend/                    # Express API Server (новый)
│   ├── server.js
│   ├── config.js
│   ├── db.js
│   ├── services/
│   ├── middleware/
│   └── routes/
├── desktop/                    # Electron App (Windows/Mac/Linux)
│   ├── package.json
│   ├── src/
│   └── public/
├── mobile/                     # React Native (iOS/Android)
│   ├── package.json
│   ├── App.js
│   └── screens/
└── package.json               # Root scripts
```

## 🚀 Быстрый старт

### 1. Установка всех зависимостей
```bash
npm run install:all
```

### 2. Запуск Telegram Bot (как раньше)
```bash
npm start
```

### 3. Запуск Backend API
```bash
npm run backend
# или с автоперезагрузкой:
npm run backend:dev
```
Бэкенд будет на `http://localhost:5000`

### 4. Запуск Desktop App (Electron)
```bash
npm run desktop
```
Откроется окно Electron приложения на Windows/Mac/Linux

### 5. Запуск Mobile App (React Native)
```bash
# Для Android
cd mobile && npm run android

# Для iOS
cd mobile && npm run ios
```

## 🔐 API Endpoints

### Аутентификация (`/api/auth`)
```bash
POST /register       # Регистрация
POST /login         # Логин
POST /telegram      # Вход через Telegram ID
GET  /me           # Текущий пользователь
```

### AI Запросы (`/api/ai`)
```bash
POST /text         # Текстовой запрос к AI
POST /image        # Анализ изображения
GET  /health       # Проверка Ollama
```

### Админ Панель (`/api/admin`)
```bash
GET  /stats        # Статистика
GET  /users        # Все пользователи
POST /ban/:id      # Забанить пользователя
POST /unban/:id    # Разбанить
```

## 📱 Платформы

### Telegram Bot 📲
- **Статус**: Работает как раньше
- **Команды**: `/start`, `/menu`, `/stats`, `/ban`, `/limit`
- **Файл**: `index.js`
- **Режимы**: Cyber/General
- **Admin Panel**: Встроенная клавиатура

### Desktop App 🖥️
- **Платформы**: Windows, macOS, Linux
- **Технология**: Electron + React
- **UI**: Темная тема с градиентами
- **Функции**: Чат, регистрация, админ панель
- **Запуск**: `npm run desktop`

### Mobile App 📱
- **Платформы**: iOS, Android
- **Технология**: React Native
- **UI**: Native компоненты
- **Функции**: Чат, логин, статистика
- **Запуск**: `npm run android` или `npm run ios`

### Backend API 🔌
- **Технология**: Express.js
- **База**: SQLite (`data/guardai.db`)
- **Аутентификация**: JWT токены
- **Rate Limiting**: 10 requests/min на юзера
- **Запуск**: `npm run backend`

## 🛠️ Конфигурация

Создай `.env` файл:

```env
# Telegram Bot (если используешь)
BOT_TOKEN=your_token_here
OWNER_ID=your_id_here

# Backend
PORT=5000
NODE_ENV=development
DB_PATH=./data/guardai.db
OLLAMA_URL=http://localhost:11434/api/generate
JWT_SECRET=your-secret-key-change-in-production
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW=60000
```

## 📊 Особенности

✅ **Единый бэкенд** - все платформы используют одно API  
✅ **Telegram Bot** - классический интерфейс остался без изменений  
✅ **Аутентификация** - JWT токены для веб/мобилки  
✅ **Админ Панель** - везде统一 интерфейс управления  
✅ **Rate Limiting** - защита от спама  
✅ **Offline готовность** - локальная БД SQLite  
✅ **Cross-Platform** - один код работает везде  

## 🔄 Архитектура

```
┌─────────────────────────────────────┐
│  Пользователи                       │
│  Telegram │ Desktop │ Mobile │ Web  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Express API Backend                │
│  • Ollama AI                        │
│  • User Management                  │
│  • Statistics                       │
│  • Rate Limiting                    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  SQLite Database                    │
│  • users, activity, bans            │
└─────────────────────────────────────┘
```

## 🔌 Отличия платформ

| Функция | Telegram | Desktop | Mobile |
|---------|----------|---------|--------|
| Чат | ✅ | ✅ | ✅ |
| Регистрация | ❌ | ✅ | ✅ |
| Админ панель | ✅ | ✅ | ✅ |
| Картинки | ✅ | ✅ | ✅ |
| Mode переключение | ✅ | ✅ | ✅ |
| Offline | ❌ | ✅ | Partial |

## 📝 Разработка

### Для Desktop
```bash
cd desktop
npm install
npm start
```

### Для Mobile
```bash
cd mobile
npm install
npm start
# потом в другом терминале:
npm run android
```

### Для Backend
```bash
npm run backend:dev  # с автоперезагрузкой
```

## 🐛 Troubleshooting

**"Cannot connect to Ollama"**
```bash
# Проверь что Ollama запущена:
ollama serve
```

**"Port 5000 already in use"**
```bash
# Измени PORT в .env
PORT=5001
```

**"Module not found"**
```bash
npm run install:all  # переустанови всё
```

## 🚀 Развёртывание

### Production Deploy
1. Собери Desktop: `cd desktop && npm run build`
2. Собери Mobile: `cd mobile && npm run android/ios`
3. Запусти Backend на сервере
4. Обнови API_URL в конфигах

## 📄 Лицензия

MIT

---

**Создано**: 2026-08-14  
**Версия**: 2.0.0 - Multi-Platform Edition  
**Автор**: Kalbek Aziz  
**Статус**: Production Ready 🚀
