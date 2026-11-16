import {iqDb} from "@/lib/iq/db";
import {notify} from "@/lib/alerts";

/*
 * AngolaIQ intelligence engine: provider registry, ingestion jobs, watchlist matching.
 * Every record keeps source, URL and retrieval time. A failed provider never deletes stored data.
 */

type Src={id:string;name:string;kind:string;url:string;trust:"primary"|"trusted"|"unverified";config?:string};
export const SOURCES:Src[]=[
 {id:"worldbank",name:"World Bank Open Data (via DBnomics)",kind:"macro",url:"https://data.worldbank.org/country/angola",trust:"primary"},
 {id:"fx",name:"ExchangeRate-API (open access)",kind:"fx",url:"https://www.exchangerate-api.com",trust:"trusted"},
 {id:"gnews",name:"Google News RSS (Angola business)",kind:"news",url:"https://news.google.com",trust:"trusted"},
 {id:"gdelt",name:"GDELT news index (often blocks cloud servers)",kind:"news",url:"https://www.gdeltproject.org",trust:"trusted"},
 {id:"imf",name:"IMF World Economic Outlook (DataMapper)",kind:"macro",url:"https://www.imf.org/external/datamapper",trust:"primary"},
 {id:"fred",name:"FRED (St. Louis Fed) commodity prices",kind:"commodities",url:"https://fred.stlouisfed.org",trust:"primary",config:"FRED_API_KEY (free at fred.stlouisfed.org)"},
 {id:"comtrade",name:"UN Comtrade (public preview)",kind:"trade",url:"https://comtradeplus.un.org",trust:"primary"},
 {id:"osm",name:"OpenStreetMap (via Photon search)",kind:"map",url:"https://photon.komoot.io",trust:"trusted"},
 {id:"ai",name:"AI analysis (Groq / Gemini)",kind:"ai",url:"",trust:"unverified"},
 {id:"manual",name:"Entered by owner",kind:"manual",url:"",trust:"trusted"}
];

const TRUSTED_DOMAINS=["zawya.com","observador.pt","expresso.pt","publico.pt","jornaldenegocios.pt","eco.sapo.pt","dn.pt","sapo.pt","mercado.co.ao","forbesafricalusofona.com","allafrica.com","businessday.ng","reuters.com","bloomberg.com","ft.com","angop.ao","jornaldeangola.ao","expansao.co.ao","novojornal.co.ao","macauhub.com.mo","theafricareport.com","worldbank.org","imf.org","bna.ao","minfin.gov.ao","africanews.com","apnews.com","bbc.com","bbc.co.uk","lusa.pt","rtp.pt","dw.com","economist.com","verangola.net"];
const CATS:Array<[string,RegExp]>=[
 ["oil_gas",/\b(oil|crude|petrol|petróleo|sonangol|lng|gas|barrel|opec|refin)/i],["mining",/\b(diamond|diamante|mining|mineração|endiama|catoca|copper|gold mine)/i],
 ["agriculture",/\b(agricult|farm|crop|harvest|maize|milho|coffee|café|cattle|fertili)/i],["food",/\b(food|aliment|flour|farinha|wheat|trigo|rice|arroz|sugar|açúcar|dairy|leite|beverage|bebida)/i],
 ["finance",/\b(bank|banco|kwanza|bna|inflation|inflação|bond|debt|dívida|imf|fmi|credit|crédito|exchange rate|câmbio|interest rate)/i],
 ["trade",/\b(trade|comércio|export|import|tariff|tarifa|customs|alfândega|afcfta)/i],["logistics",/\b(port|porto|lobito|corridor|corredor|shipping|freight|cargo|rail|ferrov|airport|aeroporto)/i],
 ["infrastructure",/\b(infrastructure|infraestrutura|road|estrada|bridge|ponte|power plant|dam|barragem|water supply)/i],["construction",/\b(construction|construção|cement|cimento|housing|habitação|tender|concurso)/i],
 ["technology",/\b(tech|digital|telecom|internet|unitel|africell|fintech|startup)/i],["retail",/\b(retail|supermarket|supermercado|shoprite|kero|consumer|consumo)/i],
 ["manufacturing",/\b(factory|fábrica|industr|manufactur)/i],["regulation",/\b(law|lei|decree|decreto|regulat|regulamento|tax|imposto|agt|licen)/i],["politics",/\b(president|presidente|lourenço|mpla|unita|election|eleiç|minister|ministro|government|governo|parliament)/i]
];
export const ABOUT_ANGOLA=/(angol|luanda|lobito|benguela|kwanza|cabinda|huambo|namibe|lubango|malanje|sonangol|soyo)/i;
export const categorize=(t:string)=>CATS.find(([,re])=>re.test(t))?.[0]??"economy";
const titleKey=(t:string)=>t.toLowerCase().normalize("NFD").replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim().slice(0,70);
const reliability=(domain:string)=>TRUSTED_DOMAINS.some(d=>domain===d||domain.endsWith("."+d))?"trusted":"unverified";

