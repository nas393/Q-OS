/*
 * App logos come from the apps themselves. `live` is the icon each app publishes on its own site
 * (its favicon, apple-touch-icon or manifest icon, checked 20 Nov 2026). `local` is a copy of that same file
 * kept in /public/os/apps, so a logo still shows when the app's site is slow, down or unreachable.
 * Certigo publishes no icon file, so its copy is the mark drawn in its site header.
 * To refresh one: copy the app's icon into /public/os/apps and keep the file name.
 * Pure data and helpers, no "@/..." imports, so tests can load this file with Node's --experimental-strip-types.
 */
export type AppLogo={live?:string;local?:string};

const LOGOS:Record<string,AppLogo>={
  "q-jarvis":{local:"/icon.svg"},
  certigo:{local:"/os/apps/certigo.svg"},
  dalil:{live:"https://dalil-al-bazouria.vercel.app/icon.png",local:"/os/apps/dalil.png"},
  lumeris:{live:"https://lumeris-mocha.vercel.app/favicon.svg",local:"/os/apps/lumeris.svg"},
  xauusd:{live:"https://counter-trader.vercel.app/favicon.png",local:"/os/apps/xauusd.png"},
  novae:{live:"https://novae-mu.vercel.app/favicon.svg",local:"/os/apps/novae.svg"},
  lep:{live:"https://media.base44.com/images/public/6a0cc806be0ed8ba4e353957/651f626c7_logo.png/v1/fit/w_180,h_180/651f626c7_logo.png"},
  "ali-quest":{live:"https://ali-quest-battle-academy.vercel.app/quest-icon.svg",local:"/os/apps/ali-quest.svg"},
  radio:{live:"https://radio-cedars.vercel.app/icon.svg",local:"/os/apps/radio.svg"},
  "ala-hawa":{live:"https://ala-hawa.vercel.app/icon.svg",local:"/os/apps/ala-hawa.svg"}
};
/* Vercel project names and ids that differ from the registry id. */
const ALIAS:Record<string,string>={
  "q-os":"q-jarvis",prj_G87tunS7S6xoJAZyZzEmRIhHAru4:"q-jarvis","dalil-al-bazouria":"dalil","counter-trader":"xauusd",
  "ali-quest-battle-academy":"ali-quest","radio-cedars":"radio","luanda-edge-pulse":"lep","prj_fIQ16ehm4dg42uJgf0RApHS1qyMI":"ala-hawa"
};

/** The logo entry for a registry id, a Vercel project name or a Vercel project id. */
export function logoFor(key?:string|null):AppLogo|undefined{
  if(!key)return undefined;
  const k=key.trim().toLowerCase();
  return LOGOS[ALIAS[key]??ALIAS[k]??k];
}

/**
 * Image sources to try, in order: the copy kept in Q OS (instant, works offline), the app's live icon,
 * then whatever /api/apps discovered for an app that is not listed here. Empty when nothing is known.
 */
export function logoSources(keys:(string|null|undefined)[],discovered?:string|null):string[]{
  const known=keys.map(logoFor).find(Boolean);
  return [...new Set([known?.local,known?.live,discovered].filter((s):s is string=>!!s))];
}
