"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Cancelamento {
  id: string;
  motivo: string;
  criadoEm: string;
  solicitacao: {
    id: string;
    descricao: string;
    cliente: { nome: string; email: string };
    autonomo: { nome: string; email: string } | null;
    orcamentos: { valor: string }[];
  };
}

function tempoDecorrido(data: string) {
  const horas = Math.max(1, Math.round((Date.now() - new Date(data).getTime()) / 3_600_000));
  if (horas < 24) return `${horas}h atrás`;
  return `${Math.round(horas / 24)}d atrás`;
}

export default function DisputesPage() {
  const [casos, setCasos] = useState<Cancelamento[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  function carregar() {
    apiFetch<Cancelamento[]>("/admin/cancelamentos?status=pendente_analise")
      .then(setCasos)
      .catch((e) => setErro(e.message));
  }

  useEffect(carregar, []);

  async function resolver(id: string, aprovar: boolean) {
    await apiFetch(`/admin/cancelamentos/${id}/resolver`, {
      method: "POST",
      body: JSON.stringify({ aprovar }),
    });
    carregar();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Cancelamentos e Disputas</h1>
      <p className="mt-1 text-sm text-black/50">Revise e resolva disputas ativas de serviço.</p>

      {erro && <p className="mt-4 text-sm text-red-600">{erro}</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {casos.map((caso) => {
          const valor = caso.solicitacao.orcamentos[0]?.valor;
          return (
            <div key={caso.id} className="rounded-2xl border-l-4 border-tertiary bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-tertiary-light px-2.5 py-1 text-xs font-semibold text-tertiary">
                  Disputa
                </span>
                <div className="text-right text-xs text-black/40">
                  <p>Aberta {tempoDecorrido(caso.criadoEm)}</p>
                  {valor && <p>Valor: R$ {Number(valor).toFixed(2)}</p>}
                </div>
              </div>

              <p className="mt-3 font-semibold text-ink">{caso.solicitacao.descricao}</p>

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-black/50">
                <div>
                  <p className="uppercase tracking-wide text-black/30">Cliente</p>
                  <p className="font-medium text-ink">{caso.solicitacao.cliente.nome}</p>
                </div>
                {caso.solicitacao.autonomo && (
                  <div>
                    <p className="uppercase tracking-wide text-black/30">Prestador</p>
                    <p className="font-medium text-ink">{caso.solicitacao.autonomo.nome}</p>
                  </div>
                )}
              </div>

              <p className="mt-3 text-sm text-black/70">
                <span className="font-medium">Motivo: </span>
                {caso.motivo}
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => resolver(caso.id, false)}
                  className="flex-1 rounded-xl border border-black/10 py-2 text-sm font-semibold text-black/60 hover:bg-black/5"
                >
                  Rejeitar
                </button>
                <button
                  onClick={() => resolver(caso.id, true)}
                  className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Resolver
                </button>
              </div>
            </div>
          );
        })}

        {casos.length === 0 && !erro && (
          <p className="text-sm text-black/40">Nenhuma disputa pendente.</p>
        )}
      </div>
    </div>
  );
}
