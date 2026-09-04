// Cor da estrela é sempre a mesma (amarelo/dourado clássico de avaliação);
// a cor do número muda conforme a faixa da nota, do mesmo jeito que a
// maioria dos sites de avaliação (Trustpilot, Uber etc.) usa um gradiente
// vermelho→verde pra comunicar a qualidade de cara, sem precisar ler o
// número.
export const COR_ESTRELA = "#FFC107";

export function corAvaliacao(nota: number): string {
  if (nota < 1) return "#6D2932"; // vinho
  if (nota < 2) return "#D32F2F"; // vermelho
  if (nota < 3) return "#F57C00"; // laranja
  if (nota < 4) return "#F9A825"; // amarelo
  if (nota < 5) return "#7CB342"; // verde claro
  return "#2E7D32"; // verde escuro (nota máxima)
}