async function setSource(id:string,ok:boolean,error?:string){
 const db=await iqDb();
 await db.query("UPDATE iq_sources SET last_run=now(), status=$2, last_ok=CASE WHEN $3 THEN now() ELSE last_ok END, last_error=$4 WHERE id=$1",[id,ok?"operational":/rate limited/.test(error??"")?"rate_limited":"degraded",ok,ok?null:(error??"failed").slice(0,300)]);
}
export async function seedSources(){
 const db=await iqDb();
 for(const j of JOB_LIST)await db.query("INSERT INTO iq_jobs (name,every_minutes) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING",j);
 for(const s of SOURCES)await db.query("INSERT INTO iq_sources (id,name,kind,url,trust,config_needed,status) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,url=EXCLUDED.url,config_needed=EXCLUDED.config_needed",[s.id,s.name,s.kind,s.url,s.trust,s.config??null,s.config&&!process.env[s.config.split(" ")[0]]?"not_configured":"not_run"]);
}
const why=(e:unknown)=>{const c=(e as {cause?:{code?:string;message?:string}})?.cause;return e instanceof Error?(e.name==="TimeoutError"?"timeout":c?.code??c?.message??e.message):"failed";};
async function getJSON<T>(url:string,init?:RequestInit):Promise<T>{
 for(let attempt=0;;attempt++){
  try{const r=await fetch(url,{...init,cache:"no-store",signal:AbortSignal.timeout(20000),headers:{"user-agent":"AngolaIQ/1.0 (private research)",...(init?.headers??{})}});if(!r.ok)throw Object.assign(new Error(`HTTP ${r.status}`),{status:r.status});return await r.json() as T;}
  catch(e){const st=(e as {status?:number}).status;if(attempt>=1||(st&&st<500))throw new Error(st?`HTTP ${st}`:why(e));await new Promise(x=>setTimeout(x,2500));}
 }
}

