import {iqDb} from "@/lib/iq/db";

/* UN Comtrade (free public preview, no key). Mirror data: what partner countries report exporting TO Angola (partner 24). */
export const COMMODITIES:Record<string,string>={"Wheat":"1001","Wheat flour":"1101","Rice":"1006","Sugar":"1701","Maize":"1005","Milk powder":"0402","Soybean oil":"1507","Palm oil":"1511","Poultry meat":"0207","Fertilizers":"31","Refined fuel":"2710","Cement":"2523","Iron and steel":"72","Pharmaceuticals":"30"};
type Row={partner:string;value:number;qty:number|null;period:string};

export async function tradeFor(commodity:string,refresh=false):Promise<Row[]>{
 const hs=COMMODITIES[commodity];if(!hs)throw new Error("Unknown commodity");
 const db=await iqDb();const ind=`Exports to Angola: ${commodity}`;
 const cached=await db.query("SELECT geography partner,value::float8 value,(meta->>'qty')::float8 qty,period FROM iq_obs WHERE indicator=$1 AND source_id='comtrade' ORDER BY period DESC,value DESC",[ind]);
 const fresh=cached.rows.length&&!refresh;
 if(fresh)return cached.rows;
 const year=new Date().getUTCFullYear();let rows:Row[]=[];let lastErr="";
 for(const period of [year-2,year-3,year-4]){
  const url=`https://comtradeapi.un.org/public/v1/preview/C/A/HS?partnerCode=24&period=${period}&cmdCode=${hs}&flowCode=X&includeDesc=true`;
  try{
   const r=await fetch(url,{signal:AbortSignal.timeout(20000),cache:"no-store"});
   if(!r.ok){lastErr=`Comtrade HTTP ${r.status}`;continue;}
   const j=await r.json() as {data?:Array<{reporterDesc?:string;reporterISO?:string;primaryValue?:number;netWgt?:number|null;partnerCode?:number;motCode?:number;customsCode?:string;partner2Code?:number}>};
   const agg=new Map<string,Row>();
   for(const d of j.data??[]){if(!d.reporterDesc||!d.primaryValue||(d.partner2Code&&d.partner2Code!==0)||(d.motCode&&d.motCode!==0)||(d.customsCode&&d.customsCode!=="C00"))continue;
    const k=d.reporterDesc;const prev=agg.get(k);agg.set(k,{partner:k,value:(prev?.value??0)+d.primaryValue,qty:d.netWgt?(prev?.qty??0)+d.netWgt:prev?.qty??null,period:String(period)});}
   rows=[...agg.values()].sort((a,b)=>b.value-a.value);
   if(rows.length){
    for(const x of rows)await db.query("INSERT INTO iq_obs (indicator,value,unit,period,geography,source_id,source_url,meta) VALUES ($1,$2,'US$',$3,$4,'comtrade',$5,$6) ON CONFLICT (indicator,period,geography,source_id) DO UPDATE SET value=EXCLUDED.value,meta=EXCLUDED.meta,retrieved_at=now()",[ind,x.value,x.period,x.partner,"https://comtradeplus.un.org",JSON.stringify({hs,qty:x.qty,flow:"partner exports to Angola (mirror)",method:"UN Comtrade public preview, reporter-declared FOB values"})]);
    await db.query("UPDATE iq_sources SET status='operational',last_ok=now(),last_run=now(),last_error=NULL WHERE id='comtrade'");
    return rows;
   }
  }catch(e){lastErr=e instanceof Error?e.message:"failed";}
 }
 await db.query("UPDATE iq_sources SET status='degraded',last_run=now(),last_error=$1 WHERE id='comtrade'",[lastErr||"no data returned"]);
 if(cached.rows.length)return cached.rows;
 throw new Error(lastErr||"Comtrade returned no data for this commodity");
}

/* OpenStreetMap import (Overpass). Community data: stored with source link, marked unverified until the owner verifies. */
const OSM_Q:Record<string,string>={
 ports:`nwr["landuse"="port"]["name"](area.a);nwr["industrial"="port"]["name"](area.a);nwr["harbour"="yes"]["name"](area.a);`,
 airports:`nwr["aeroway"="aerodrome"]["iata"](area.a);`,
 industrial:`nwr["landuse"="industrial"]["name"](area.a);`,
 fuel:`node["amenity"="fuel"]["name"](area.a);`,
 markets:`nwr["amenity"="marketplace"]["name"](area.a);`,
 hospitals:`nwr["amenity"="hospital"]["name"](area.a);`
};
const LABEL:Record<string,string>={ports:"Port",airports:"Airport",industrial:"Industrial area",fuel:"Fuel station",markets:"Market",hospitals:"Hospital"};
export async function osmImport(category:string){
 const q=`[out:json][timeout:25];area["ISO3166-1"="AO"][admin_level=2]->.a;(${OSM_Q[category]});out center 250;`;
 const r=await fetch("https://overpass-api.de/api/interpreter",{method:"POST",body:"data="+encodeURIComponent(q),headers:{"Content-Type":"application/x-www-form-urlencoded","user-agent":"AngolaIQ/1.0"},signal:AbortSignal.timeout(40000)});
 if(!r.ok)throw new Error(`Overpass HTTP ${r.status}`);
 const j=await r.json() as {elements?:Array<{type:string;id:number;lat?:number;lon?:number;center?:{lat:number;lon:number};tags?:Record<string,string>}>};
 const db=await iqDb();let n=0;
 for(const e of j.elements??[]){
  const lat=e.lat??e.center?.lat,lng=e.lon??e.center?.lon,name=e.tags?.name;if(!lat||!lng||!name)continue;
  if(lat<-19||lat>-4||lng<11||lng>25)continue;
  const res=await db.query("INSERT INTO iq_locations (name,category,province,lat,lng,source,source_url,verified,ext_id) VALUES ($1,$2,$3,$4,$5,'OpenStreetMap',$6,false,$7) ON CONFLICT (ext_id) DO NOTHING",[name.slice(0,120),LABEL[category],e.tags?.["addr:province"]??e.tags?.["is_in:province"]??null,lat,lng,`https://www.openstreetmap.org/${e.type}/${e.id}`,`osm:${e.type}/${e.id}`]);
  n+=res.rowCount??0;
 }
 await db.query("UPDATE iq_sources SET status='operational',last_ok=now(),last_run=now(),last_error=NULL WHERE id='osm'");
 return n;
}
