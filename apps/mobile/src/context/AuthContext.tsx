import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiFetch, clearToken, getToken, setToken } from "@/lib/api";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  fotoUrl: string | null;
  isCliente: boolean;
  isAutonomo: boolean;
  avaliacaoMediaCliente: number;
  avaliacaoMediaAutonomo: number;
}

interface AuthContextValue {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
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
