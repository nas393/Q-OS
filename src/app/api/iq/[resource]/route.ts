import {NextResponse} from "next/server";
import {z} from "zod";
import {readSession} from "@/lib/session";
import {jsonError,requestOriginAllowed} from "@/lib/http";
import {writeAudit} from "@/lib/audit";
import {iqDb} from "@/lib/iq/db";
import {runIqJobs,seedSources} from "@/lib/iq/engine";
import {generateJSON} from "@/lib/iq/ai";
import * as P from "@/lib/iq/prompts";
import {tradeFor,osmImport} from "@/lib/iq/geo-trade";

export const runtime="nodejs",dynamic="force-dynamic",maxDuration=60;
const ok=(b:unknown)=>NextResponse.json(b,{headers:{"Cache-Control":"no-store"}});
type Ctx={params:Promise<{resource:string}>};
const uuid=z.string().uuid();

async function guard(req:Request,write=false){if(!await readSession())return jsonError(401,"Unauthorized");if(write&&!requestOriginAllowed(req))return jsonError(403,"Request origin rejected");return null;}
const fail=(e:unknown)=>{console.error("iq_api_failed",{error:e instanceof Error?e.message.slice(0,200):"unknown"});return jsonError(500,e instanceof Error&&/AI |not configured|HTTP|Comtrade|Overpass/.test(e.message)?e.message:"AngolaIQ request failed");};

