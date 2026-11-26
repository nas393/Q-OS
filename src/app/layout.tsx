import type {Metadata,Viewport} from "next";
import {Geist,Geist_Mono} from "next/font/google";
import "./globals.css";

/* Self-hosted at build time (no runtime request to Google). Geist for the interface, Geist Mono for figures. */
const sans=Geist({subsets:["latin"],variable:"--font-sans",display:"swap"});
const mono=Geist_Mono({subsets:["latin"],variable:"--font-mono",display:"swap"});

export const metadata:Metadata={
  title:{default:"Q OS",template:"%s · Q OS"},
  description:"Q OS · AI HQ. Private command centre.",
  robots:{index:false,follow:false},
  appleWebApp:{capable:true,title:"Q OS",statusBarStyle:"black-translucent"},
  icons:{icon:[{url:"/icon.svg",type:"image/svg+xml"},{url:"/favicon-32.png",sizes:"32x32",type:"image/png"},{url:"/icon-192.png",sizes:"192x192",type:"image/png"}],apple:[{url:"/apple-touch-icon.png",sizes:"180x180"}]}
};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#0E1113"};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en" className={`${sans.variable} ${mono.variable}`}>
    <head><meta name="mobile-web-app-capable" content="yes"/></head>
    <body>{children}</body>
  </html>;
}
