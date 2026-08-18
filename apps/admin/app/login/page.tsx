"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError } from "@/lib/api";
import { setToken } from "@/lib/auth";

interface LoginResponse {
  token: string;
  usuario: { isAdmin: boolean };
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const resultado = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, senha }),
      });

      if (!resultado.usuario.isAdmin) {
        setErro("Esta conta não possui acesso administrativo.");
        return;
      }

      setToken(resultado.token);
      router.push("/");
    } catch (error) {
      setErro(error instanceof ApiClientError ? error.message : "Erro ao entrar");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl text-white">
            H
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-primary">Help — Admin</h1>
            <p className="text-sm text-black/50">Acesse o painel administrativo</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-black/60">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-black/60">Senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="mt-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
