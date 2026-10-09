import { Ionicons } from "@expo/vector-icons";

// Ícone é só estético: categorias conhecidas ganham um ícone específico,
// qualquer categoria nova (inclusive as que o admin ainda vai criar) cai
// no ícone padrão sem quebrar nada. Usado na Landing, Home e diretório.
export const ICONE_POR_CATEGORIA: Record<string, keyof typeof Ionicons.glyphMap> = {
  Jardineiro: "leaf-outline",
  Piscineiro: "water-outline",
  Pedreiro: "hammer-outline",
  Eletricista: "flash-outline",
  Encanador: "build-outline",
  Pintor: "color-palette-outline",
  Diarista: "home-outline",
  "Montador de Móveis": "cube-outline",
  "Técnico de Ar-condicionado": "snow-outline",
  Chaveiro: "key-outline",
  "Pequenos Reparos": "construct-outline",
};

export const ICONE_CATEGORIA_PADRAO: keyof typeof Ionicons.glyphMap = "construct-outline";
