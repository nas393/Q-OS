import type {ReactNode} from "react";
import {requireOwner} from "@/lib/auth";
import {Shell} from "@/design/shell";

export const dynamic="force-dynamic";

/* Every part of Q OS sits behind the owner session. The sign-in page is outside this group. */
export default async function AppLayout({children}:{children:ReactNode}){
  await requireOwner();
  return <Shell>{children}</Shell>;
}
