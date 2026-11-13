import fs from 'fs';
import path from 'path';

class KeyManager {
  constructor() {
    this.keys = new Map();
    this.idx = 0;
    this.loaded = false;
  }

  loadKeys() {
    if (this.loaded) return [...this.keys.keys()];

    const file = path.resolve(process.cwd(), 'keys.txt');
    if (fs.existsSync(file)) {
      fs.readFileSync(file, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#') && !l.startsWith('//'))
        .forEach((k) => { if (!this.keys.has(k)) this.keys.set(k, 0); });
    }

    this.loaded = true;
    return [...this.keys.keys()];
  }

  getKey() {
    const all = this.loadKeys();
    if (!all.length) return null;

    const now = Date.now();
    for (let i = 0; i < all.length; i++) {
      const idx = (this.idx + i) % all.length;
      if (this.keys.get(all[idx]) <= now) {
        this.idx = (idx + 1) % all.length;
        return all[idx];
      }
    }
    return all.reduce((a, b) => (this.keys.get(a) < this.keys.get(b) ? a : b));
  }

  penalize(key, status = 0, msg = '') {
    if (!this.keys.has(key)) return;
    let cd = 5000;
    if (msg.includes('tokens per day') || msg.includes('(TPD)')) {
      const m = msg.match(/try again in ([0-9.]+)m/i);
      cd = m ? Math.ceil(parseFloat(m[1]) * 60000) + 5000 : 15 * 60000;
    } else if (msg.includes('try again in')) {
      const s = msg.match(/try again in ([0-9.]+)s/i);
      if (s) cd = Math.ceil(parseFloat(s[1]) * 1000) + 1500;
    } else if (status === 401 || status === 403) {
      cd = 24 * 60 * 60 * 1000;
    }
    this.keys.set(key, Date.now() + cd);
  }
}

export default new KeyManager();
