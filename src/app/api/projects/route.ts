import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { PORTFOLIO_PROJECTS as projects } from "@/lib/portfolio/registry";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TEAM_ID = "team_sWS7qi1gaGUI9lifKbbjERXj";
type ApiResult<T> = { data:T; error?:never; status:"VERIFIED" } | { data:null; error:string; status:"FETCH_ERROR"|"AUTH_REQUIRED"|"NOT_CONFIGURED"|"NOT_LINKED" };


async function github<T>(path:string, token?:string):Promise<ApiResult<T>> {
  try {
    const headers:Record<string,string>={Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
    if(token)headers.Authorization=`Bearer ${token}`;
    const response=await fetch(`https://api.github.com/${path}`,{headers,cache:"no-store"});
    if(response.status===404&&!token)return {data:null,error:"Private repository or resource not visible without a GitHub token",status:"AUTH_REQUIRED"};
    if(!response.ok)return {data:null,error:`GitHub API returned ${response.status}`,status:response.status===401||response.status===403?"AUTH_REQUIRED":"FETCH_ERROR"};
    return {data:await response.json() as T,status:"VERIFIED"};
  } catch(error) {
    return {data:null,error:error instanceof Error?error.message:"GitHub request failed",status:"FETCH_ERROR"};
  }
}
async function vercel(projectId:string, token?:string):Promise<ApiResult<{deployments?:Array<{state?:string;url?:string;created?:number;target?:string|null;inspectorUrl?:string;meta?:Record<string,string>}>}>> {
  if(!token)return {data:null,error:"VERCEL_TOKEN is not configured for this Preview environment",status:"NOT_CONFIGURED"};
  try {
    const url=new URL("https://api.vercel.com/v6/deployments");
    url.searchParams.set("projectId",projectId);
    url.searchParams.set("limit","1");
    url.searchParams.set("target","production"); // live status = production; preview failures go through the build-alert digest
    url.searchParams.set("teamId",TEAM_ID);
    const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
    if(!response.ok) {
      const body=(await response.text()).replace(/\s+/g," ").slice(0,240);
      const status=response.status===401||response.status===403?"AUTH_REQUIRED":"FETCH_ERROR";
      return {data:null,error:`Vercel API returned ${response.status}: ${body||"No error details returned"}`,status};
    }
    return {data:await response.json(),status:"VERIFIED"};
  } catch(error) {
    return {data:null,error:error instanceof Error?error.message:"Vercel request failed",status:"FETCH_ERROR"};
  }
}

/* For apps outside Vercel: a live HTTP check stands in for the deployment state. */
async function liveCheck(url:string):Promise<ApiResult<{deployments?:Array<{state?:string;url?:string;created?:number;target?:string|null;inspectorUrl?:string;meta?:Record<string,string>}>}>>{
  try{const r=await fetch(url,{cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(8000)});
    return {data:{deployments:[{state:r.status<500?"READY":"ERROR",url:url.replace(/^https:\/\//,""),created:Date.now(),target:"external"}]},status:"VERIFIED"};}
  catch{return {data:{deployments:[{state:"ERROR",url:url.replace(/^https:\/\//,""),created:Date.now(),target:"external"}]},status:"VERIFIED"};}
}
/* "Merge pull request #4 from x/y" says nothing: use the PR title (third line) instead. */
function commitTitle(m?:string){const lines=(m??"").split("\n").map(l=>l.trim()).filter(Boolean);const pr=/^Merge pull request #(\d+)/.exec(lines[0]??"");return pr&&lines[1]?`${lines[1]} (#${pr[1]})`:lines[0];}
export async function GET() {
  if(!await readSession())return NextResponse.json({error:"Unauthorized"},{status:401,headers:{"Cache-Control":"no-store"}});
  const ghToken=process.env.GITHUB_TOKEN;
  const vToken=process.env.VERCEL_TOKEN;
  const data=await Promise.all(projects.map(async project=>{
    const canReadRepo=!!project.repo&&(!!ghToken||project.repoVisibility==="public");
    const [issues,commits,deployment]=await Promise.all([
      !project.repo?Promise.resolve({data:null,error:"No repository mapped",status:"NOT_LINKED"} as const):
      !canReadRepo?Promise.resolve({data:null,error:"Private repository requires GITHUB_TOKEN in this Preview environment",status:"AUTH_REQUIRED"} as const):
      github<Array<{pull_request?:unknown}>>(`repos/nas393/${project.repo}/issues?state=open&per_page=100`,ghToken),
      !project.repo?Promise.resolve({data:null,error:"No repository mapped",status:"NOT_LINKED"} as const):
      !canReadRepo?Promise.resolve({data:null,error:"Private repository requires GITHUB_TOKEN in this Preview environment",status:"AUTH_REQUIRED"} as const):
      github<Array<{commit?:{message?:string;author?:{date?:string}};html_url?:string}>>(`repos/nas393/${project.repo}/commits?per_page=1`,ghToken),
      project.vercel?vercel(project.vercel,vToken):
      "url" in project&&project.url?liveCheck(project.url):Promise.resolve({data:null,error:"No Vercel project mapped",status:"NOT_LINKED"} as const)
    ]);
    const latest=deployment.data?.deployments?.[0]??null;
    const sourceRepo=latest?.meta?.githubRepo??null;
    const sourceMatches=sourceRepo?sourceRepo.toLowerCase()===project.repo?.toLowerCase():null;
    return {
      ...project,
      openIssues:issues.data?issues.data.filter(item=>!item.pull_request).length:null,
      issuesError:issues.error??null,
      issuesDataStatus:issues.status,
      lastCommit:commits.data?.[0]?{message:commitTitle(commits.data[0].commit?.message),date:commits.data[0].commit?.author?.date,url:commits.data[0].html_url}:null,
      commitError:commits.error??null,
      commitDataStatus:commits.status,
      deployment:latest?{state:latest.state??"UNKNOWN",url:latest.url?`https://${latest.url}`:null,created:latest.created??null,target:latest.target??null,inspectorUrl:latest.inspectorUrl??null,sourceRepo,sourceMatches}:null,
      deploymentError:deployment.error??null,
      deploymentDataStatus:deployment.status,
      integration:{github:issues.status==="VERIFIED"&&commits.status==="VERIFIED",vercel:deployment.status==="VERIFIED"},
      githubDataStatus:issues.status==="VERIFIED"&&commits.status==="VERIFIED"?"VERIFIED":issues.status==="AUTH_REQUIRED"||commits.status==="AUTH_REQUIRED"?"AUTH_REQUIRED":issues.status,
      vercelDataStatus:deployment.status
    };
  }));
  const githubVerified=data.some(project=>project.githubDataStatus==="VERIFIED");
  return NextResponse.json({
    updatedAt:new Date().toISOString(),
    integrations:{github:githubVerified,githubTokenConfigured:!!ghToken,vercel:!!vToken},
    projects:data
  },{headers:{"Cache-Control":"no-store, max-age=0"}});
}
