import {redirect} from "next/navigation";

/* Old link: the dashboard is now Command. Alerts and notifications still point here. */
export default function DashboardRedirect(){redirect("/");}
