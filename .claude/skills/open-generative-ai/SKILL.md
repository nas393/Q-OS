---
name: open-generative-ai
description: Generate AI images, video, lip-sync and audio with Open Generative AI (open-source studio on MuAPI, 600+ models), or set the studio up. Use when the owner asks for AI-generated images, video clips, product shots, lip-sync or ads. Cloud generation spends paid MuAPI credits, so confirm the cost with the owner before the first paid call.
---

# Open Generative AI

Open-source image/video/audio studio: https://github.com/Anil-matcha/Open-Generative-AI
(Next.js app, a hosted copy at muapi.ai, and a desktop app). Every cloud model runs on **MuAPI**,
a paid, pay-per-generation service.

## Owner's rules (always)

- **Payment:** never buy credits, plans or White Label. Before the first paid generation in a session,
  tell the owner the model, how many outputs and the rough cost, and wait for a yes.
- **Key:** the MuAPI key (muapi.ai → Access keys) never goes in chat, code or git. In a cloud session,
  ask for it with the secure credential form: host `api.muapi.ai`, header `x-api-key`.
- **Content:** the studio advertises "no filters". Apply normal judgement anyway: no real person's
  likeness without consent, no sexual content, nothing made to deceive.

## Calling MuAPI directly (what the studio does)

1. Submit: `POST https://api.muapi.ai/api/v1/{model-endpoint}` with JSON (prompt + parameters),
   header `x-api-key: <key>`. The response has `request_id` (or `id`).
2. Poll: `GET https://api.muapi.ai/api/v1/predictions/{request_id}/result` every few seconds until
   `status` is `completed` (or `failed`), then read the output URLs.
3. Image/video inputs: upload first with `POST https://api.muapi.ai/api/v1/upload_file`
   (multipart), then pass the returned URL (`image_url`, `video_url`, `audio_url`, `images_list`).

Model endpoint names change. Look them up in the repo before calling: `src/lib/muapi.js`,
`models_dump.json` and `packages/studio/src/`.

## Running the studio

- Hosted: muapi.ai/open-generative-ai (the owner signs in; nothing to install).
- Local: `git clone https://github.com/Anil-matcha/Open-Generative-AI && cd Open-Generative-AI && npm install && npm run dev`,
  then enter the key in the app on first use (it stays in that browser's localStorage).
- **Free path:** the desktop app can run local models (bundled sd.cpp, or Wan2GP) on the owner's own
  computer with no key. It needs Apple Silicon or a decent GPU, so it runs on the owner's machine, not in a cloud session.

Related: https://github.com/SamurAIGPT/muapi-skills (more agent workflows on the same paid key).
