/**
 * WhatsApp QR Session Manager — using @whiskeysockets/baileys
 * Connect personal/business WhatsApp by scanning a QR code.
 * No Meta developer account needed.
 */

const path        = require('path');
const fs          = require('fs');
const QRCode      = require('qrcode');
const EventEmitter = require('events');

const SESSION_DIR  = path.join(__dirname, '../wa-qr-session');

let sock         = null;
let qrBase64     = null;    // base64 PNG sent to frontend
let qrRaw        = null;
let connStatus   = 'disconnected'; // 'disconnected'|'qr_ready'|'connecting'|'connected'
let connInfo     = null;    // { name, phone } when connected
let isShuttingDown = false;

const emitter = new EventEmitter();
emitter.setMaxListeners(20);

// ─── Connect / start QR session ───────────────────────────────────────────────
async function connect() {
  if (connStatus === 'connected') return;
  if (connStatus === 'connecting' && sock !== null) return;

  try {
    const {
      default: makeWASocket,
      useMultiFileAuthState,
      DisconnectReason,
      fetchLatestBaileysVersion,
      Browsers,
    } = require('@whiskeysockets/baileys');
    const { Boom } = require('@hapi/boom');

    if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    let version;
    try {
      const result = await fetchLatestBaileysVersion();
      version = result.version;
      console.log('[WA-QR] Using WA version:', version.join('.'));
    } catch {
      version = [2, 3000, 1017531287]; // known-good fallback
      console.log('[WA-QR] Using fallback WA version');
    }

    connStatus     = 'connecting';
    isShuttingDown = false;

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      logger: require('pino')({ level: 'silent' }),
      browser: Browsers.macOS('Desktop'),
      syncFullHistory: false,
      markOnlineOnConnect: false,
      keepAliveIntervalMs: 25_000,
      retryRequestDelayMs: 250,
      maxMsgRetryCount: 2,
      generateHighQualityLinkPreview: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // New QR received
      if (qr) {
        try {
          qrRaw    = qr;
          qrBase64 = await QRCode.toDataURL(qr, {
            width: 300, margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
            errorCorrectionLevel: 'M',
          });
          connStatus = 'qr_ready';
          emitter.emit('qr', qrBase64);
          console.log('[WA-QR] New QR ready — scan quickly!');
        } catch (e) { console.log('[WA-QR] QR encode error:', e.message); }
      }

      // Connected
      if (connection === 'open') {
        connStatus = 'connected';
        qrBase64   = null; qrRaw = null;
        const me   = sock.user;
        connInfo   = {
          name:  me?.name || me?.notify || 'WhatsApp',
          phone: me?.id?.split(':')[0] || me?.id?.split('@')[0] || '',
        };
        emitter.emit('connected', connInfo);
        console.log(`✅ [WA-QR] Connected as ${connInfo.name} (${connInfo.phone})`);
      }

      // Disconnected
      if (connection === 'close') {
        const { Boom: B } = require('@hapi/boom');
        const { DisconnectReason: DR } = require('@whiskeysockets/baileys');
        const reason = new B(lastDisconnect?.error)?.output?.statusCode;
        console.log('[WA-QR] Disconnected, reason:', reason);

        if (isShuttingDown) {
          connStatus = 'disconnected'; sock = null; connInfo = null;
          emitter.emit('disconnected'); return;
        }

        if (reason === DR.loggedOut || reason === 401) {
          clearSession();
          connStatus = 'disconnected'; sock = null; connInfo = null; qrBase64 = null;
          emitter.emit('disconnected');

        } else if (reason === DR.restartRequired || reason === 515) {
          sock = null;
          const credsPath = path.join(SESSION_DIR, 'creds.json');
          let hasPairedCreds = false;
          try {
            const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
            hasPairedCreds = !!(creds?.me?.id);
          } catch {}
          if (hasPairedCreds) {
            console.log('[WA-QR] QR scan detected — reconnecting...');
            connStatus = 'connecting';
            setTimeout(() => connect(), 1500);
          } else {
            clearSession();
            connStatus = 'disconnected'; connInfo = null; qrBase64 = null;
            emitter.emit('disconnected');
          }

        } else if (reason === DR.connectionReplaced || reason === 440) {
          connStatus = 'disconnected'; sock = null; connInfo = null; qrBase64 = null;
          emitter.emit('disconnected');

        } else {
          // Network issue — reconnect
          console.log('[WA-QR] Reconnecting in 5s...');
          connStatus = 'connecting'; sock = null;
          setTimeout(() => connect(), 5000);
        }
      }
    });

  } catch (e) {
    console.log('[WA-QR] Start error:', e.message);
    connStatus = 'disconnected';
  }
}

// ─── Disconnect ───────────────────────────────────────────────────────────────
async function disconnect() {
  isShuttingDown = true;
  if (sock) {
    try { await sock.logout(); } catch {}
    try { sock.end(); }         catch {}
    sock = null;
  }
  clearSession();
  connStatus = 'disconnected'; connInfo = null; qrBase64 = null; qrRaw = null;
  emitter.emit('disconnected');
  console.log('[WA-QR] Disconnected and session cleared');
}

// ─── Send message ─────────────────────────────────────────────────────────────
async function sendMessage(toPhone, text) {
  if (connStatus !== 'connected' || !sock) {
    throw new Error('WhatsApp QR not connected. Please scan QR first.');
  }
  const phone = normalizePhone(toPhone);
  if (!phone || phone.length < 10) throw new Error('Invalid phone: ' + toPhone);
  const jid = `${phone}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text });
  console.log(`✅ [WA-QR] Sent → ${phone}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizePhone(raw) {
  let p = String(raw || '').replace(/[^0-9]/g, '');
  if (p.startsWith('0')) p = p.slice(1);
  if (p.length === 10) p = '91' + p;
  return p;
}

function getStatus() {
  return { status: connStatus, qr: qrBase64, info: connInfo };
}

function clearSession() {
  try {
    if (fs.existsSync(SESSION_DIR)) {
      fs.rmSync(SESSION_DIR, { recursive: true, force: true });
      console.log('[WA-QR] Session cleared');
    }
  } catch (e) { console.log('[WA-QR] Clear error:', e.message); }
}

// Auto-reconnect on server start if valid session exists on disk
function autoReconnect() {
  try {
    const credsPath = path.join(SESSION_DIR, 'creds.json');
    if (fs.existsSync(credsPath)) {
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      if (creds?.me?.id) {
        console.log('[WA-QR] Valid session found — auto-reconnecting for', creds.me.id);
        connect();
      } else {
        clearSession();
      }
    }
  } catch (e) { console.log('[WA-QR] autoReconnect error:', e.message); }
}

module.exports = { connect, disconnect, sendMessage, getStatus, autoReconnect, normalizePhone, emitter };
