// Paleta alinhada ao design system do pacote do professor (2026-10).
export const coresClaro = {
  primary: "#168A43",
  primaryDark: "#0F5F2D",
  primaryLight: "#EAF8EF",
  secondary: "#2563EB",
  secondaryLight: "#E3F2FD",
  tertiary: "#F59E0B",
  tertiaryLight: "#FEF3E2",
  erro: "#E5484D",
  ink: "#101828",
  canvas: "#F8FAF9",
  border: "#E4E7EC",
  muted: "#667085",
  mutedLight: "#98A2B2",
  white: "#FFFFFF",
};

// Paleta escura — mesma semântica de token (ex.: "white" continua sendo
// "cor de superfície dos cards", mesmo não sendo branco de verdade aqui),
// só pra não precisar renomear token em nenhum dos componentes que já
// usam `colors.white` como "fundo do card".
export const coresEscuro: typeof coresClaro = {
  primary: "#2DBE66",
  primaryDark: "#1FA653",
  primaryLight: "#113822",
  secondary: "#64B5F6",
  secondaryLight: "#1A2A3D",
  tertiary: "#F5B94E",
  tertiaryLight: "#3A2E18",
  erro: "#F2777B",
  ink: "#F2F0ED",
  canvas: "#121212",
  border: "#2C2C2C",
  muted: "#A3A3A3",
  mutedLight: "#7E8792",
  white: "#1E1E1E",
};

// Mantido como export direto (paleta clara) pra qualquer trecho que ainda
// não foi convertido pro ThemeContext continuar funcionando sem quebrar.
export const colors = coresClaro;

export type Colors = typeof coresClaro;

// xs/sm/md/lg/xl mantêm exatamente os valores originais (4/8/16/24/32) —
// são usados em centenas de lugares no código já existente, então não
// podiam mudar de valor (só mudar o que "sm" significa quebraria o layout
// de todas as telas silenciosamente, sem erro de TypeScript pra pegar).
// xxl/xxxl/huge são puramente novos, pro design system do pacote do
// professor, que pede também 48/64/80.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  huge: 80,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const fontFamily = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
};
