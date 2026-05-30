require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const waSession  = require('./utils/whatsappSession');
const { router: waRouter } = require('./routes/whatsapp');

const app = express();

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3002'], credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/visitors',      require('./routes/visitors'));
app.use('/api/hosts',         require('./routes/hosts'));
app.use('/api/scheduled',     require('./routes/scheduled'));
app.use('/api/blacklist',     require('./routes/blacklist'));
app.use('/api/locations',     require('./routes/locations'));
app.use('/api/settings',      require('./routes/settings'));
app.use('/api/whatsapp',      waRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`🚀 SHIVOFFSET VMS API running on http://localhost:${PORT}`);
      console.log(`   Default login: admin / admin123  or  guard / guard123`);
    });
    // Auto-reconnect WhatsApp QR session if a saved session exists on disk
    waSession.autoReconnect();
  } catch (e) {
    console.error('❌ Failed to start server:', e.message);
    process.exit(1);
  }
}

start();
