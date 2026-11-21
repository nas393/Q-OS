import {NextResponse} from "next/server";
import {destroySession,revokeAllSessions} from "@/lib/session";
import {jsonError,requestOriginAllowed} from "@/lib/http";
export const runtime="nodejs";
export async function POST(request:Request){
 if(!requestOriginAllowed(request))return jsonError(403,"Request origin rejected");
 // End the session on the server too, so a copied cookie stops working. If the database is down the browser
 // cookie is still cleared; the token then lapses at its normal expiry.
 try{await revokeAllSessions();}catch{console.error("session_revoke_failed");}
 await destroySession();
 return NextResponse.json({authenticated:false},{headers:{"Cache-Control":"no-store"}});
}
