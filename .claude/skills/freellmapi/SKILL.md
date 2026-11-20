---
name: freellmapi
description: Use free LLMs through the owner's FreeLLMAPI router, which pools the free tiers of many providers behind one OpenAI-compatible /v1 endpoint, or set the router up. Use when the owner wants free or cheap models for bulk text work (drafts, summaries, translation, classification) or asks about FreeLLMAPI.
---

# FreeLLMAPI

Open-source router: https://github.com/tashfeenahmed/freellmapi. It aggregates free tiers
(Groq, Cerebras, Mistral, Cohere, NVIDIA, Cloudflare, OpenRouter free models and others) behind **one OpenAI-compatible API**. It
picks a model, falls over when a provider is rate-limited, and tracks usage per key.
It is **local-first and single-user**: it runs on the owner's own computer, with provider keys
encrypted in a local SQLite file. It does not fit Vercel, because it needs a long-running server and a database.

## Setup (on the owner's computer)

- Easiest: the desktop app (macOS .dmg / Windows installer) from the repo's Releases page, or
  the Microsoft Store on Windows.
- Docker: the project's `install.sh` (https://freellmapi.co/install.sh). Read it before running it;
  never pipe an unread script into bash.
- Then open http://localhost:3001 → **Keys**: add a free key for each provider you want (each
  provider's own sign-up, no card), set the fallback order, and copy the **unified key**.

## Calling it

- Base URL `http://localhost:3001/v1`, header `Authorization: Bearer <unified key>`,
  model `auto` (router picks) or a specific model id from the dashboard.
- Works with any OpenAI client, e.g. `new OpenAI({ baseURL: "http://localhost:3001/v1", apiKey })`.

```bash
curl http://localhost:3001/v1/chat/completions \
  -H "Authorization: Bearer $FREELLMAPI_KEY" -H "Content-Type: application/json" \
  -d '{"model":"auto","messages":[{"role":"user","content":"Summarise this in 3 bullets: ..."}]}'
```

## Rules

- `localhost` means the owner's machine. A cloud session can reach it only through the owner's
  attached computer (Remote Control). Never expose the router to the internet without auth.
- Keys (unified or provider) never go in chat, code or git.
- Free tiers send prompts to many third-party providers. **Do not route private or business data**
  (Q OS owner data, client documents, credentials) through it. Use it for public or low-risk text.
- Expect rate limits and uneven quality; check important output. Respect each provider's terms
  (one account per provider, stay within free caps).
- It's free. If any provider asks for a card or a paid plan, stop and ask the owner.
