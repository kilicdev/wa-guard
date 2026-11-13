import fs from 'fs';
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
import keyManager from './keyManager.js';
import { evaluateMessage } from './ai.js';
import { ActionQueue } from './queue.js';
import { isDebug, debug } from './utils.js';
import { ui } from './ui.js';

const SESSION = 'trading-group-bot';
const GROUP_FILE = '.tmp/group.json';
const queue = new ActionQueue();
const seenIds = new Set();
let activeSock = null;
let reconnecting = false;

let targetGroupId = fs.existsSync(GROUP_FILE) ? JSON.parse(fs.readFileSync(GROUP_FILE, 'utf8')).groupId : null;
const activationCode = targetGroupId ? null : `!kur-${Math.floor(1000 + Math.random() * 9000)}`;

const keysCount = keyManager.loadKeys().length;
const rulesCount = fs.existsSync('rules.txt')
  ? fs.readFileSync('rules.txt', 'utf8').split('\n').filter((l) => l.trim()).length
  : 0;

ui.banner({ keysCount, rulesCount, isDebug });

async function start() {
  reconnecting = false;
  if (activeSock) {
    activeSock.ev.removeAllListeners();
    activeSock.ws?.close();
    activeSock = null;
  }

  ui.spin('WhatsApp sunucularına bağlanılıyor...');
  const { state, saveCreds } = await useMultiFileAuthState(`.tmp/${SESSION}`);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: isDebug ? 'debug' : 'silent' }),
  });
  activeSock = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) ui.qr(qr);

    if (connection === 'open') {
      if (targetGroupId) ui.online(targetGroupId);
      else ui.setupCode(activationCode);
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        if (!reconnecting) {
          reconnecting = true;
          debug('Bağlantı koptu, yeniden bağlanılıyor...');
          setTimeout(start, 1000);
        }
      } else {
        ui.error('Oturum kapatıldı. .tmp/ klasörünü silip yeniden başlatın.');
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      const msgId = msg.key.id;
      if (!msgId || seenIds.has(msgId)) continue;
      seenIds.add(msgId);
      if (seenIds.size > 500) seenIds.delete(seenIds.values().next().value);

      const jid = msg.key.remoteJid;
      if (!jid?.endsWith('@g.us')) continue;

      const text = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        ''
      ).trim();
      if (!text) continue;

      if (!targetGroupId) {
        if (text === activationCode) {
          targetGroupId = jid;
          fs.mkdirSync('.tmp', { recursive: true });
          fs.writeFileSync(GROUP_FILE, JSON.stringify({ groupId: jid }));
          await sock.sendMessage(jid, { text: '✅ Bu grup varsayılan yönetim grubu olarak ayarlandı.' }, { quoted: msg }).catch(() => {});
          ui.online(targetGroupId);
        }
        continue;
      }

      if (msg.key.fromMe || jid !== targetGroupId) continue;

      const senderId = msg.key.participant;
      const senderName = msg.pushName || senderId?.split('@')[0] || 'Üye';
      const decision = await evaluateMessage(text, senderName);
      const actions = decision?.actions?.filter((a) => a && a !== 'PASS') || [];

      if (!actions.length) continue;
      ui.action(actions.join('+'), senderName, decision.reason);

      queue.enqueue(async () => {
        if (actions.includes('DELETE')) {
          await sock.sendMessage(jid, { delete: msg.key }).catch((e) => debug('Silme hatası:', e.message));
        }

        if (actions.includes('WARN') && decision.reply) {
          await sock.sendPresenceUpdate('composing', jid).catch(() => {});
          const payload = senderId
            ? { text: `@${senderId.split('@')[0]} ${decision.reply}`, mentions: [senderId] }
            : { text: decision.reply };
          await sock.sendMessage(jid, payload).catch(() => {});
        }
      });
    }
  });
}

start().catch((err) => {
  ui.error(err.message);
  process.exit(1);
});
