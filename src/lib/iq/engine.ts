import {iqDb} from "@/lib/iq/db";
import {notify} from "@/lib/alerts";

/*
 * AngolaIQ intelligence engine: provider registry, ingestion jobs, watchlist matching.
 * Every record keeps source, URL and retrieval time. A failed provider never deletes stored data.
 */

type Src={id:string;name:string;kind:string;url:string;trust:"primary"|"trusted"|"unverified";config?:string};
export const SOURCES:Src[]=[
 {id:"worldbank",name:"World Bank Open Data",kind:"macro",url:"https://data.worldbank.org/country/angola",trust:"primary"},
 {id:"fx",name:"ExchangeRate-API (open access)",kind:"fx",url:"https://www.exchangerate-api.com",trust:"trusted"},
 {id:"gdelt",name:"GDELT news index",kind:"news",url:"https://www.gdeltproject.org",trust:"trusted"},
 {id:"fred",name:"FRED (St. Louis Fed) commodity prices",kind:"commodities",url:"https://fred.stlouisfed.org",trust:"primary",config:"FRED_API_KEY (free at fred.stlouisfed.org)"},
 {id:"comtrade",name:"UN Comtrade (public preview)",kind:"trade",url:"https://comtradeplus.un.org",trust:"primary"},
 {id:"osm",name:"OpenStreetMap (Overpass)",kind:"map",url:"https://www.openstreetmap.org",trust:"trusted"},
 {id:"ai",name:"AI analysis (Groq / Gemini)",kind:"ai",url:"",trust:"unverified"},
 {id:"manual",name:"Entered by owner",kind:"manual",url:"",trust:"trusted"}
];

const TRUSTED_DOMAINS=["reuters.com","bloomberg.com","ft.com","angop.ao","jornaldeangola.ao","expansao.co.ao","novojornal.co.ao","macauhub.com.mo","theafricareport.com","worldbank.org","imf.org","bna.ao","minfin.gov.ao","africanews.com","apnews.com","bbc.com","bbc.co.uk","lusa.pt","rtp.pt","dw.com","economist.com","verangola.net"];
const CATS:Array<[string,RegExp]>=[
 ["oil_gas",/\b(oil|crude|petrol|petróleo|sonangol|lng|gas|barrel|opec|refin)/i],["mining",/\b(diamond|diamante|mining|mineração|endiama|catoca|copper|gold mine)/i],
 ["agriculture",/\b(agricult|farm|crop|harvest|maize|milho|coffee|café|cattle|fertili)/i],["food",/\b(food|aliment|flour|farinha|wheat|trigo|rice|arroz|sugar|açúcar|dairy|leite|beverage|bebida)/i],
 ["finance",/\b(bank|banco|kwanza|bna|inflation|inflação|bond|debt|dívida|imf|fmi|credit|crédito|exchange rate|câmbio|interest rate)/i],
 ["trade",/\b(trade|comércio|export|import|tariff|tarifa|customs|alfândega|afcfta)/i],["logistics",/\b(port|porto|lobito|corridor|corredor|shipping|freight|cargo|rail|ferrov|airport|aeroporto)/i],
 ["infrastructure",/\b(infrastructure|infraestrutura|road|estrada|bridge|ponte|power plant|dam|barragem|water supply)/i],["construction",/\b(construction|construção|cement|cimento|housing|habitação|tender|concurso)/i],
 ["technology",/\b(tech|digital|telecom|internet|unitel|africell|fintech|startup)/i],["retail",/\b(retail|supermarket|supermercado|shoprite|kero|consumer|consumo)/i],
 ["manufacturing",/\b(factory|fábrica|industr|manufactur)/i],["regulation",/\b(law|lei|decree|decreto|regulat|regulamento|tax|imposto|agt|licen)/i],["politics",/\b(president|presidente|lourenço|mpla|unita|election|eleiç|minister|ministro|government|governo|parliament)/i]
];
export const categorize=(t:string)=>CATS.find(([,re])=>re.test(t))?.[0]??"economy";
const titleKey=(t:string)=>t.toLowerCase().normalize("NFD").replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim().slice(0,70);
const reliability=(domain:string)=>TRUSTED_DOMAINS.some(d=>domain===d||domain.endsWith("."+d))?"trusted":"unverified";

