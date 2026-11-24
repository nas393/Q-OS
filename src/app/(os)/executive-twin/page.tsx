import ChatWorkspace from "../chat/workspace";import ExecutiveMemoryPanel from "./memory-panel";
export const dynamic="force-dynamic";export const metadata={title:"Executive Twin · Q OS"};
export default function ExecutiveTwinPage(){return <><ExecutiveMemoryPanel/><ChatWorkspace gold={null} workspace="executive_twin"/></>;}
