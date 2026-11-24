import {requireOwner} from "@/lib/auth";
import {QWorldEntry} from "./entry";

export const dynamic="force-dynamic";
export const metadata={title:"Q WORLD"};

export default async function QWorldPage(){
 await requireOwner();
 return <QWorldEntry/>;
}
