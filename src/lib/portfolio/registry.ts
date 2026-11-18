/* Canonical Q portfolio configuration. Keep IDs and records stable; dynamic status is fetched separately. */
export const PORTFOLIO_PROJECTS = [
  { id:"q-jarvis", name:"NASSIM AI HQ / Q", repo:"Q-OS", repoVisibility:"public", vercel:"prj_G87tunS7S6xoJAZyZzEmRIhHAru4", priority:"P1", next:"Complete Stage 1 Preview validation, confirm portfolio intelligence and system health, then define the next approved phase.", area:"Personal HQ" },
  { id:"certigo", name:"CERTIGO", repo:"certigo-institute", repoVisibility:"public", vercel:"prj_ZxaLAJyMIXizGz8HqpflWC0TjSfG", priority:"P1", next:"Validate the mobile lesson reader and course quality before adding features.", area:"Education" },
  { id:"dalil", name:"DALIL AL-BAZOURIEH", repo:"dalil-al-bazourieh", repoVisibility:"private", vercel:"prj_y4i0VPZXxzUhKLvNFOCxwdTSr94v", priority:"P2", next:"Protect the approved design baseline and validate the current mobile experience.", area:"Directory" },
  { id:"lumeris", name:"LUMERIS", repo:"lumeris", repoVisibility:"private", vercel:"prj_9en6kfMm515bnbkmAgXSpEumh88r", priority:"P1", next:"One site live (home, guide, welcome, posts, studio). Next: Instagram stats into Q.", area:"Media" },
  { id:"xauusd", name:"XAU/USD TRADING HQ", repo:"counter-trader", repoVisibility:"private", vercel:"prj_Yj88nFe9nAEY97iUndUUZs42zAhs", priority:"P2", next:"Validate market data, chart interactions, signal integrity and risk controls.", area:"Trading" },
  { id:"novae", name:"NOVAÉ", repo:"novae-site", repoVisibility:"public", vercel:"prj_Vkri4LKQpL3r24l9FpAIfoWBpx38", priority:"P2", next:"Maintain the agency platform and revisit growth work after P1 delivery.", area:"Agency" },
  { id:"lep", name:"LUANDA EDGE PULSE", repo:null, repoVisibility:null, vercel:null, url:"https://luanda-edge-pulse.base44.app", priority:"P2", next:"Angola market intelligence (Base44). Keep live; review data sources and Devil's Advocate.", area:"Intelligence" },
  { id:"radio", name:"RADIO CEDARS", repo:"Radio-Cedars-", repoVisibility:"public", vercel:"prj_QRS67OXbiBMasOqgG2zVcrdHYJOR", priority:"P3", next:"Review the roadmap and define the next release milestone.", area:"Media" }
] as const;
