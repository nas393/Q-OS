# Claude skills for this workspace

Loaded by Claude Code in sessions that include this repo. Not part of the Q OS app
(excluded from `tsc` and ESLint).

## From OpenMontage (49 skills)

Copied from https://github.com/OpenMontageInc/OpenMontage (`.claude/skills`), licence AGPL-3.0
(see `OPENMONTAGE-LICENSE`). The full OpenMontage video pipelines (`create-video`, `video_toolkit`,
`remotion`, `ltx2`, `acestep`) need the OpenMontage repo itself: clone it and work inside it.

| Group | Skills | Needs |
|---|---|---|
| Knowledge only (free) | threejs-* (10), remotion-best-practices, vercel-react-best-practices, vercel-composition-patterns, web-design-guidelines, tailwind-design-system, framer-motion, lottie-bodymovin, d3-viz, beautiful-mermaid, manim-composer, manimce-best-practices, manimgl-best-practices, ffmpeg, playwright-recording, video-edit, video-download, video-understand, visual-style, flux-best-practices | nothing |
| Paid APIs | heygen, avatar-video, faceswap, video-translate, text-to-speech, create-video, ai-video-gen (HeyGen / Gemini) · elevenlabs, music, sound-effects, speech-to-text, agents, setup-api-key (ElevenLabs) · azure-speech-to-text, azure-text-to-speech (Azure) · bfl-api (FLUX) | the vendor's key |
| OpenMontage repo / compute | remotion (OpenMontage project conventions), ltx2 (Modal GPU), acestep (RunPod GPU), video_toolkit (R2 storage) | the OpenMontage repo; paid compute for GPU ones |

## Added for the owner

- `open-generative-ai`: AI images and video through MuAPI (paid per generation; confirm cost first).
- `freellmapi`: free LLM tiers behind one OpenAI-compatible endpoint, running on the owner's computer.

Rules for every skill here: keys only through the secure credential form (never chat or git),
and no purchase, plan or paid generation without the owner's yes.
