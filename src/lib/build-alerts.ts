/*
 * Build-alert rule ("latest build failed only"). Pure functions, no I/O, so they can be unit-tested
 * with fixtures (tests/build-alerts.test.mjs). Imports here must stay relative-free so Node can load
 * this file directly with --experimental-strip-types.
 *
 * Rule:
 * - Production ERROR always alerts, immediately (urgent).
 * - Preview: for each project + branch, look only at the NEWEST deployment. If it is ERROR, raise a
 *   non-urgent alert (goes into the 07:00 UTC daily digest). A later READY (or any newer non-ERROR
 *   build) on the same branch clears it. CANCELED deployments are ignored.
 * - Dedupe key = deployment id: the caller never sends the same id twice.
 */

export type Deployment={
  uid:string;
  name:string;
  projectId?:string;
  state?:string;
  readyState?:string;  // single-deployment endpoint (/v13) reports the state here
  target?:string|null;
  createdAt?:number;
  created?:number;
  inspectorUrl?:string|null;
  meta?:{githubCommitRef?:string;githubCommitSha?:string;githubCommitMessage?:string};
};

export type BuildAlert={
  id:string;           // deployment id = dedupe key
  key:string;          // project + branch
  urgent:boolean;      // production ERROR
  project:string;
  branch:string;
  target:"production"|"preview";
  sha:string;          // short SHA (7)
  message:string;      // commit message, first line
  createdAt:number;
  inspectorUrl:string|null;
};

export type BuildEvaluation={
  alerts:BuildAlert[];       // failures that should be reported (deduped by the caller)
  clearedKeys:string[];      // project+branch keys whose newest build is no longer ERROR
};

const ts=(d:Deployment)=>d.createdAt??d.created??0;
const branchOf=(d:Deployment)=>d.meta?.githubCommitRef||"(no branch)";
export const branchKey=(d:Deployment)=>`${d.projectId??d.name}@${branchOf(d)}`;

export function toAlert(d:Deployment):BuildAlert{
  const production=d.target==="production";
  return {
    id:d.uid,
    key:branchKey(d),
    urgent:production,
    project:d.name,
    branch:branchOf(d),
    target:production?"production":"preview",
    sha:(d.meta?.githubCommitSha??"").slice(0,7),
    message:(d.meta?.githubCommitMessage??"").split("\n")[0].trim().slice(0,120),
    createdAt:ts(d),
    inspectorUrl:d.inspectorUrl?(d.inspectorUrl.startsWith("http")?d.inspectorUrl:`https://${d.inspectorUrl}`):null
  };
}

export function evaluateBuilds(deployments:Deployment[]):BuildEvaluation{
  const alerts:BuildAlert[]=[];
  const newest=new Map<string,Deployment>();
  for(const d of deployments){
    if(d.state==="CANCELED")continue;
    if(d.target==="production"&&d.state==="ERROR")alerts.push(toAlert(d)); // always, immediately
    const k=branchKey(d),cur=newest.get(k);
    if(!cur||ts(d)>ts(cur))newest.set(k,d);
  }
  const clearedKeys:string[]=[];
  for(const [k,d] of newest){
    if(d.state==="ERROR"){if(d.target!=="production")alerts.push(toAlert(d));}
    else clearedKeys.push(k);
  }
  alerts.sort((a,b)=>a.createdAt-b.createdAt);
  return {alerts,clearedKeys};
}

/* ---- Build log: first line at level error, as "file:line:col message rule". ---- */

export type BuildEvent={type?:string;text?:string;level?:string;payload?:{text?:string}};

const GENERIC=/BUILD_UTILS_SPAWN|Command ".*" exited with|^Error: Command failed/i;
const PATH_LINE=/^\s*(?:\/vercel\/path\d+\/|\.\/)?((?:[\w@.-]+\/)*[\w@.-]+\.(?:[cm]?[jt]sx?|css|json|mdx?))\s*$/;
const ESLINT_LINE=/^\s*(\d+):(\d+)\s+error\s+(.*?)\s{2,}([@\w/-]+)\s*$/;

const clean=(p:string)=>p.replace(/^\/vercel\/path\d+\//,"").replace(/^\.\//,"");

export function firstBuildError(events:BuildEvent[]):string|null{
  const lines=events.map(e=>({text:(e.text??e.payload?.text??"").replace(/\u001b\[[0-9;]*m/g,""),error:e.level==="error"}));
  let fallback:string|null=null;
  for(let i=0;i<lines.length;i++){
    const {text,error}=lines[i];
    if(!error||!text.trim())continue;
    if(GENERIC.test(text)){fallback??=text.trim();continue;}
    const m=ESLINT_LINE.exec(text);
    if(m){
      let file="";
      for(let j=i-1;j>=0;j--){const p=PATH_LINE.exec(lines[j].text);if(p){file=clean(p[1]);break;}if(!lines[j].text.trim())break;}
      return `${file?`${file}:`:""}${m[1]}:${m[2]} ${m[4]}: ${m[3]}`.slice(0,240);
    }
    return clean(text.trim()).slice(0,240); // tsc "src/x.ts(1,2): error TS…", Next "Type error: …", etc.
  }
  return fallback?fallback.slice(0,240):null;
}

/* ---- Message text ---- */

export function alertTitle(a:BuildAlert){
  return `${a.urgent?"🚨":"❌"} ${a.project} ${a.target} build failed`;
}
export function alertBody(a:BuildAlert,logLine:string|null){
  return [`${a.branch}${a.sha?` @ ${a.sha}`:""}${a.message?` · ${a.message}`:""}`,logLine??"",a.urgent?"Production is unchanged (previous build still live).":"Latest build on this branch."].filter(Boolean).join("\n");
}
export function digestLine(a:BuildAlert,logLine:string|null){
  return `❌ ${a.project}@${a.branch}${a.sha?` (${a.sha})`:""}${logLine?` · ${logLine}`:""}`;
}

/* ---- Resolving old alerts: a logged build failure is closed once a newer build on the same branch is READY. ---- */

/* Inspector URL (https://vercel.com/<team>/<project>/<id>) -> deployment id "dpl_<id>", or null. */
export function deploymentIdFromInspector(url:string):string|null{
  const m=/^https:\/\/vercel\.com\/[\w.-]+\/[\w.-]+\/([A-Za-z0-9]{16,40})\/?$/.exec(url.trim());
  return m?`dpl_${m[1]}`:null;
}

/* True when a READY deployment newer than the failed one exists on the same project + branch
   (for a production failure: a newer READY production deployment). */
export function isSuperseded(failed:Deployment,candidates:Deployment[]):boolean{
  // The caller scopes the query by project; ids are compared only when both are present (list items can omit
  // projectId, and the project name changed when q-jarvis became q-os).
  const prod=failed.target==="production",at=ts(failed);
  const sameProject=(d:Deployment)=>!d.projectId||!failed.projectId||d.projectId===failed.projectId;
  return candidates.some(d=>(d.state??d.readyState)==="READY"&&ts(d)>at&&sameProject(d)&&(prod?d.target==="production":branchOf(d)===branchOf(failed)));
}
