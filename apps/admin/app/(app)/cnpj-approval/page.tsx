"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface SolicitacaoAutonomo {
  id: string;
  cnpj: string;
  documentoCnpjUrl: string;
  criadoEm: string;
  usuario: { nome: string; email: string; cpf: string };
}

function iniciais(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function CnpjApprovalPage() {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoAutonomo[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  function carregar() {
    apiFetch<SolicitacaoAutonomo[]>("/admin/solicitacoes-autonomo?status=pendente")
      .then(setSolicitacoes)
      .catch((e) => setErro(e.message));
  }

  useEffect(carregar, []);

  async function aprovar(id: string) {
    await apiFetch(`/admin/solicitacoes-autonomo/${id}/aprovar`, { method: "POST" });
    carregar();
  }

  async function rejeitar(id: string) {
    await apiFetch(`/admin/solicitacoes-autonomo/${id}/rejeitar`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    carregar();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Solicitações de Autônomo</h1>
          <p className="mt-1 text-sm text-black/50">
            Gerencie e valide os cadastros de CNPJ pendentes.
          </p>
        </div>
        <span className="rounded-full bg-secondary-light px-3 py-1 text-xs font-semibold text-secondary">
          {solicitacoes.length} Pendentes
        </span>
      </div>

      {erro && <p className="mt-4 text-sm text-red-600">{erro}</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {solicitacoes.map((s) => (
          <div key={s.id} className="rounded-2xl border-l-4 border-secondary bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-light text-sm font-bold text-secondary">
                {iniciais(s.usuario.nome)}
              </div>
              <div>
                <p className="font-semibold text-ink">{s.usuario.nome}</p>
                <p className="text-xs text-black/40">{s.usuario.email}</p>
              </div>
            </div>

            <div className="mt-4 text-xs text-black/50">
              <p>
                CNPJ <span className="font-medium text-ink">{s.cnpj}</span>
              </p>
              <p className="mt-1">
                Solicitado {new Date(s.criadoEm).toLocaleDateString("pt-BR")}
              </p>
            </div>

            <a
              href={s.documentoCnpjUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-xs font-semibold text-primary hover:underline"
            >
              Ver documento anexado
            </a>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => rejeitar(s.id)}
                className="flex-1 rounded-xl border border-black/10 py-2 text-sm font-semibold text-black/60 hover:bg-black/5"
              >
                Rejeitar
              </button>
              <button
                onClick={() => aprovar(s.id)}
                className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Aprovar
              </button>
            </div>
          </div>
        ))}

        {solicitacoes.length === 0 && !erro && (
          <p className="text-sm text-black/40">Nenhuma solicitação pendente.</p>
        )}
      </div>
    </div>
  );
}
