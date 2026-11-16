import {iqDb} from "@/lib/iq/db";

/* UN Comtrade (free public preview, no key). Mirror data, because Angola's own customs reports are late or missing:
 * imports = what partner countries report exporting TO Angola (FOB); exports = what partners report importing FROM Angola (CIF). */
export const COMMODITIES:Record<string,string>={"Wheat":"1001","Wheat flour":"1101","Rice":"1006","Sugar":"1701","Maize":"1005","Milk powder":"0402","Soybean oil":"1507","Palm oil":"1511","Poultry meat":"0207","Fertilizers":"31","Refined fuel":"2710","Cement":"2523","Iron and steel":"72","Pharmaceuticals":"30"};
export const EXPORTS:Record<string,string>={"Crude oil":"2709","Natural gas (LNG)":"2711","Diamonds":"7102","Refined fuel":"2710","Fish and seafood":"03","Coffee":"0901","Wood":"44","Bananas":"0803","Granite and stone":"2516","Copper ores":"2603"};
export type TradeRow={partner:string;value:number;qty:number|null;period:string;retrieved_at:string;source_url:string};

export async function tradeFor(commodity:string,refresh=false,flow:"imports"|"exports"="imports"):Promise<TradeRow[]>{
 const hs=(flow==="exports"?EXPORTS:COMMODITIES)[commodity];if(!hs)throw new Error("Unknown commodity");
 const db=await iqDb();const ind=flow==="exports"?`Imports from Angola: ${commodity}`:`Exports to Angola: ${commodity}`;
 const read=()=>db.query("SELECT geography AS partner,value::float8 AS value,(meta->>'qty')::float8 AS qty,period,retrieved_at,source_url FROM iq_obs WHERE indicator=$1 AND source_id='comtrade' ORDER BY period DESC,value DESC",[ind]);
 const cached=await read();
 if(cached.rows.length&&!refresh)return cached.rows;
 const year=new Date().getUTCFullYear();let found=0;let lastErr="";
 for(const period of [year-1,year-2,year-3,year-4]){
  const url=`https://comtradeapi.un.org/public/v1/preview/C/A/HS?partnerCode=24&period=${period}&cmdCode=${hs}&flowCode=${flow==="exports"?"M":"X"}&includeDesc=true`;
  try{
   const r=await fetch(url,{signal:AbortSignal.timeout(20000),cache:"no-store"});
   if(!r.ok){lastErr=`Comtrade HTTP ${r.status}`;continue;}
   const j=await r.json() as {data?:Array<{reporterDesc?:string;primaryValue?:number;netWgt?:number|null;motCode?:number;customsCode?:string;partner2Code?:number}>};
   const agg=new Map<string,{partner:string;value:number;qty:number|null}>();
   for(const d of j.data??[]){if(!d.reporterDesc||!d.primaryValue||(d.partner2Code&&d.partner2Code!==0)||(d.motCode&&d.motCode!==0)||(d.customsCode&&d.customsCode!=="C00"))continue;
    const prev=agg.get(d.reporterDesc);agg.set(d.reporterDesc,{partner:d.reporterDesc,value:(prev?.value??0)+d.primaryValue,qty:d.netWgt?(prev?.qty??0)+d.netWgt:prev?.qty??null});}
   for(const x of agg.values()){found++;await db.query("INSERT INTO iq_obs (indicator,value,unit,period,geography,source_id,source_url,meta) VALUES ($1,$2,'US$',$3,$4,'comtrade',$5,$6) ON CONFLICT (indicator,period,geography,source_id) DO UPDATE SET value=EXCLUDED.value,meta=EXCLUDED.meta,source_url=EXCLUDED.source_url,retrieved_at=now()",[ind,x.value,String(period),x.partner,url,JSON.stringify({hs,qty:x.qty,flow:flow==="exports"?"partner imports from Angola (mirror, CIF)":"partner exports to Angola (mirror, FOB)",method:"UN Comtrade public preview, reporter-declared values"})]);}
  }catch(e){lastErr=e instanceof Error?e.message:"failed";}
 }
 if(found)await db.query("UPDATE iq_sources SET status='operational',last_ok=now(),last_run=now(),last_error=NULL WHERE id='comtrade'");
 else await db.query("UPDATE iq_sources SET status='degraded',last_run=now(),last_error=$1 WHERE id='comtrade'",[lastErr||"no data returned"]);
 const out=await read();
 if(out.rows.length)return out.rows;
 throw new Error(lastErr||"Comtrade returned no data for this commodity");
}

