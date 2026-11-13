import fs from 'fs';
import path from 'path';
import keyManager from './keyManager.js';
import { sleep, debug } from './utils.js';

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'qwen/qwen3.8-27b';

const getRules = () => {
  const file = path.resolve(process.cwd(), 'rules.txt');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim() : 'Alım-satım kurallarına uyulmalıdır.';
};

const SYSTEM_PROMPT = (rules) => `Sen bir WhatsApp alım-satım grubunun otomatik moderatörüsün.
Grup Kuralları:
${rules}

Gelen mesajı kurallara göre değerlendir ve SADECE aşağıdaki JSON formatında yanıt ver:
{"actions":["PASS"|"WARN"|"DELETE"],"reason":"Kısa sebep","reply":"actions içinde WARN varsa kullanıcıya kısa uyarı mesajı, yoksa boş"}

Not: Birden fazla aksiyon gerekiyorsa (örn. hem uyar hem sil) dizi içinde birlikte ver: ["WARN","DELETE"]. İhlal yoksa ["PASS"] ver.
Not2: Reply Cevaplarında asla emoji kullanımı yapma. Mesajları resmi düzeyde ve kısa tut.`;

export async function evaluateMessage(text, sender) {
  const keys = keyManager.loadKeys();
  if (!keys.length) return null;

  const rules = getRules();
  const maxAttempts = Math.max(3, keys.length);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const key = keyManager.getKey();
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT(rules) },
            { role: 'user', content: `Gönderen: ${sender}\nMesaj: ${text}` },
          ],
        }),
        signal: AbortSignal.timeout(15000),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = data?.error?.message || `HTTP ${res.status}`;
        keyManager.penalize(key, res.status, errMsg);
        throw new Error(errMsg);
      }

      const raw = (data.choices?.[0]?.message?.content || '').trim().replace(/^```json\s*|\s*```$/g, '');
      const parsed = JSON.parse(raw);
      const actions = Array.isArray(parsed.actions) ? parsed.actions : [parsed.action].filter(Boolean);
      return { actions: actions.map((a) => String(a).toUpperCase()), reason: parsed.reason || '', reply: parsed.reply || '' };
    } catch (err) {
      debug(`[AI Deneme ${attempt}/${maxAttempts}]`, err.message);
      if (attempt < maxAttempts) await sleep(500 * attempt);
    }
  }

  return null;
}
