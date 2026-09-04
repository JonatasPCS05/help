import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiFetch, clearToken, getToken, setToken } from "@/lib/api";

interface PerfilAutonomo {
  online: boolean;
  categorias: { categoria: { id: string; nome: string } }[];
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  fotoUrl: string | null;
  isCliente: boolean;
  isAutonomo: boolean;
  avaliacaoMediaCliente: number;
  avaliacaoMediaAutonomo: number;
  perfilAutonomo?: PerfilAutonomo | null;
}

interface DadosRegistro {
  nome: string;
  email: string;
  senha: string;
  cpf: string;
  telefone?: string;
}

interface AuthContextValue {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  registrar: (dados: DadosRegistro) => Promise<void>;
  entrarComGoogle: (idToken: string, cpf?: string) => Promise<void>;
  recarregarUsuario: () => Promise<void>;
  sair: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        try {
          const me = await apiFetch<Usuario>("/usuarios/me");
          setUsuario(me);
        } catch {
          await clearToken();
        }
      }
      setCarregando(false);
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario,
      carregando,
      async entrar(email: string, senha: string) {
        const resultado = await apiFetch<{ token: string; usuario: Usuario }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, senha }),
        });
        await setToken(resultado.token);
        setUsuario(resultado.usuario);
      },
      async registrar(dados: DadosRegistro) {
        const resultado = await apiFetch<{ token: string; usuario: Usuario }>("/auth/registro", {
          method: "POST",
          body: JSON.stringify(dados),
        });
        await setToken(resultado.token);
        setUsuario(resultado.usuario);
      },
      async entrarComGoogle(idToken: string, cpf?: string) {
        const resultado = await apiFetch<{ token: string; usuario: Usuario }>("/auth/google", {
          method: "POST",
          body: JSON.stringify({ idToken, cpf }),
        });
        await setToken(resultado.token);
        setUsuario(resultado.usuario);
      },
      async recarregarUsuario() {
        const me = await apiFetch<Usuario>("/usuarios/me");
        setUsuario(me);
      },
      async sair() {
        await clearToken();
        setUsuario(null);
      },
    }),
    [usuario, carregando]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