/* ---------- GET ---------- */
export async function GET(req:Request,{params}:Ctx){
 const g=await guard(req);if(g)return g;
 const {resource}=await params;const u=new URL(req.url).searchParams;
 try{
  const db=await iqDb();
  switch(resource){
   case "dashboard":{
    await seedSources();
    const [obs,cnt,top,brief,hits,proj,src,jobs]=await Promise.all([
     db.query(`SELECT DISTINCT ON (indicator) indicator,value,unit,period,source_id,source_url,retrieved_at,(SELECT o2.value FROM iq_obs o2 WHERE o2.indicator=o.indicator AND o2.source_id=o.source_id AND o2.period<o.period ORDER BY o2.period DESC LIMIT 1) AS prev FROM iq_obs o ORDER BY indicator,period DESC`),
     db.query("SELECT count(*)::int AS total,count(*) FILTER (WHERE retrieved_at>now()-interval '24 hours')::int AS last24,count(*) FILTER (WHERE NOT reviewed)::int AS unreviewed FROM iq_items"),
     db.query("SELECT id,title,url,publisher,published_at,category,impact,reliability FROM iq_items ORDER BY published_at DESC NULLS LAST LIMIT 8"),
     db.query("SELECT id,output,provider,model,created_at FROM iq_analyses WHERE kind='briefing' ORDER BY created_at DESC LIMIT 1"),
     db.query("SELECT w.keyword,count(*)::int AS n,max(h.created_at) AS last FROM iq_watch_hits h JOIN iq_watch w ON w.id=h.watch_id WHERE h.created_at>now()-interval '7 days' GROUP BY w.keyword ORDER BY last DESC LIMIT 6"),
     db.query("SELECT status,count(*)::int AS n FROM iq_projects WHERE NOT archived GROUP BY status"),
     db.query("SELECT id,name,status,last_ok,last_error,config_needed FROM iq_sources ORDER BY id"),
     db.query("SELECT name,last_run,last_ok,last_error,every_minutes FROM iq_jobs")
    ]);
    return ok({obs:obs.rows,counts:cnt.rows[0],top:top.rows,briefing:brief.rows[0]??null,hits:hits.rows,projects:proj.rows,sources:src.rows,jobs:jobs.rows});
   }
   case "items":{
    const q=u.get("q")?.trim().slice(0,80)??"",cat=u.get("cat")??"",rel=u.get("rel")??"",days=Math.min(Number(u.get("days")??30)||30,365),page=Math.max(0,Number(u.get("page")??0)||0),pub=u.get("pub")??"";
    const {rows}=await db.query(`SELECT i.*,EXISTS(SELECT 1 FROM iq_saved s WHERE s.kind='news' AND s.ref_id=i.id::text AND NOT s.archived) AS saved FROM iq_items i WHERE ($1='' OR i.title ILIKE '%'||$1||'%' OR coalesce(i.summary,'') ILIKE '%'||$1||'%') AND ($2='' OR i.category=$2) AND ($3='' OR i.reliability=$3) AND coalesce(i.published_at,i.retrieved_at)>now()-($4||' days')::interval AND ($6='' OR i.publisher=$6) ORDER BY coalesce(i.published_at,i.retrieved_at) DESC LIMIT 30 OFFSET $5`,[q,cat,rel,String(days),page*30,pub]);
    const pubs=await db.query("SELECT publisher,count(*)::int AS n FROM iq_items WHERE publisher IS NOT NULL GROUP BY publisher ORDER BY n DESC LIMIT 25");
    return ok({items:rows,publishers:pubs.rows,page});
   }
   case "analyses":{
    const kind=u.get("kind")??"",id=u.get("id");
    if(id&&uuid.safeParse(id).success){const {rows}=await db.query("SELECT * FROM iq_analyses WHERE id=$1 OR parent_id=$1 ORDER BY created_at",[id]);return ok({analyses:rows});}
    const {rows}=await db.query("SELECT id,kind,title,input,output,provider,model,parent_id,version,created_at FROM iq_analyses WHERE ($1='' OR kind=$1) ORDER BY created_at DESC LIMIT 50",[kind]);
    return ok({analyses:rows});
   }
   case "projects":{const {rows}=await db.query("SELECT * FROM iq_projects WHERE archived=$1 ORDER BY updated_at DESC",[u.get("archived")==="1"]);return ok({projects:rows});}
   case "saved":{const {rows}=await db.query("SELECT * FROM iq_saved WHERE archived=$1 AND ($2='' OR kind=$2) AND ($3='' OR title ILIKE '%'||$3||'%' OR coalesce(notes,'') ILIKE '%'||$3||'%' OR $3=ANY(tags)) ORDER BY created_at DESC LIMIT 200",[u.get("archived")==="1",u.get("kind")??"",u.get("q")??""]);return ok({saved:rows});}
   case "watch":{const {rows}=await db.query("SELECT * FROM iq_watch ORDER BY active DESC,created_at DESC");const h=await db.query("SELECT h.created_at,w.keyword,i.title,i.url FROM iq_watch_hits h JOIN iq_watch w ON w.id=h.watch_id JOIN iq_items i ON i.id=h.item_id ORDER BY h.created_at DESC LIMIT 30");return ok({watch:rows,hits:h.rows});}
   case "sources":{await seedSources();const [s,j]=await Promise.all([db.query("SELECT * FROM iq_sources ORDER BY kind"),db.query("SELECT * FROM iq_jobs ORDER BY name")]);return ok({sources:s.rows,jobs:j.rows});}
   case "obs":{const {rows}=await db.query("SELECT indicator,value,unit,period,geography,source_id,source_url,retrieved_at,meta FROM iq_obs WHERE ($1='' OR indicator=$1) AND ($2='' OR source_id=$2) ORDER BY indicator,period DESC LIMIT 600",[u.get("indicator")??"",u.get("source")??""]);return ok({obs:rows});}
   case "locations":{const {rows}=await db.query("SELECT * FROM iq_locations ORDER BY category,name");return ok({locations:rows});}
   case "search":{const q=(u.get("q")??"").trim().slice(0,80);if(q.length<2)return ok({results:[]});
    const {rows}=await db.query(`(SELECT 'news' AS kind,id::text AS id,title,url FROM iq_items WHERE title ILIKE '%'||$1||'%' ORDER BY published_at DESC NULLS LAST LIMIT 8) UNION ALL (SELECT 'analysis',id::text,title,NULL FROM iq_analyses WHERE title ILIKE '%'||$1||'%' LIMIT 6) UNION ALL (SELECT 'project',id::text,name,NULL FROM iq_projects WHERE name ILIKE '%'||$1||'%' LIMIT 6) UNION ALL (SELECT 'location',id::text,name,NULL FROM iq_locations WHERE name ILIKE '%'||$1||'%' LIMIT 6)`,[q]);return ok({results:rows});}
   default:return jsonError(404,"Unknown resource");
  }
 }catch(e){return fail(e);}
}

