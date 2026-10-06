export const coresClaro = {
  primary: "#388E3C",
  primaryDark: "#1B5E20",
  primaryLight: "#E8F3E9",
  secondary: "#1976D2",
  secondaryLight: "#E3F2FD",
  tertiary: "#B14B6F",
  tertiaryLight: "#F7E9EE",
  ink: "#1A1A1A",
  canvas: "#FBF9F6",
  border: "#EAE6E0",
  muted: "#8A8580",
  white: "#FFFFFF",
};

// Paleta escura — mesma semântica de token (ex.: "white" continua sendo
// "cor de superfície dos cards", mesmo não sendo branco de verdade aqui),
// só pra não precisar renomear token em nenhum dos componentes que já
// usam `colors.white` como "fundo do card".
export const coresEscuro: typeof coresClaro = {
  primary: "#66BB6A",
  primaryDark: "#A5D6A7",
  primaryLight: "#1E3620",
  secondary: "#64B5F6",
  secondaryLight: "#1A2A3D",
  tertiary: "#D08BA6",
  tertiaryLight: "#3A2630",
  ink: "#F2F0ED",
  canvas: "#121212",
  border: "#2C2C2C",
  muted: "#A3A3A3",
  white: "#1E1E1E",
};

// Mantido como export direto (paleta clara) pra qualquer trecho que ainda
// não foi convertido pro ThemeContext continuar funcionando sem quebrar.
export const colors = coresClaro;

export type Colors = typeof coresClaro;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};
