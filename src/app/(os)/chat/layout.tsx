import type { ReactNode } from "react";
import { requireOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Q Assistant" };

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireOwner();
  return children;
}
