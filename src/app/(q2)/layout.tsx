import type {ReactNode} from "react";
import {requireOwner} from "@/lib/auth";
import {Q2Shell} from "@/components/q2/shell";

export const dynamic="force-dynamic";

/* The v2 route group: the new shell. Routes move here one at a time (docs/redesign-plan.md). */
export default async function Q2Layout({children}:{children:ReactNode}){
  await requireOwner();
  return <Q2Shell>{children}</Q2Shell>;
}
