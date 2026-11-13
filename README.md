# WA GUARD — AI WhatsApp Group Moderation Engine

![Node.js](https://img.shields.io/badge/Node.js-20%2B-10b981?style=flat-square&logo=node.js&logoColor=white)
![Baileys](https://img.shields.io/badge/WhatsApp-Baileys%20WebSocket-06b6d4?style=flat-square&logo=whatsapp&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-3b82f6?style=flat-square)

**WA GUARD** is a lightweight, zero-browser, AI-powered WhatsApp group moderation engine built on `@whiskeysockets/baileys`. It evaluates incoming group messages against natural-language rules in `rules.txt`—without brittle regexes—and enforces actions through an anti-ban sequential queue.

---

## Features

- **Zero-Browser WebSocket Engine:** Connects directly via `@whiskeysockets/baileys` with minimal memory footprint and automatic session persistence under `.tmp/`.
- **QR Login & Persistent Session:** Automatically renders a terminal QR code when no session is saved and reconnects seamlessly on subsequent runs.
- **One-Time Group Pairing:** Generates a unique setup code (`!kur-XXXX`) on first launch. Sending this code to any group permanently binds it as the managed group (`.tmp/group.json`).
- **Prompt-Based AI Moderation (`rules.txt`):** Define group rules in plain language. The AI returns structured multi-action decisions (`PASS`, `WARN`, `DELETE`, or `WARN+DELETE`).
- **Smart Key Rotation & Cooldown (`KeyManager`):** Rotates through multiple API keys in `keys.txt` using round-robin scheduling, automatically parsing `429` / `TPD` / `401` rate-limit headers to apply smart cooldowns.
- **Anti-Ban Sequential Queue:** Spaces out moderation actions with randomized human-like delays (`2.0s – 4.5s`) and typing indicators.
- **Mention-Based Warnings:** Deletes offending messages first and notifies the member via `@mention` (without quoting the deleted message preview).
- **TrueColor CLI Dashboard:** Clean production terminal UI by default, with verbose diagnostics available via `--debug`.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Keys
Copy `keys.example.txt` to `keys.txt` and add one or more Groq / OpenAI-compatible API keys (one per line):
```bash
cp keys.example.txt keys.txt
```

### 3. Define Group Rules
Edit [`rules.txt`](rules.txt) with your group's moderation rules in natural language.

### 4. Start the Bot
```bash
# Production mode (clean UI)
npm start

# Debug mode (verbose logs)
npm start -- --debug
```

### 5. Pair Your Group
1. Scan the QR code shown in the terminal using **WhatsApp > Linked Devices > Link a Device**.
2. Once connected, copy the `!kur-XXXX` code printed in the terminal and send it inside the WhatsApp group you want to manage.
3. WA GUARD will confirm pairing and begin moderating immediately.

---

## Supported Actions

| Action | Behavior |
| :--- | :--- |
| `PASS` | Message complies with group rules; no action taken. |
| `WARN` | Sends a warning mentioning the user (`@user`). |
| `DELETE` | Deletes the offending message for everyone. |
| `WARN+DELETE` | Deletes the message first, then sends a `@user` warning without leaving a deleted-message quote preview. |

> **Note:** The bot's WhatsApp account must be a **Group Admin** for `DELETE` actions to succeed.
