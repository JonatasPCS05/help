"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  isCliente: boolean;
  isAutonomo: boolean;
  ativo: boolean;
  criadoEm: string;
}

export default function UsersPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const params = busca ? `?busca=${encodeURIComponent(busca)}` : "";
    apiFetch<Usuario[]>(`/admin/usuarios${params}`)
      .then(setUsuarios)
      .catch((e) => setErro(e.message));
  }, [busca]);

  async function alternarAtivo(usuario: Usuario) {
    const atualizado = await apiFetch<Usuario>(`/admin/usuarios/${usuario.id}`, {
      method: "PATCH",
      body: JSON.stringify({ ativo: !usuario.ativo }),
    });
    setUsuarios((atual) => atual.map((u) => (u.id === atualizado.id ? atualizado : u)));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Gestão de Usuários</h1>
          <p className="mt-1 text-sm text-black/50">Visualize e gerencie clientes e autônomos.</p>
        </div>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="w-64 rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      {erro && <p className="mt-4 text-sm text-red-600">{erro}</p>}

      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/5 text-xs uppercase tracking-wide text-black/40">
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Cadastro</th>
              <th className="px-5 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="border-b border-black/5 last:border-0">
                <td className="px-5 py-3">
                  <p className="font-medium text-ink">{usuario.nome}</p>
                  <p className="text-xs text-black/40">{usuario.email}</p>
                </td>
                <td className="px-5 py-3">
                  <span className="rounded-full bg-tertiary-light px-2.5 py-1 text-xs font-medium text-tertiary">
                    {usuario.isAutonomo ? "Autônomo" : "Cliente"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      usuario.ativo ? "bg-primary-light text-primary" : "bg-black/5 text-black/50"
                    }`}
                  >
                    {usuario.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-5 py-3 text-black/60">
                  {new Date(usuario.criadoEm).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => alternarAtivo(usuario)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {usuario.ativo ? "Desativar" : "Ativar"}
                  </button>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && !erro && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-black/40">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
