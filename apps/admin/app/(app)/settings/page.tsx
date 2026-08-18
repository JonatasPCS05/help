"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Me {
  nome: string;
  email: string;
}

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    apiFetch<Me>("/usuarios/me").then(setMe).catch(() => setMe(null));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Configurações</h1>
      <p className="mt-1 text-sm text-black/50">Dados da conta administrativa.</p>

      <div className="mt-6 max-w-md rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-black/40">Nome</p>
        <p className="mt-1 font-medium text-ink">{me?.nome ?? "—"}</p>

        <p className="mt-4 text-xs uppercase tracking-wide text-black/40">E-mail</p>
        <p className="mt-1 font-medium text-ink">{me?.email ?? "—"}</p>
      </div>
    </div>
  );
}
