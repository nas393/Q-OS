import type {ReactNode} from "react";
import {requireOwner} from "@/lib/auth";
import {IqShell} from "./shell";
import "./iq.css";

export const dynamic="force-dynamic";
export const metadata={title:"AngolaIQ"};

export default async function IqLayout({children}:{children:ReactNode}){
 await requireOwner();
 return <IqShell>{children}</IqShell>;
}
