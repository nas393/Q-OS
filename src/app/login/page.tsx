import {redirect} from "next/navigation";
import {readSession} from "@/lib/session";
import CleanLoginForm from "@/components/clean-login-form";
export const dynamic="force-dynamic";
type Props={searchParams:Promise<{error?:string|string[]}>};
export default async function LoginPage({searchParams}:Props){const session=await readSession();if(session)redirect("/dashboard");const params=await searchParams;const raw=Array.isArray(params.error)?params.error[0]:params.error;const initialError=typeof raw==="string"?raw.slice(0,180):"";return <CleanLoginForm initialError={initialError}/>;}
