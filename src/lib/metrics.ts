import {z} from "zod";
import {getDb} from "@/lib/db";

/*
 * Command Center metrics are PUSHED by Nassim's other projects through POST /api/ingest.
 * Q never invents business numbers: a panel with no pushed data renders an empty state.
 */

const text=z.string().trim().min(1).max(120);
const pct=z.number().min(0).max(100);
const trend=z.enum(["up","down","flat"]).optional();

export const metricSchemas={
  kpis:z.array(z.object({label:text,value:z.string().trim().min(1).max(24),delta:z.string().max(40).optional(),trend,progress:pct.optional()})).max(5),
  revenueTrend:z.object({total:z.string().max(24),delta:z.string().max(40).optional(),trend,points:z.array(z.object({label:z.string().max(8),value:z.number().min(0)})).min(1).max(12)}),
  channelMix:z.object({total:z.string().max(24),items:z.array(z.object({label:text,pct})).min(1).max(5)}),
  factory:z.object({overall:pct,items:z.array(z.object({label:text,pct})).min(1).max(6)}),
  insights:z.array(z.object({title:text,detail:z.string().max(120).optional(),trend})).max(4),
  alerts:z.array(z.object({title:text,level:z.enum(["red","amber"]),href:z.string().url().optional()})).max(6),
  agenda:z.array(z.object({time:z.string().regex(/^\d{2}:\d{2}$/),title:text})).max(8),
  xauusd:z.object({price:z.number().positive(),changePct:z.number().min(-100).max(100),series:z.array(z.number().positive()).min(2).max(120),timeframe:z.string().max(8).optional()})
} as const;

export type MetricKey=keyof typeof metricSchemas;
export const metricKeys=Object.keys(metricSchemas) as MetricKey[];
export type MetricValue<K extends MetricKey>=z.infer<(typeof metricSchemas)[K]>;
export type MetricEntry<K extends MetricKey=MetricKey>={value:MetricValue<K>;source:string;updatedAt:string};
export type MetricsMap={[K in MetricKey]?:MetricEntry<K>};

export const ingestSchema=z.object({
  source:z.string().trim().regex(/^[a-z0-9][a-z0-9._-]{1,48}$/,"source must be a lowercase slug"),
  metrics:z.object(Object.fromEntries(metricKeys.map(k=>[k,metricSchemas[k].optional()])) as {[K in MetricKey]:z.ZodOptional<(typeof metricSchemas)[K]>})
}).refine(b=>metricKeys.some(k=>b.metrics[k]!==undefined),{message:"metrics must contain at least one known key"});

let ensured=false;
async function ensureTable(){
  if(ensured)return;
  await getDb().query(`CREATE TABLE IF NOT EXISTS command_metrics (
    metric_key text PRIMARY KEY,
    payload jsonb NOT NULL,
    source text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  ensured=true;
}

export async function saveMetrics(source:string,metrics:Partial<Record<MetricKey,unknown>>){
  await ensureTable();
  const keys=metricKeys.filter(k=>metrics[k]!==undefined);
  for(const k of keys){
    await getDb().query("INSERT INTO command_metrics (metric_key,payload,source,updated_at) VALUES ($1,$2::jsonb,$3,now()) ON CONFLICT (metric_key) DO UPDATE SET payload=EXCLUDED.payload,source=EXCLUDED.source,updated_at=now()",[k,JSON.stringify(metrics[k]),source]);
  }
  return keys;
}

export async function loadMetrics():Promise<{metrics:MetricsMap;error:string|null}>{
  try{
    await ensureTable();
    const {rows}=await getDb().query("SELECT metric_key,payload,source,updated_at FROM command_metrics");
    const metrics:MetricsMap={};
    for(const r of rows){
      const key=r.metric_key as MetricKey;
      if(!metricKeys.includes(key))continue;
      const parsed=metricSchemas[key].safeParse(r.payload);
      if(!parsed.success)continue;
      (metrics as Record<string,MetricEntry>)[key]={value:parsed.data,source:String(r.source),updatedAt:new Date(r.updated_at).toISOString()};
    }
    return {metrics,error:null};
  }catch(e){
    console.error("metrics_load_failed",{error:e instanceof Error?e.name:"unknown"});
    return {metrics:{},error:"Business metrics store unavailable"};
  }
}
