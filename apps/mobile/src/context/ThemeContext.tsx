import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { coresClaro, coresEscuro, type Colors } from "@/theme";

type Modo = "claro" | "escuro";

const CHAVE_STORAGE = "help_tema";

interface ThemeContextValue {
  modo: Modo;
  colors: Colors;
  alternarTema: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  modo: "claro",
  colors: coresClaro,
  alternarTema: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [modo, setModo] = useState<Modo>("claro");

  useEffect(() => {
    AsyncStorage.getItem(CHAVE_STORAGE).then((salvo) => {
      if (salvo === "claro" || salvo === "escuro") setModo(salvo);
    });
  }, []);

  function alternarTema() {
    setModo((atual) => {
      const novo = atual === "claro" ? "escuro" : "claro";
      AsyncStorage.setItem(CHAVE_STORAGE, novo).catch(() => {});
      return novo;
    });
  }

  const value = useMemo<ThemeContextValue>(
    () => ({ modo, colors: modo === "escuro" ? coresEscuro : coresClaro, alternarTema }),
    [modo]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
