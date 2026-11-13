import qrcode from 'qrcode-terminal';

const RST = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const rgb = (r, g, b) => `\x1b[38;2;${r};${g};${b}m`;
const bg = (r, g, b) => `\x1b[48;2;${r};${g};${b}m`;

const C = {
  green: rgb(16, 185, 129),
  cyan: rgb(6, 182, 212),
  blue: rgb(59, 130, 246),
  amber: rgb(245, 158, 11),
  red: rgb(239, 68, 68),
  purple: rgb(168, 85, 247),
  gray: rgb(113, 113, 122),
  white: rgb(244, 244, 245),
};

const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const pad = (s, w) => s + ' '.repeat(Math.max(0, w - strip(s).length));

function gradient(text, from = [16, 185, 129], to = [59, 130, 246]) {
  return [...text]
    .map((ch, i) => {
      const t = text.length > 1 ? i / (text.length - 1) : 0;
      const r = Math.round(from[0] + (to[0] - from[0]) * t);
      const g = Math.round(from[1] + (to[1] - from[1]) * t);
      const b = Math.round(from[2] + (to[2] - from[2]) * t);
      return `${rgb(r, g, b)}${ch}`;
    })
    .join('') + RST;
}

function box(title, lines, accent = C.cyan, width = 56) {
  const inner = width - 4;
  const topLabel = title ? ` ${title} ` : '';
  const topBar = '─'.repeat(Math.max(0, width - 3 - strip(topLabel).length));
  console.log(`${accent}╭─${BOLD}${topLabel}${RST}${accent}${topBar}╮${RST}`);
  for (const line of lines) {
    console.log(`${accent}│${RST} ${pad(line, inner)} ${accent}│${RST}`);
  }
  console.log(`${accent}╰${'─'.repeat(width - 2)}╯${RST}`);
}

let spinTimer = null;
const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export const ui = {
  banner({ keysCount, rulesCount, isDebug }) {
    console.clear();
    const logo = [
      ' ██╗    ██╗ █████╗      ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗ ',
      ' ██║    ██║██╔══██╗    ██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗',
      ' ██║ █╗ ██║███████║    ██║  ███╗██║   ██║███████║██████╔╝██║  ██║',
      ' ██║███╗██║██╔══██║    ██║   ██║██║   ██║██╔══██║██╔══██╗██║  ██║',
      ' ╚███╔███╔╝██║  ██║    ╚██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝',
      '  ╚══╝╚══╝ ╚═╝  ╚═╝     ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ',
    ];
    console.log();
    logo.forEach((l) => console.log(gradient(l)));
    console.log(` ${C.gray}AI-Powered WhatsApp Group Moderation Engine${RST}  ${DIM}v1.0${RST}\n`);

    const modeBadge = isDebug
      ? `${bg(168, 85, 247)}${C.white}${BOLD} DEBUG ${RST}`
      : `${bg(16, 185, 129)}${rgb(9, 9, 11)}${BOLD} PROD ${RST}`;

    box('SİSTEM DURUMU', [
      `${C.green}●${RST} Engine    ${C.white}Baileys WebSocket + KeyManager${RST}`,
      `${C.cyan}◆${RST} API Keys  ${C.white}${keysCount} aktif anahtar${RST} ${C.gray}(keys.txt)${RST}`,
      `${C.blue}◆${RST} Kurallar  ${C.white}${rulesCount} kural yüklendi${RST} ${C.gray}(rules.txt)${RST}`,
      `${C.amber}◆${RST} Anti-Ban  ${C.white}Queue 2.0s - 4.5s${RST}    Mod: ${modeBadge}`,
    ], C.gray, 60);
    console.log();
  },

  spin(msg) {
    this.stopSpin();
    let i = 0;
    spinTimer = setInterval(() => {
      process.stdout.write(`\r ${C.cyan}${FRAMES[i++ % FRAMES.length]}${RST} ${C.gray}${msg}${RST}`);
    }, 80);
  },

  stopSpin() {
    if (spinTimer) {
      clearInterval(spinTimer);
      spinTimer = null;
      process.stdout.write('\r\x1b[K');
    }
  },

  qr(code) {
    this.stopSpin();
    box('OTURUM BULUNAMADI', [
      `${C.amber}▸${RST} WhatsApp > Bağlı Cihazlar > Cihaz Bağla`,
      `${C.amber}▸${RST} Aşağıdaki QR kodu telefonunuzla okutun`,
    ], C.amber, 60);
    console.log();
    qrcode.generate(code, { small: true });
  },

  setupCode(code) {
    this.stopSpin();
    console.log();
    box('GRUP EŞLEŞTİRME GEREKLİ', [
      `${C.green}✓${RST} WhatsApp bağlantısı kuruldu`,
      `${C.gray}  Yönetmek istediğiniz gruba aşağıdaki kodu gönderin:${RST}`,
      '',
      `     ${bg(39, 39, 42)}${C.green}${BOLD}  ${code}  ${RST}`,
      '',
      `${C.gray}  Kod gönderilen grup kalıcı olarak varsayılan olur.${RST}`,
    ], C.green, 60);
    console.log();
  },

  online(groupId) {
    this.stopSpin();
    console.log();
    box('BOT AKTİF VE DİNLİYOR', [
      `${C.green}● ONLINE${RST}  ${C.gray}Hedef Grup:${RST} ${C.white}${groupId}${RST}`,
      `${C.cyan}▸${RST} ${C.gray}Kurallar aktif, gelen mesajlar analiz ediliyor...${RST}`,
    ], C.green, 60);
    console.log();
  },

  action(label, user, reason) {
    const time = new Date().toLocaleTimeString('tr-TR');
    const style = label.includes('DELETE') ? { color: C.purple, icon: '×' } : { color: C.amber, icon: '!' };
    console.log(
      ` ${C.gray}${time}${RST}  ${style.color}${BOLD}${style.icon} ${label.padEnd(11)}${RST}  ${C.white}${user}${RST} ${C.gray}— ${reason}${RST}`
    );
  },

  error(msg) {
    this.stopSpin();
    console.log(`\n ${C.red}${BOLD}✕ HATA:${RST} ${C.white}${msg}${RST}\n`);
  },
};
