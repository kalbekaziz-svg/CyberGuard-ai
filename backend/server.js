require('dotenv').config();

const express = require('express');
const cors = require('cors');
const config = require('./config');

const aiRoutes = require('./routes/ai');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok', message: 'GuardAI Backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

const PORT = config.PORT;
app.listen(PORT, () => {
    console.log(`🛡️  GuardAI Backend на http://localhost:${PORT}`);
});
