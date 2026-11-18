import { requireOwner } from "@/lib/auth";
import QNewsClient from "./q-news-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Q News · NASSIM OS" };

export default async function QNewsPage() {
  await requireOwner();
  return <QNewsClient />;
}