/* --- Providers --- */
const WB=[["NY.GDP.MKTP.KD.ZG","GDP growth","% annual"],["FP.CPI.TOTL.ZG","Inflation","% annual"],["SP.POP.TOTL","Population","people"],["SL.UEM.TOTL.ZS","Unemployment","% labour force"],["NY.GDP.MKTP.CD","GDP","current US$"],["NE.IMP.GNFS.ZS","Imports","% of GDP"],["NE.EXP.GNFS.ZS","Exports","% of GDP"]];
/* World Bank WDI via DBnomics (official mirror). The World Bank API itself returned HTTP 502 to Vercel servers (tested 16 Nov 2026). */
async function worldBank(){
 const db=await iqDb();let n=0;const errors:string[]=[];
 await Promise.all(WB.map(async([code,name,unit])=>{
  try{
   const j=await getJSON<{series?:{docs?:Array<{period:string[];value:Array<number|string>}>}}>(`https://api.db.nomics.world/v22/series/WB/WDI/A-${code}-AGO?observations=1&format=json`);
   const d=j.series?.docs?.[0];if(!d)throw new Error("series missing");
   const rows=d.period.map((p,i)=>[p,d.value[i]] as const).filter(([,v])=>typeof v==="number").slice(-8);
   for(const [period,v] of rows){await db.query("INSERT INTO iq_obs (indicator,value,unit,period,source_id,source_url,meta) VALUES ($1,$2,$3,$4,'worldbank',$5,$6) ON CONFLICT (indicator,period,geography,source_id) DO UPDATE SET value=EXCLUDED.value,retrieved_at=now()",[name,v,unit,period,`https://data.worldbank.org/indicator/${code}?locations=AO`,JSON.stringify({code,via:"DBnomics"})]);n++;}
  }catch(e){errors.push(`${name}: ${why(e)}`);}
 }));
 if(!n)throw new Error(errors.join("; ")||"no data");
 return n;
}
/* IMF WEO DataMapper (free, no key): backup macro source. Future years are IMF projections and are labelled as such. */
const IMF=[["NGDP_RPCH","GDP growth","% annual"],["PCPIPCH","Inflation","% annual"],["LP","Population","million people"],["NGDPD","GDP","US$ billion"],["LUR","Unemployment","% labour force"],["GGXWDG_NGDP","Government debt","% of GDP"]];
async function imf(){
 const db=await iqDb();let n=0;const thisYear=new Date().getUTCFullYear();const errors:string[]=[];
 await Promise.all(IMF.map(async([code,name,unit])=>{
  const url=`https://www.imf.org/external/datamapper/api/v1/${code}/AGO`;
  try{const j=await getJSON<{values?:Record<string,{AGO?:Record<string,number>}>}>(url,{headers:{"user-agent":"curl/8.5.0",accept:"*/*"}}); // IMF CDN blocks non-curl user agents (tested)
   const series=j.values?.[code]?.AGO??{};
   for(const [year,v] of Object.entries(series)){const y=Number(year);if(!Number.isFinite(v)||y<thisYear-8||y>thisYear+1)continue;
    await db.query("INSERT INTO iq_obs (indicator,value,unit,period,source_id,source_url,meta) VALUES ($1,$2,$3,$4,'imf',$5,$6) ON CONFLICT (indicator,period,geography,source_id) DO UPDATE SET value=EXCLUDED.value,retrieved_at=now()",[name,v,unit,year,`https://www.imf.org/external/datamapper/${code}@WEO/AGO`,JSON.stringify({code,projection:y>=thisYear})]);n++;}
  }catch(e){errors.push(`${name}: ${e instanceof Error?e.message:"failed"}`);}
 }));
 if(!n)throw new Error(errors.join("; ")||"no data");
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
async function saveNews(db:Awaited<ReturnType<typeof iqDb>>,src:string,a:{title:string;url:string;publisher:string;domain:string;pub:string|null}){
 if(!ABOUT_ANGOLA.test(a.title))return 0; // keep only headlines that are about Angola
 const key=titleKey(a.title);
 const dup=await db.query("SELECT 1 FROM iq_items WHERE title_key=$1 AND retrieved_at>now()-interval '4 days' LIMIT 1",[key]);if(dup.rows.length)return 0;
 const r=await db.query("INSERT INTO iq_items (source_id,title,url,publisher,published_at,category,reliability,title_key,raw) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (url) DO NOTHING",[src,a.title.slice(0,300),a.url,a.publisher,a.pub,categorize(a.title),reliability(a.domain),key,JSON.stringify({domain:a.domain})]);
 return r.rowCount??0;
}
const unxml=(t:string)=>t.replace(/<!\[CDATA\[|\]\]>/g,"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim();
/* Google News RSS: headline, publisher and date; the link opens the original article via Google. Tested reachable from Vercel. */
async function gnews(){
 const feeds=[["Angola economia OR negócios OR comércio OR investimento","pt-PT","PT","PT:pt-150"],["Angola economy OR business OR trade OR investment","en-US","US","US:en"],["Luanda OR Lobito porto OR importação OR preços","pt-PT","PT","PT:pt-150"]];
 const db=await iqDb();let n=0;let ok=0;const errors:string[]=[];
 for(const [q,hl,gl,ceid] of feeds){
  try{
   const r=await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(q+" when:3d")}&hl=${hl}&gl=${gl}&ceid=${ceid}`,{cache:"no-store",signal:AbortSignal.timeout(15000)});
   if(!r.ok)throw new Error(`HTTP ${r.status}`);ok++;
   const xml=await r.text();
   for(const it of xml.split("<item>").slice(1,61)){
    const g=(tag:string)=>unxml(it.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1]??"");
    const src=it.match(/<source url="([^"]+)">([\s\S]*?)<\/source>/);
    const publisher=src?unxml(src[2]):"";let title=g("title");if(publisher&&title.endsWith(" - "+publisher))title=title.slice(0,-(publisher.length+3));
    const url=g("link"),pd=g("pubDate");if(!title||!url.startsWith("http"))continue;
    let domain="";try{domain=src?new URL(src[1]).hostname.replace(/^www\./,""):"";}catch{}
    n+=await saveNews(db,"gnews",{title,url,publisher:publisher||domain,domain,pub:pd?new Date(pd).toISOString():null});
   }
  }catch(e){errors.push(why(e));}
 }
 if(!ok)throw new Error(errors.join("; ")||"no feed reachable");
 return n;
}
/* GDELT: best effort only. Its API rate-limits shared cloud IPs (tested: HTTP 429 from Vercel). */
async function gdelt(){
 const q=encodeURIComponent("(Angola OR Luanda OR Lobito OR kwanza) (economy OR business OR trade OR investment OR oil OR bank OR port OR economia OR investimento OR comercio)");
 const r=await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&format=json&maxrecords=100&sort=datedesc&timespan=2d`,{cache:"no-store",signal:AbortSignal.timeout(15000)}).catch(e=>{throw new Error(why(e));});
 if(r.status===429)throw new Error("rate limited (GDELT blocks shared cloud servers)");
 if(!r.ok)throw new Error(`HTTP ${r.status}`);
 const j=await r.json() as {articles?:Array<{url:string;title:string;seendate:string;domain:string}>};
 const db=await iqDb();let n=0;
 for(const a of j.articles??[]){if(!a.url?.startsWith("http")||!a.title)continue;const s=a.seendate;
  n+=await saveNews(db,"gdelt",{title:a.title,url:a.url,publisher:a.domain,domain:a.domain,pub:/^\d{8}T\d{6}Z$/.test(s)?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(9,11)}:${s.slice(11,13)}:${s.slice(13,15)}Z`:null});}
 return n;
}
async function news(){
 const n=await gnews();
 try{const m=await gdelt();await setSource("gdelt",true);return n+m;}catch(e){await setSource("gdelt",false,e instanceof Error?e.message:"failed");return n;}
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

const JOB_LIST:Array<[string,number]>=[["news",60],["fx",360],["worldbank",1440],["imf",1440],["fred",1440]];
const JOBS:Array<{name:string;every:number;run:()=>Promise<number>;source:string}>=[
 {name:"news",every:60,run:news,source:"gnews"},
 {name:"fx",every:360,run:fx,source:"fx"},
 {name:"worldbank",every:1440,run:worldBank,source:"worldbank"},
 {name:"imf",every:1440,run:imf,source:"imf"},
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
  try{const n=await j.run();if(n<0){ok=false;msg="not configured (add FRED_API_KEY)";}else{msg=`${n} records`;await setSource(j.source,true);}}catch(e){ok=false;msg=e instanceof Error?e.message:"failed";await setSource(j.source,false,msg);}
  await db.query(`UPDATE iq_jobs SET last_run=now(),runs=runs+1,last_ok=CASE WHEN $2::boolean THEN now() ELSE last_ok END,last_error=CASE WHEN $2::boolean THEN NULL ELSE $3::text END,history=(SELECT coalesce(jsonb_agg(e),'[]'::jsonb) FROM (SELECT e FROM jsonb_array_elements(jsonb_build_array(jsonb_build_object('at',now(),'ok',$2::boolean,'msg',$3::text))||history) e LIMIT 10) s) WHERE name=$1`,[j.name,ok,msg]);
  out[j.name]=ok?msg:`error: ${msg}`;
 }
 try{out.watchlist=`${await matchWatchlist()} alerts`;}catch(e){out.watchlist=`error: ${e instanceof Error?e.message:"failed"}`;}
 return out;
}
