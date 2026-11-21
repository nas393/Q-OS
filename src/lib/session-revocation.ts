/*
 * Server-side sign-out. A session is a signed token (8 h); deleting the browser cookie alone leaves a copied token
 * valid until it expires. Sign-out therefore records "sessions valid after <time>" (system_settings), and any token
 * issued before that time is refused. Pure rule here (no imports) so tests can load it directly.
 */
export const REVOKE_KEY="sessions_valid_after";

/* iat and validAfter in epoch seconds. A token issued in the same second as the sign-out stays valid, so a login
   straight after signing out works; anything older is refused. validAfter 0 = never signed out. */
export function issuedBeforeRevocation(iat:number|undefined,validAfter:number):boolean{
  if(!(validAfter>0))return false;
  return !(typeof iat==="number"&&Number.isFinite(iat))||iat<validAfter;
}