/* ---------- AI helpers ---------- */
async function evidence(filter:string){
 const db=await iqDb();
 const words=filter.toLowerCase().split(/[^a-zà-ú0-9]+/).filter(w=>w.length>3).slice(0,8);
 const {rows:items}=await db.query(`SELECT title,publisher,published_at,url,summary FROM iq_items WHERE ${words.length?words.map((_,i)=>`title ILIKE '%'||$${i+1}||'%'`).join(" OR "):"true"} ORDER BY published_at DESC NULLS LAST LIMIT 25`,words);
 const {rows:obs}=await db.query("SELECT DISTINCT ON (indicator) indicator,value,unit,period,source_id FROM iq_obs ORDER BY indicator,period DESC");
 return [...items.map((r,i)=>`[${i+1}] ${r.title} — ${r.publisher??"?"}, ${r.published_at?new Date(r.published_at).toISOString().slice(0,10):"?"} ${r.url}${r.summary?`\n    ${r.summary}`:""}`),"INDICATORS:",...obs.map(o=>`${o.indicator}: ${Number(o.value)} ${o.unit} (${o.period}, ${o.source_id})`)].join("\n");
}
async function articleText(url:string){
 try{const r=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{"user-agent":"Mozilla/5.0 AngolaIQ"}});if(!r.ok)return "";
  const h=await r.text();return h.replace(/<(script|style|nav|footer|header)[\s\S]*?<\/\1>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/\s+/g," ").slice(0,9000);}catch{return "";}
}
async function saveAnalysis(kind:string,title:string,input:unknown,res:{data:unknown;provider:string;model:string},parent?:string){
 const db=await iqDb();
 const v=parent?(await db.query("SELECT coalesce(max(version),1)+1 AS v FROM iq_analyses WHERE id=$1 OR parent_id=$1",[parent])).rows[0].v:1;
 const {rows}=await db.query("INSERT INTO iq_analyses (kind,title,input,output,provider,model,parent_id,version) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",[kind,title.slice(0,200),JSON.stringify(input),JSON.stringify(res.data),res.provider,res.model,parent??null,v]);
 return rows[0];
}

/* ---------- POST ---------- */
const S=z.string().trim().max(2000);
const bodies={
 refresh:z.object({job:z.enum(["news","fx","worldbank","fred"]).optional()}),
 analyze:z.discriminatedUnion("kind",[
  z.object({kind:z.literal("devil"),input:z.object({idea:z.string().trim().min(10).max(3000),investment:S.optional(),sector:S.optional(),geography:S.optional(),revenue:S.optional(),costs:S.optional(),customer:S.optional(),model:S.optional(),return:S.optional(),timeline:S.optional(),evidence:S.optional()}),fromId:uuid.optional()}),
  z.object({kind:z.literal("devil_review"),parentId:uuid}),
  z.object({kind:z.literal("briefing")}),
  z.object({kind:z.literal("news"),itemId:uuid}),
  z.object({kind:z.literal("suggest"),input:z.object({sector:z.string().trim().min(2).max(80),context:S.optional(),budget:S.optional(),geography:S.optional(),model:S.optional(),customers:S.optional(),horizon:S.optional(),risk:S.optional(),capabilities:S.optional(),constraints:S.optional()})}),
  z.object({kind:z.literal("cluster"),sector:z.string().trim().min(2).max(80)}),
  z.object({kind:z.literal("compliance"),activity:z.string().trim().min(3).max(300)}),
  z.object({kind:z.literal("trade"),commodity:z.string().trim().max(40)})
 ]),
 projects:z.object({id:uuid.optional(),name:z.string().trim().min(1).max(160),description:S.optional(),sector:S.optional(),geography:S.optional(),status:z.enum(["idea","researching","compliance","active","paused","abandoned","completed"]).optional(),investment:S.optional(),target_date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),expected_outcome:S.optional(),notes:S.optional(),milestones:z.array(z.object({title:z.string().max(160),done:z.boolean(),due:z.string().max(10).optional()})).max(40).optional(),analysis_ids:z.array(uuid).max(40).optional(),item_ids:z.array(uuid).max(100).optional(),archived:z.boolean().optional()}),
 saved:z.object({kind:z.enum(["news","analysis","project","location","trade","regulation","report","observation"]),refId:z.string().max(80).optional(),title:z.string().trim().min(1).max(300),url:z.string().url().optional(),notes:S.optional(),tags:z.array(z.string().trim().max(30)).max(10).optional()}),
 watch:z.object({keyword:z.string().trim().min(2).max(60),category:z.enum(["all","news","port_arrivals","sector_reports"]).default("all"),frequency:z.enum(["instant","daily","weekly"]).default("instant"),priority:z.enum(["low","normal","high"]).default("normal")}),
 locations:z.object({name:z.string().trim().min(2).max(120),category:z.string().trim().min(2).max(40),province:S.optional(),lat:z.number().min(-19).max(-4),lng:z.number().min(11).max(25),source_url:z.string().url().optional(),notes:S.optional()}),
 osm:z.object({category:z.enum(["ports","airports","industrial","fuel","markets","hospitals"])})
};

