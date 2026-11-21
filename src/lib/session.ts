import {SignJWT,jwtVerify} from "jose";
import {cookies} from "next/headers";
import {getAuthEnv} from "@/lib/env";
import {getDb} from "@/lib/db";
import {REVOKE_KEY,issuedBeforeRevocation} from "@/lib/session-revocation";
const COOKIE="qj_session",TTL=60*60*8;
const key=()=>new TextEncoder().encode(getAuthEnv().AUTH_SECRET);
export async function createSession(user:{id:string;email:string}){const token=await new SignJWT({email:user.email,role:"owner"}).setProtectedHeader({alg:"HS256"}).setSubject(user.id).setIssuedAt().setExpirationTime(`${TTL}s`).setIssuer("q-jarvis").setAudience("q-jarvis-owner").sign(key());(await cookies()).set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:TTL});}
export async function readSession(){const token=(await cookies()).get(COOKIE)?.value;if(!token)return null;try{const {payload}=await jwtVerify(token,key(),{algorithms:["HS256"],issuer:"q-jarvis",audience:"q-jarvis-owner"});if(payload.role!=="owner"||!payload.sub||typeof payload.email!=="string")return null;if(issuedBeforeRevocation(payload.iat,await validAfter()))return null;return {id:payload.sub,email:payload.email};}catch{return null;}}
export async function destroySession(){(await cookies()).set(COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:0});}

/* "Sessions valid after" (epoch seconds), cached 15 s per server instance. If the database is unreachable the last
   known value is used (signature and expiry still apply), so Q OS stays usable during a database outage. */
let revokeCache:{at:number;until:number}|null=null;
async function validAfter():Promise<number>{
  if(revokeCache&&revokeCache.until>Date.now())return revokeCache.at;
  try{
    const {rows}=await getDb().query("SELECT value FROM system_settings WHERE key=$1",[REVOKE_KEY]);
    const at=Number((rows[0]?.value as {at?:unknown}|undefined)?.at??0);
    revokeCache={at:Number.isFinite(at)?at:0,until:Date.now()+15_000};
    return revokeCache.at;
  }catch{return revokeCache?.at??0;}
}
/* Sign out everywhere: every token issued before now stops working (on other server instances within 15 s). */
export async function revokeAllSessions(){
  const at=Math.floor(Date.now()/1000);
  await getDb().query("INSERT INTO system_settings (key,value,updated_at) VALUES ($1,$2::jsonb,now()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()",[REVOKE_KEY,JSON.stringify({at})]);
  revokeCache={at,until:Date.now()+15_000};
}
