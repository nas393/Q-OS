import type {Metadata,Viewport} from "next";
import {Inter,Instrument_Serif} from "next/font/google";
import "./globals.css";

/* Self-hosted fonts (no runtime request to Google): Inter for the interface, Instrument Serif for the Q briefing headline. */
const sans=Inter({subsets:["latin","latin-ext"],variable:"--font-sans",display:"swap"});
const serif=Instrument_Serif({subsets:["latin"],weight:"400",style:["normal","italic"],variable:"--font-serif",display:"swap"});

export const metadata:Metadata={title:{default:"Q OS",template:"%s · Q OS"},description:"Private command centre",robots:{index:false,follow:false},
 appleWebApp:{capable:true,title:"Q OS",statusBarStyle:"black-translucent"},
 icons:{icon:[{url:"/icon.svg",type:"image/svg+xml"},{url:"/favicon-32.png",sizes:"32x32",type:"image/png"},{url:"/icon-192.png",sizes:"192x192",type:"image/png"}],shortcut:"/favicon.ico",apple:[{url:"/apple-touch-icon.png",sizes:"180x180"}]}};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#090A0E"};
/* crossOrigin=use-credentials: the deployment sits behind Vercel login, so the manifest request must carry the session cookie. */
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className={`${sans.variable} ${serif.variable}`}><head><link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials"/><meta name="mobile-web-app-capable" content="yes"/></head><body>{children}</body></html>;}
