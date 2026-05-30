/**
 * WhatsApp routes — QR Scan + Meta Cloud API
 * GET  /api/whatsapp/status        → QR session status + QR image
 * POST /api/whatsapp/connect       → start QR session
 * POST /api/whatsapp/disconnect    → logout + clear session
 * POST /api/whatsapp/test          → send test message
 */

const router    = require('express').Router();
const https     = require('https');
const waSession = require('../utils/whatsappSession');
const { authMiddleware } = require('../middleware/auth');
const { getPool, sql }   = require('../db');

router.use(authMiddleware);

// ─── Helper: get WA API settings from DB ─────────────────────────────────────
async function getWASettings() {
  const pool = await getPool();
  const r = await pool.request().query(
    `SELECT settingKey, settingValue FROM vms_settings WHERE settingKey IN ('wa_token','wa_phone_id','wa_mode')`,
  );
  const map = {};
  r.recordset.forEach(row => { map[row.settingKey] = row.settingValue; });
  return map;
}

// ─── Helper: Meta Cloud API send ─────────────────────────────────────────────
function metaSend(phoneId, token, toPhone, message) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      messaging_product: 'whatsapp',
      to: toPhone,
      type: 'text',
      text: { body: message },
    });
    const options = {
      hostname: 'graph.facebook.com',
      path: `/v19.0/${phoneId}/messages`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Core send function — QR first, then Meta API ────────────────────────────
async function sendWhatsApp(toPhone, message) {
  const phone = waSession.normalizePhone(toPhone);
  if (!phone || phone.length < 10) throw new Error('Invalid phone: ' + toPhone);

  // Mode 1: QR session
  const qrStat = waSession.getStatus();
  if (qrStat.status === 'connected') {
    await waSession.sendMessage(phone, message);
    return { mode: 'qr' };
  }

  // Mode 2: Meta Cloud API
  const cfg = await getWASettings();
  if (!cfg.wa_token || !cfg.wa_phone_id) {
    throw new Error('WhatsApp not configured. Connect via QR scan or add API credentials in Settings.');
  }
  const result = await metaSend(cfg.wa_phone_id, cfg.wa_token, phone, message);
  console.log(`✅ [WA-API] Sent → ${phone} | HTTP ${result.status}`);
  return { mode: 'api', status: result.status };
}

// Export so other routes (visitors.js) can use it
module.exports.sendWhatsApp = sendWhatsApp;

// ─── QR endpoints ─────────────────────────────────────────────────────────────

// GET /api/whatsapp/status
router.get('/status', (req, res) => {
  res.json(waSession.getStatus());
});

// POST /api/whatsapp/connect
router.post('/connect', async (req, res) => {
  try {
    await waSession.connect();
    res.json({ ok: true, message: 'QR generation started. Scan with WhatsApp.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/whatsapp/disconnect
router.post('/disconnect', async (req, res) => {
  try {
    await waSession.disconnect();
    res.json({ ok: true, message: 'Disconnected and session cleared.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/whatsapp/test  { phone, message? }
router.post('/test', async (req, res) => {
  const { phone, message } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone required' });
  try {
    const result = await sendWhatsApp(phone, message || '✅ Test message from SHIVOFFSET VMS — WhatsApp connected!');
    res.json({ ok: true, mode: result.mode, message: `Sent to ${phone}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET  /api/whatsapp/settings  — wa_token, wa_phone_id (masked)
router.get('/settings', async (req, res) => {
  try {
    const cfg = await getWASettings();
    res.json({
      wa_phone_id: cfg.wa_phone_id || '',
      wa_token:    cfg.wa_token    ? '••••••••' : '',
      wa_mode:     cfg.wa_mode     || 'qr',
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/whatsapp/settings  { wa_token, wa_phone_id }
router.put('/settings', async (req, res) => {
  try {
    const { wa_token, wa_phone_id } = req.body;
    const pool = await getPool();
    const upsert = async (k, v) => {
      if (v === undefined) return;
      await pool.request()
        .input('k', sql.NVarChar, k)
        .input('v', sql.NVarChar, v || '')
        .query(`IF EXISTS (SELECT 1 FROM vms_settings WHERE settingKey=@k)
                  UPDATE vms_settings SET settingValue=@v WHERE settingKey=@k
                ELSE
                  INSERT INTO vms_settings(settingKey,settingValue) VALUES(@k,@v)`);
    };
    await upsert('wa_token',    wa_token);
    await upsert('wa_phone_id', wa_phone_id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports.router = router;