/* OpenStreetMap import via Photon (komoot), an OSM search service. Overpass servers time out from Vercel (tested 16 Nov 2026).
 * Community data: stored with a link to the OSM record and marked unverified until the owner verifies it. */
const PHOTON:Record<string,Array<[string,string]>>={
 ports:[["porto","landuse:harbour"],["porto","landuse:industrial"]],
 airports:[["aeroporto","aeroway:aerodrome"],["airport","aeroway:aerodrome"]],
 industrial:[["zona industrial","landuse:industrial"],["polo industrial","landuse:industrial"]],
 fuel:[["bomba","amenity:fuel"],["posto","amenity:fuel"]],
 markets:[["mercado","amenity:marketplace"]],
 hospitals:[["hospital","amenity:hospital"]]
};
const LABEL:Record<string,string>={ports:"Port",airports:"Airport",industrial:"Industrial area",fuel:"Fuel station",markets:"Market",hospitals:"Hospital"};
const OSM_TYPE:Record<string,string>={N:"node",W:"way",R:"relation"};
type PF={geometry:{coordinates:[number,number]};properties:{name?:string;countrycode?:string;osm_type?:string;osm_id?:number;state?:string;city?:string}};
export async function osmImport(category:string){
 const db=await iqDb();let n=0,ok=0;let last="";
 for(const [q,tag] of PHOTON[category]??[]){
  try{
   const r=await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&osm_tag=${tag}&bbox=11,-19,25,-4&limit=50`,{headers:{"user-agent":"AngolaIQ/1.0 (private research tool)"},signal:AbortSignal.timeout(20000),cache:"no-store"});
   if(!r.ok)throw new Error(`Photon HTTP ${r.status}`);
   const j=await r.json().catch(()=>{throw new Error("Photon busy (rate limit) — try again in a minute");}) as {features?:PF[]};ok++;
   for(const f of j.features??[]){
    const p=f.properties,[lng,lat]=f.geometry.coordinates;
    if(p.countrycode!=="AO"||!p.name||lat<-19||lat>-4||lng<11||lng>25)continue;
    if(category==="ports"&&tag==="landuse:industrial"&&!/^porto/i.test(p.name))continue;
    if(/^(hospital|mercado|bomba|posto|aeroporto)$/i.test(p.name.trim()))continue; // skip unnamed generic entries
    const type=OSM_TYPE[p.osm_type??""]??"node";
    const res=await db.query("INSERT INTO iq_locations (name,category,province,lat,lng,source,source_url,verified,ext_id) VALUES ($1,$2,$3,$4,$5,'OpenStreetMap',$6,false,$7) ON CONFLICT (ext_id) DO NOTHING",[p.name.slice(0,120),LABEL[category],p.state??null,lat,lng,`https://www.openstreetmap.org/${type}/${p.osm_id}`,`osm:${type}/${p.osm_id}`]);
    n+=res.rowCount??0;
   }
  }catch(e){last=e instanceof Error?e.message:"failed";}
  await new Promise(x=>setTimeout(x,1200)); // be polite to the free service
 }
 if(!ok){await db.query("UPDATE iq_sources SET status='degraded',last_run=now(),last_error=$1 WHERE id='osm'",[last]);throw new Error(last||"Photon unavailable");}
 await db.query("UPDATE iq_sources SET status='operational',last_ok=now(),last_run=now(),last_error=NULL WHERE id='osm'");
 return n;
}
