"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Resumo {
  totalUsuarios: number;
  solicitacoesAtivas: number;
  totalTransacoes: number;
  taxaTotalArrecadada: number;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-black/50">{label}</p>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Resumo>("/admin/resumo")
      .then(setResumo)
      .catch((e) => setErro(e.message));
  }, []);

  const moeda = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Visão Geral</h1>
      <p className="mt-1 text-sm text-black/50">Bem-vindo de volta, Administrador.</p>

      {erro && <p className="mt-4 text-sm text-red-600">{erro}</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Usuários" value={resumo ? String(resumo.totalUsuarios) : "—"} />
        <StatCard label="Solicitações Ativas" value={resumo ? String(resumo.solicitacoesAtivas) : "—"} />
        <StatCard label="Transações" value={resumo ? String(resumo.totalTransacoes) : "—"} />
        <StatCard
          label="Taxa Arrecadada"
          value={resumo ? moeda(resumo.taxaTotalArrecadada) : "—"}
        />
      </div>
    </div>
  );
}
