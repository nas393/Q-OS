import type {ReactNode} from "react";

/* The standard sub-app page: one header pattern (title, one-line purpose, meta, actions on the right) for every section. */
export function PageHeader({title,desc,meta,actions}:{title:string;desc?:ReactNode;meta?:ReactNode;actions?:ReactNode}){
  return <header className="ph">
    <div className="ph-t"><h1>{title}</h1>{desc&&<p>{desc}</p>}{meta&&<div className="ph-meta">{meta}</div>}</div>
    {actions&&<div className="ph-acts">{actions}</div>}
  </header>;
}

/* Empty / error / loading states with a clear next step. */
export function State({kind="empty",title,children,action}:{kind?:"empty"|"error"|"loading";title?:string;children?:ReactNode;action?:ReactNode}){
  return <div className={`state${kind==="error"?" err":""}`} role={kind==="error"?"alert":kind==="loading"?"status":undefined}>
    {kind==="loading"&&<span className="spin" aria-hidden="true"/>}
    {title&&<b>{title}</b>}{children&&<span>{children}</span>}{action}
  </div>;
}
