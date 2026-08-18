"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { getToken } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setPronto(true);
  }, [router]);

  if (!pronto) return null;

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
