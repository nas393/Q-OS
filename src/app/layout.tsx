import type {Metadata,Viewport} from "next";
import "./globals.css";
export const metadata:Metadata={title:"Q OS",description:"Private command center",robots:{index:false,follow:false},
 appleWebApp:{capable:true,title:"Q OS",statusBarStyle:"black-translucent"},
 icons:{icon:[{url:"/icon-192.png",sizes:"192x192",type:"image/png"}],apple:[{url:"/apple-touch-icon.png",sizes:"180x180"}]}};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#070708"};
/* crossOrigin=use-credentials: the deployment sits behind Vercel login, so the manifest request must carry the session cookie. */
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><head><link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials"/><meta name="mobile-web-app-capable" content="yes"/></head><body>{children}</body></html>;}
