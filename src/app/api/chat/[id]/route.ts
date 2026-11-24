import {NextResponse} from "next/server";
import {getDb} from "@/lib/db";
import {readSession} from "@/lib/session";
import {jsonError} from "@/lib/http";
import {ensureSchema} from "@/lib/schema";
import {parseChatWorkspace} from "@/lib/chat-workspace";
export const runtime="nodejs",dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const session=await readSession();
 if(!session)return jsonError(401,"Unauthorized");
 const {id}=await params;
 const workspace=parseChatWorkspace(new URL(request.url).searchParams.get("workspace"));
 try{
  await ensureSchema();
  const conversation=await getDb().query(
   "SELECT id,title,created_at,updated_at FROM conversations WHERE id=$1 AND user_id=$2 AND workspace=$3 AND status='active'",
   [id,session.id,workspace]
  );
  if(!conversation.rowCount)return jsonError(404,"Conversation not found.");
  const messages=await getDb().query(
   "SELECT id,role,content,created_at FROM messages WHERE conversation_id=$1 AND role IN ('user','assistant') ORDER BY created_at ASC",
   [id]
  );
  return NextResponse.json({conversation:conversation.rows[0],messages:messages.rows},{headers:{"Cache-Control":"no-store"}});
 }catch{return jsonError(503,"Conversation could not be loaded.");}
}
