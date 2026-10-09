import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Favorito {
  autonomo: { id: string };
}

// Hook pequeno pra telas que só precisam saber QUAIS autônomos estão
// favoritados (pra pintar o coraçãozinho) e alternar -- a lista completa
// com dados do autônomo (nome, foto, nota) fica em FavoritosScreen/
// HomeScreen, que têm necessidades diferentes.
export function useFavoritos() {
  const [favoritosIds, setFavoritosIds] = useState<string[]>([]);

  const recarregar = useCallback(() => {
    apiFetch<Favorito[]>("/favoritos")
      .then((lista) => setFavoritosIds(lista.map((f) => f.autonomo.id)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const alternar = useCallback(
    async (autonomoId: string) => {
      const favoritado = favoritosIds.includes(autonomoId);
      setFavoritosIds((atual) => (favoritado ? atual.filter((id) => id !== autonomoId) : [...atual, autonomoId]));
      try {
        await apiFetch(`/favoritos/${autonomoId}`, { method: favoritado ? "DELETE" : "POST" });
      } catch {
        recarregar();
      }
    },
    [favoritosIds, recarregar]
  );

  return { favoritosIds, alternar };
}
