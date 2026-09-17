"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Categoria {
  id: string;
  nome: string;
  ativo: boolean;
}

interface SolicitacaoPendente {
  id: string;
  descricao: string;
  criadoEm: string;
  categoria: { nome: string };
  endereco: { bairro: string; cidade: string; estado: string };
  cliente: { nome: string; email: string };
}

export default function RevisaoPedidosPage() {
  const [pendentes, setPendentes] = useState<SolicitacaoPendente[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selecoes, setSelecoes] = useState<Record<string, string>>({});
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function carregar() {
    apiFetch<SolicitacaoPendente[]>("/admin/solicitacoes-pendentes-revisao")
      .then(setPendentes)
      .catch((e) => setErro(e instanceof Error ? e.message : "Não foi possível carregar"));
    apiFetch<Categoria[]>("/admin/categorias")
      .then((lista) => setCategorias(lista.filter((c) => c.nome !== "Outro Serviço" && c.ativo)))
      .catch(() => {});
  }

  useEffect(carregar, []);

  async function aprovar(id: string) {
    setErro(null);
    setProcessandoId(id);
    try {
      const categoriaId = selecoes[id];
      await apiFetch(`/admin/solicitacoes/${id}/revisar`, {
        method: "POST",
        body: JSON.stringify(categoriaId ? { categoriaId } : {}),
      });
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível revisar o pedido");
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Revisão de Pedidos</h1>
          <p className="mt-1 text-sm text-black/50">
            Pedidos na categoria &quot;Outro Serviço&quot; ficam invisíveis pros autônomos até você aprovar ou reclassificar aqui.
          </p>
        </div>
        <span className="rounded-full bg-secondary-light px-3 py-1 text-xs font-semibold text-secondary">
          {pendentes.length} pendentes
        </span>
      </div>

      {erro && <p className="mt-4 text-sm text-red-600">{erro}</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pendentes.map((p) => (
          <div key={p.id} className="rounded-2xl border-l-4 border-secondary bg-white p-5 shadow-sm">
            <p className="font-semibold text-ink">{p.cliente.nome}</p>
            <p className="text-xs text-black/40">{p.cliente.email}</p>

            <p className="mt-3 text-sm text-ink">{p.descricao}</p>
            <p className="mt-1 text-xs text-black/50">
              {p.endereco.bairro} · {p.endereco.cidade}/{p.endereco.estado}
            </p>
            <p className="mt-1 text-xs text-black/40">Enviado em {new Date(p.criadoEm).toLocaleDateString("pt-BR")}</p>

            <label className="mt-4 block text-xs font-semibold text-black/60">Reclassificar (opcional)</label>
            <select
              value={selecoes[p.id] ?? ""}
              onChange={(e) => setSelecoes((atual) => ({ ...atual, [p.id]: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Manter como Outro Serviço</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>

            <button
              onClick={() => aprovar(p.id)}
              disabled={processandoId === p.id}
              className="mt-3 w-full rounded-xl bg-primary py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {processandoId === p.id ? "Aprovando..." : "Aprovar e liberar"}
            </button>
          </div>
        ))}

        {pendentes.length === 0 && !erro && <p className="text-sm text-black/40">Nenhum pedido pendente de revisão.</p>}
      </div>
    </div>
  );
}
