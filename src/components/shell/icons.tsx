import type {ReactNode} from "react";

/* One icon set for the whole of Q OS: 24px grid, 1.75 stroke, currentColor. */
const IC:Record<string,ReactNode>={
 check:<path d="M20 6 9 17l-5-5"/>,clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,plus:<path d="M12 5v14M5 12h14"/>,
 arrow:<path d="M5 12h14M13 6l6 6-6 6"/>,up:<path d="M12 19V5M6 11l6-6 6 6"/>,down:<path d="M12 5v14M6 13l6 6 6-6"/>,
 alert:<><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>,
 info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
 spark:<><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/></>,
 sliders:<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>,
 bell:<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></>,x:<path d="M18 6 6 18M6 6l12 12"/>,
 eye:<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
 eyeoff:<path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6M2 2l20 20M9.9 9.9a3 3 0 0 0 4.2 4.2"/>,
 ext:<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>,chart:<><path d="M3 3v18h18"/><path d="m7 14 4-4 4 3 5-6"/></>,
 globe:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
 home:<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z"/>,
 grid:<><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
 more:<><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></>,
 file:<><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></>,
 sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
 cloud:<path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.6 2A3 3 0 0 0 7 18z"/>,
 repeat:<><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></>,
 activity:<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>,send:<path d="M12 19V5M5 12l7-7 7 7"/>,
 sunrise:<path d="M17 18a5 5 0 0 0-10 0M12 2v7M4.2 10.2l1.4 1.4M1 18h2M21 18h2M18.4 11.6l1.4-1.4M23 22H1M8 6l4-4 4 4"/>,
 map:<><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/></>,list:<><path d="M9 6h12M9 12h12M9 18h12"/><path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2"/></>,
 chev:<path d="m9 6 6 6-6 6"/>,search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,reset:<><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></>,
 trash:<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>,
 cal:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
 flag:<path d="M4 22V4M4 4h12l-2 4 2 4H4"/>,
 logout:<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
};
/* Shell and section icons */
const IC2:Record<string,ReactNode>={
 orbit:<><circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="4.5"/><path d="M20.5 9.5a2 2 0 1 1-3 2"/></>,
 panel:<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></>,
 menu:<path d="M4 7h16M4 12h16M4 17h16"/>,
 user:<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
 enter:<path d="M9 10 4 15l5 5M20 4v7a4 4 0 0 1-4 4H4"/>,
 updown:<path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>,
 compass:<><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/></>,
 news:<><path d="M4 5h13v14H6a2 2 0 0 1-2-2Z"/><path d="M17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5"/></>,
 star:<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z"/>,
 sword:<path d="M14.5 3H21v6.5L10 20.5l-3-3L18 6.5M5 15l4 4M3 21l3-3"/>,
 anchor:<><circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 13a7 7 0 0 0 14 0M8 11h8"/></>,
 swap:<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>,
 db:<><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></>,
 folder:<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>,
 lightbulb:<><path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z"/></>,
 binoc:<><circle cx="6" cy="16" r="4"/><circle cx="18" cy="16" r="4"/><path d="M10 16h4M6 12V6l3-2M18 12V6l-3-2"/></>
};
/** An icon from the Q OS set; decorative (aria-hidden), so give its button or link an accessible name. */
export function I({n,c}:{n:string;c?:string}){return <svg className={`i${c?" "+c:""}`} viewBox="0 0 24 24" aria-hidden="true">{IC[n]??IC2[n]}</svg>;}