async function setSource(id:string,ok:boolean,error?:string){
 const db=await iqDb();
 await db.query("UPDATE iq_sources SET last_run=now(), status=$2, last_ok=CASE WHEN $3 THEN now() ELSE last_ok END, last_error=$4 WHERE id=$1",[id,ok?"operational":"degraded",ok,ok?null:(error??"failed").slice(0,300)]);
}
export async function seedSources(){
 const db=await iqDb();
 for(const s of SOURCES)await db.query("INSERT INTO iq_sources (id,name,kind,url,trust,config_needed,status) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,url=EXCLUDED.url,config_needed=EXCLUDED.config_needed",[s.id,s.name,s.kind,s.url,s.trust,s.config??null,s.config&&!process.env[s.config.split(" ")[0]]?"not_configured":"not_run"]);
}
async function getJSON<T>(url:string,init?:RequestInit):Promise<T>{const r=await fetch(url,{...init,cache:"no-store",signal:AbortSignal.timeout(15000),headers:{"user-agent":"AngolaIQ/1.0 (private research)",...(init?.headers??{})}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json() as Promise<T>;}

/* --- Providers --- */
const WB=[["NY.GDP.MKTP.KD.ZG","GDP growth","% annual"],["FP.CPI.TOTL.ZG","Inflation","% annual"],["SP.POP.TOTL","Population","people"],["SL.UEM.TOTL.ZS","Unemployment","% labour force"],["NY.GDP.MKTP.CD","GDP","current US$"],["NE.IMP.GNFS.ZS","Imports","% of GDP"],["NE.EXP.GNFS.ZS","Exports","% of GDP"]];
async function worldBank(){
 const db=await iqDb();let n=0;
 for(const [code,name,unit] of WB){
  const url=`https://api.worldbank.org/v2/country/AGO/indicator/${code}?format=json&per_page=12`;
  const j=await getJSON<[unknown,Array<{date:string;value:number|null}>|null]>(url);
  for(const r of (j[1]??[]).filter(r=>r.value!==null)){await db.query("INSERT INTO iq_obs (indicator,value,unit,period,source_id,source_url,meta) VALUES ($1,$2,$3,$4,'worldbank',$5,$6) ON CONFLICT (indicator,period,geography,source_id) DO UPDATE SET value=EXCLUDED.value,retrieved_at=now()",[name,r.value,unit,r.date,url,JSON.stringify({code})]);n++;}
 }
 return n;
}
async function fx(){
 const j=await getJSON<{result:string;rates?:Record<string,number>;time_last_update_utc?:string}>("https://open.er-api.com/v6/latest/USD");
 if(j.result!=="success"||!j.rates?.AOA)throw new Error("AOA rate missing");
 const day=new Date(j.time_last_update_utc??Date.now()).toISOString().slice(0,10);
 const db=await iqDb();
 for(const [cur,label] of [["AOA","USD/AOA"],["EUR","USD/EUR"],["ZAR","USD/ZAR"],["CNY","USD/CNY"]] as const)if(j.rates[cur])await db.query("INSERT INTO iq_obs (indicator,value,unit,period,source_id,source_url) VALUES ($1,$2,$3,$4,'fx','https://open.er-api.com/v6/latest/USD') ON CONFLICT (indicator,period,geography,source_id) DO UPDATE SET value=EXCLUDED.value,retrieved_at=now()",[label,j.rates[cur],cur+" per USD",day]);
 return 1;
}
const FRED=[["DCOILBRENTEU","Brent crude","US$/barrel"],["PWHEAMTUSDM","Wheat","US$/metric ton"],["PRICENPQUSDM","Rice","US$/metric ton"],["PSUGAISAUSDM","Sugar","US cents/pound"],["PMAIZMTUSDM","Maize","US$/metric ton"],["PSOILUSDM","Soybean oil","US$/metric ton"],["PPOILUSDM","Palm oil","US$/metric ton"]];
async function fred(){
 const key=process.env.FRED_API_KEY;if(!key){const db=await iqDb();await db.query("UPDATE iq_sources SET status='not_configured',last_run=now() WHERE id='fred'");return -1;}
 const db=await iqDb();let n=0;
 for(const [id,name,unit] of FRED){
  const j=await getJSON<{observations?:Array<{date:string;value:string}>}>(`https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${key}&file_type=json&sort_order=desc&limit=24`);
  for(const o of j.observations??[]){const v=Number(o.value);if(!Number.isFinite(v))continue;await db.query("INSERT INTO iq_obs (indicator,value,unit,period,geography,source_id,source_url,meta) VALUES ($1,$2,$3,$4,'World','fred',$5,$6) ON CONFLICT (indicator,period,geography,source_id) DO UPDATE SET value=EXCLUDED.value,retrieved_at=now()",[name,v,unit,o.date,`https://fred.stlouisfed.org/series/${id}`,JSON.stringify({series:id})]);n++;}
 }
 return n;
}
async function news(){
 const q=encodeURIComponent("(Angola OR Luanda OR Lobito OR kwanza) (economy OR business OR trade OR investment OR oil OR bank OR port OR economia OR investimento OR comercio)");
 const j=await getJSON<{articles?:Array<{url:string;title:string;seendate:string;domain:string;language?:string;sourcecountry?:string}>}>(`https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&format=json&maxrecords=100&sort=datedesc&timespan=2d`);
 const db=await iqDb();let n=0;
 for(const a of j.articles??[]){
  if(!a.url?.startsWith("http")||!a.title)continue;
  const key=titleKey(a.title);
  const dup=await db.query("SELECT 1 FROM iq_items WHERE title_key=$1 AND retrieved_at>now()-interval '4 days' LIMIT 1",[key]);if(dup.rows.length)continue;
  const s=a.seendate,pub=/^\d{8}T\d{6}Z$/.test(s)?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(9,11)}:${s.slice(11,13)}:${s.slice(13,15)}Z`:null;
  const r=await db.query("INSERT INTO iq_items (source_id,title,url,publisher,published_at,category,reliability,title_key) VALUES ('gdelt',$1,$2,$3,$4,$5,$6,$7) ON CONFLICT (url) DO NOTHING",[a.title.slice(0,300),a.url,a.domain,pub,categorize(a.title),reliability(a.domain),key]);
  n+=r.rowCount??0;
 }
 return n;
}

/* Watchlist: match new items, store hits once, push instant alerts. */
export async function matchWatchlist(){
 const db=await iqDb();
 const {rows:watches}=await db.query("SELECT id,keyword,frequency FROM iq_watch WHERE active");
 let pushed=0;
 for(const w of watches){
  const ins=await db.query(`INSERT INTO iq_watch_hits (watch_id,item_id) SELECT $1,id FROM iq_items WHERE retrieved_at>now()-interval '3 days' AND (title ILIKE '%'||$2||'%' OR coalesce(summary,'') ILIKE '%'||$2||'%') ON CONFLICT DO NOTHING RETURNING item_id`,[w.id,w.keyword]);
  const c=ins.rowCount??0;if(!c)continue;
  await db.query("UPDATE iq_watch SET match_count=match_count+$2,last_triggered=now() WHERE id=$1",[w.id,c]);
  if(w.frequency==="instant"){
   const {rows}=await db.query("SELECT title FROM iq_items WHERE id=$1",[ins.rows[0].item_id]);
   await notify({level:"amber",title:`👁 AngolaIQ: "${w.keyword}" (${c} new)`,body:rows[0]?.title??"",url:"/iq/news?q="+encodeURIComponent(w.keyword)}).catch(()=>0);
   await db.query("UPDATE iq_watch_hits SET notified=true WHERE watch_id=$1",[w.id]);pushed++;
  }
 }
 return pushed;
}

const JOBS:Array<{name:string;every:number;run:()=>Promise<number>;source:string}>=[
 {name:"news",every:60,run:news,source:"gdelt"},
 {name:"fx",every:360,run:fx,source:"fx"},
 {name:"worldbank",every:1440,run:worldBank,source:"worldbank"},
 {name:"fred",every:1440,run:fred,source:"fred"}
];

/* Runs due jobs (or all when force). Called by the 15-min NASSIM OS check and by "Refresh" in AngolaIQ. */
export async function runIqJobs(force=false,only?:string){
 const db=await iqDb();await seedSources();
 const out:Record<string,string>={};
 for(const j of JOBS){
  if(only&&j.name!==only)continue;
  await db.query("INSERT INTO iq_jobs (name,every_minutes) VALUES ($1,$2) ON CONFLICT (name) DO UPDATE SET every_minutes=EXCLUDED.every_minutes",[j.name,j.every]);
  const {rows}=await db.query("SELECT last_run FROM iq_jobs WHERE name=$1",[j.name]);
  if(!force&&rows[0]?.last_run&&Date.now()-Date.parse(rows[0].last_run)<j.every*60_000)continue;
  let ok=true,msg="";
  try{const n=await j.run();msg=n<0?"not configured":`${n} records`;if(n>=0)await setSource(j.source,true);}catch(e){ok=false;msg=e instanceof Error?e.message:"failed";await setSource(j.source,false,msg);}
  await db.query(`UPDATE iq_jobs SET last_run=now(),runs=runs+1,last_ok=CASE WHEN $2::boolean THEN now() ELSE last_ok END,last_error=CASE WHEN $2::boolean THEN NULL ELSE $3::text END,history=(SELECT coalesce(jsonb_agg(e),'[]'::jsonb) FROM (SELECT e FROM jsonb_array_elements(jsonb_build_array(jsonb_build_object('at',now(),'ok',$2::boolean,'msg',$3::text))||history) e LIMIT 10) s) WHERE name=$1`,[j.name,ok,msg]);
  out[j.name]=ok?msg:`error: ${msg}`;
 }
 try{out.watchlist=`${await matchWatchlist()} alerts`;}catch(e){out.watchlist=`error: ${e instanceof Error?e.message:"failed"}`;}
 return out;
}
