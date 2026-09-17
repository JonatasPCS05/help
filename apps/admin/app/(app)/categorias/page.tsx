"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Categoria {
  id: string;
  nome: string;
  ativo: boolean;
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEditado, setNomeEditado] = useState("");
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  function carregar() {
    apiFetch<Categoria[]>("/admin/categorias")
      .then(setCategorias)
      .catch((e) => setErro(e instanceof Error ? e.message : "Não foi possível carregar as categorias"));
  }

  useEffect(carregar, []);

  async function criarCategoria() {
    if (novoNome.trim().length < 2) {
      setErro("Informe um nome com pelo menos 2 letras");
      return;
    }
    setErro(null);
    setCriando(true);
    try {
      await apiFetch("/admin/categorias", { method: "POST", body: JSON.stringify({ nome: novoNome.trim() }) });
      setNovoNome("");
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível criar a categoria");
    } finally {
      setCriando(false);
    }
  }

  async function alternarAtivo(categoria: Categoria) {
    setErro(null);
    setSalvandoId(categoria.id);
    try {
      await apiFetch(`/admin/categorias/${categoria.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: !categoria.ativo }),
      });
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível atualizar a categoria");
    } finally {
      setSalvandoId(null);
    }
  }

  function iniciarEdicao(categoria: Categoria) {
    setEditandoId(categoria.id);
    setNomeEditado(categoria.nome);
    setErro(null);
  }

  async function salvarNome(id: string) {
    if (nomeEditado.trim().length < 2) {
      setErro("Informe um nome com pelo menos 2 letras");
      return;
    }
    setErro(null);
    setSalvandoId(id);
    try {
      await apiFetch(`/admin/categorias/${id}`, { method: "PATCH", body: JSON.stringify({ nome: nomeEditado.trim() }) });
      setEditandoId(null);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível renomear a categoria");
    } finally {
      setSalvandoId(null);
    }
  }

  const ativas = categorias.filter((c) => c.ativo).length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Categorias de Serviço</h1>
          <p className="mt-1 text-sm text-black/50">Crie, renomeie e ative ou desative as categorias oferecidas na plataforma.</p>
        </div>
        <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">{ativas} ativas</span>
      </div>

      <div className="mt-6 flex gap-2 rounded-2xl bg-white p-4 shadow-sm">
        <input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && criarCategoria()}
          placeholder="Nome da nova categoria (ex: Eletricista)"
          className="flex-1 rounded-xl border border-black/10 px-4 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={criarCategoria}
          disabled={criando}
          className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {criando ? "Criando..." : "+ Adicionar"}
        </button>
      </div>

      {erro && <p className="mt-4 text-sm text-red-600">{erro}</p>}

      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
        {categorias.map((categoria, i) => (
          <div
            key={categoria.id}
            className={`flex items-center justify-between gap-4 px-5 py-4 ${i !== categorias.length - 1 ? "border-b border-black/5" : ""}`}
          >
            {editandoId === categoria.id ? (
              <input
                value={nomeEditado}
                onChange={(e) => setNomeEditado(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && salvarNome(categoria.id)}
                autoFocus
                className="flex-1 rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:border-primary"
              />
            ) : (
              <div className="flex items-center gap-3">
                <span className={`font-medium ${categoria.ativo ? "text-ink" : "text-black/40 line-through"}`}>{categoria.nome}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    categoria.ativo ? "bg-primary-light text-primary" : "bg-black/5 text-black/50"
                  }`}
                >
                  {categoria.ativo ? "Ativa" : "Desativada"}
                </span>
              </div>
            )}

            <div className="flex shrink-0 gap-2">
              {editandoId === categoria.id ? (
                <>
                  <button
                    onClick={() => setEditandoId(null)}
                    className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-black/60 hover:bg-black/5"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => salvarNome(categoria.id)}
                    disabled={salvandoId === categoria.id}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Salvar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => iniciarEdicao(categoria)}
                    className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-black/60 hover:bg-black/5"
                  >
                    Renomear
                  </button>
                  <button
                    onClick={() => alternarAtivo(categoria)}
                    disabled={salvandoId === categoria.id}
                    className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-black/60 hover:bg-black/5 disabled:opacity-50"
                  >
                    {categoria.ativo ? "Desativar" : "Ativar"}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {categorias.length === 0 && !erro && <p className="px-5 py-6 text-sm text-black/40">Nenhuma categoria cadastrada ainda.</p>}
      </div>
    </div>
  );
}