export async function POST(req:Request,{params}:Ctx){
 const g=await guard(req,true);if(g)return g;
 const {resource}=await params;
 const raw=await req.json().catch(()=>null);
 try{
  const db=await iqDb();
  switch(resource){
   case "refresh":{const p=bodies.refresh.parse(raw??{});const r=await runIqJobs(true,p.job);await writeAudit({action:"iq.refresh",outcome:"succeeded",details:r});return ok({result:r});}
   case "analyze":{
    const p=bodies.analyze.safeParse(raw);if(!p.success)return jsonError(400,"Check the form: some fields are missing or too long.");
    const a=p.data;let row;
    if(a.kind==="devil"){const i=a.input;const ctx=Object.entries(i).filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join("\n");
     const res=await generateJSON(P.DEVIL.task+"\n\nIDEA:\n"+ctx,P.DEVIL.shape,await evidence(`${i.idea} ${i.sector??""}`));row=await saveAnalysis("devil",i.idea.slice(0,120),{...i,fromId:a.fromId},res);}
    else if(a.kind==="devil_review"){const {rows}=await db.query("SELECT * FROM iq_analyses WHERE id=$1",[a.parentId]);if(!rows[0])return jsonError(404,"Analysis not found");
     const res=await generateJSON(P.DEVIL_REVIEW.task+"\n\nIDEA INPUT:\n"+JSON.stringify(rows[0].input)+"\n\nFIRST ANALYSIS:\n"+JSON.stringify(rows[0].output),P.DEVIL_REVIEW.shape,"");row=await saveAnalysis("devil_review","Second review: "+rows[0].title,{parentId:a.parentId},res,a.parentId);}
    else if(a.kind==="briefing"){const {rows:items}=await db.query("SELECT title,publisher,published_at,url,summary FROM iq_items WHERE coalesce(published_at,retrieved_at)>now()-interval '48 hours' ORDER BY reliability='trusted' DESC,published_at DESC LIMIT 40");
     if(!items.length)return jsonError(409,"No news in the last 48 hours yet. Tap Refresh first.");
     const {rows:obs}=await db.query("SELECT DISTINCT ON (indicator) indicator,value,unit,period,source_id FROM iq_obs ORDER BY indicator,period DESC");
     const ev=[...items.map((r,i)=>`[${i+1}] ${r.title} — ${r.publisher}, ${r.published_at?new Date(r.published_at).toISOString().slice(0,10):"?"}`),"INDICATORS:",...obs.map(o=>`${o.indicator}: ${Number(o.value)} ${o.unit} (${o.period}, ${o.source_id})`)].join("\n");
     const res=await generateJSON(P.BRIEFING.task,P.BRIEFING.shape,ev);row=await saveAnalysis("briefing","Executive briefing "+new Date().toISOString().slice(0,10),{refs:items.map(r=>({title:r.title,url:r.url,publisher:r.publisher}))},res);}
    else if(a.kind==="news"){const {rows}=await db.query("SELECT * FROM iq_items WHERE id=$1",[a.itemId]);const it=rows[0];if(!it)return jsonError(404,"Article not found");
     const text=await articleText(it.url);const res=await generateJSON<{summary?:string;impact?:string;category?:string;facts?:string[];confidence?:string}>(P.NEWS_ANALYSIS.task+(text?"":" NOTE: the article text could not be fetched; work from the headline only and set confidence low."),P.NEWS_ANALYSIS.shape,`HEADLINE: ${it.title}\nPUBLISHER: ${it.publisher}\nURL: ${it.url}\nTEXT: ${text}`);
     const d=res.data;await db.query("UPDATE iq_items SET summary=$2,impact=$3,category=coalesce($4,category),facts=$5,confidence=$6 WHERE id=$1",[it.id,(d.summary??"").slice(0,1200),["positive","negative","neutral","monitor"].includes(d.impact??"")?d.impact:null,d.category??null,JSON.stringify((d.facts??[]).slice(0,8)),d.confidence??null]);
     row=await saveAnalysis("news",it.title,{itemId:it.id,textFetched:!!text},res);}
    else if(a.kind==="suggest"){const i=a.input;const res=await generateJSON(P.SUGGEST.task+"\n\nINPUTS:\n"+Object.entries(i).filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join("\n"),P.SUGGEST.shape,await evidence(`${i.sector} ${i.context??""}`));row=await saveAnalysis("suggest",String((res.data as {title?:string}).title??i.sector),i,res);}
    else if(a.kind==="cluster"){const res=await generateJSON(P.CLUSTER.task+"\n\nSECTOR: "+a.sector,P.CLUSTER.shape,await evidence(a.sector));row=await saveAnalysis("cluster",a.sector,{sector:a.sector},res);}
    else if(a.kind==="compliance"){const res=await generateJSON(P.COMPLIANCE.task+"\n\nACTIVITY: "+a.activity,P.COMPLIANCE.shape,"");row=await saveAnalysis("compliance",a.activity,{activity:a.activity},res);}
    else {const obs=await tradeFor(a.commodity);const res=await generateJSON(P.TRADE.task+"\n\nCOMMODITY: "+a.commodity,P.TRADE.shape,obs.map(o=>`${o.partner}: ${o.value} US$ (${o.period}), ${o.qty??"?"} kg`).join("\n"));row=await saveAnalysis("trade",a.commodity,{commodity:a.commodity},res);}
    await writeAudit({action:`iq.analyze.${a.kind}`,outcome:"succeeded",details:{id:row.id}});
    return ok({analysis:row});
   }
   case "trade":{const p=z.object({commodity:z.string().trim().max(40),refresh:z.boolean().optional()}).parse(raw);return ok({rows:await tradeFor(p.commodity,!!p.refresh)});}
   case "projects":{const p=bodies.projects.safeParse(raw);if(!p.success)return jsonError(400,"Check the project fields.");const d=p.data;
    const cols=["name","description","sector","geography","status","investment","target_date","expected_outcome","notes","milestones","analysis_ids","item_ids","archived"] as const;
    const vals=cols.map(c=>c==="milestones"?(d.milestones?JSON.stringify(d.milestones):undefined):d[c]);
    if(d.id){const sets:string[]=[];const args:unknown[]=[d.id];cols.forEach((c,i)=>{if(vals[i]!==undefined){args.push(vals[i]);sets.push(`${c}=$${args.length}`);}});
     args.push(JSON.stringify({at:new Date().toISOString(),change:Object.keys(d).filter(k=>k!=="id").join(", ")}));
     const {rows}=await db.query(`UPDATE iq_projects SET ${sets.join(",")},history=(jsonb_build_array($${args.length}::jsonb)||history),updated_at=now() WHERE id=$1 RETURNING *`,args);return ok({project:rows[0]});}
    const {rows}=await db.query("INSERT INTO iq_projects (name,description,sector,geography,status,investment,target_date,expected_outcome,notes,milestones,analysis_ids,item_ids) VALUES ($1,$2,$3,$4,coalesce($5,'idea'),$6,$7,$8,$9,coalesce($10::jsonb,'[]'),coalesce($11::uuid[],'{}'),coalesce($12::uuid[],'{}')) RETURNING *",vals.slice(0,12));
    await writeAudit({action:"iq.project.create",outcome:"succeeded",details:{id:rows[0].id}});return ok({project:rows[0]});}
   case "saved":{const p=bodies.saved.safeParse(raw);if(!p.success)return jsonError(400,"Invalid item");const d=p.data;
    const {rows}=await db.query("INSERT INTO iq_saved (kind,ref_id,title,url,notes,tags) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (kind,ref_id) DO UPDATE SET archived=false,notes=coalesce(EXCLUDED.notes,iq_saved.notes) RETURNING *",[d.kind,d.refId??crypto.randomUUID(),d.title,d.url??null,d.notes??null,d.tags??[]]);return ok({saved:rows[0]});}
   case "watch":{const p=bodies.watch.safeParse(raw);if(!p.success)return jsonError(400,"Keyword must be 2–60 characters.");const d=p.data;
    const {rows}=await db.query("INSERT INTO iq_watch (keyword,category,frequency,priority) VALUES ($1,$2,$3,$4) RETURNING *",[d.keyword,d.category,d.frequency,d.priority]);return ok({watch:rows[0]});}
   case "locations":{const p=bodies.locations.safeParse(raw);if(!p.success)return jsonError(400,"Check name, category and coordinates (must be inside Angola).");const d=p.data;
    const {rows}=await db.query("INSERT INTO iq_locations (name,category,province,lat,lng,source,source_url,verified,notes) VALUES ($1,$2,$3,$4,$5,'manual',$6,false,$7) RETURNING *",[d.name,d.category,d.province??null,d.lat,d.lng,d.source_url??null,d.notes??null]);return ok({location:rows[0]});}
   case "osm":{const p=bodies.osm.parse(raw);return ok({added:await osmImport(p.category)});}
   default:return jsonError(404,"Unknown resource");
  }
 }catch(e){return fail(e);}
}

/* ---------- PATCH / DELETE ---------- */
const TABLE:Record<string,{t:string;cols:string[]}>={items:{t:"iq_items",cols:["reviewed","notes","impact","category"]},saved:{t:"iq_saved",cols:["notes","tags","archived"]},watch:{t:"iq_watch",cols:["active","frequency","priority"]},locations:{t:"iq_locations",cols:["name","category","province","notes","verified"]}};
export async function PATCH(req:Request,{params}:Ctx){
 const g=await guard(req,true);if(g)return g;
 const {resource}=await params;const spec=TABLE[resource];if(!spec)return jsonError(404,"Unknown resource");
 const raw=await req.json().catch(()=>null) as Record<string,unknown>|null;
 if(!raw||!uuid.safeParse(raw.id).success)return jsonError(400,"Invalid id");
 const sets:string[]=[];const args:unknown[]=[raw.id];
 for(const c of spec.cols)if(c in raw){const v=raw[c];if(v!==null&&!["string","boolean"].includes(typeof v)&&!Array.isArray(v))continue;if(typeof v==="string"&&v.length>2000)continue;args.push(v);sets.push(`${c}=$${args.length}`);}
 if(!sets.length)return jsonError(400,"Nothing to update");
 try{const db=await iqDb();const {rows}=await db.query(`UPDATE ${spec.t} SET ${sets.join(",")} WHERE id=$1 RETURNING *`,args);return ok({row:rows[0]??null});}catch(e){return fail(e);}
}
export async function DELETE(req:Request,{params}:Ctx){
 const g=await guard(req,true);if(g)return g;
 const {resource}=await params;const id=new URL(req.url).searchParams.get("id")??"";
 const t={saved:"iq_saved",watch:"iq_watch",locations:"iq_locations",analyses:"iq_analyses"}[resource];
 if(!t||!uuid.safeParse(id).success)return jsonError(400,"Invalid request");
 try{const db=await iqDb();await db.query(`DELETE FROM ${t} WHERE id=$1`,[id]);await writeAudit({action:`iq.delete.${resource}`,outcome:"succeeded",details:{id}});return ok({ok:true});}catch(e){return fail(e);}
}
