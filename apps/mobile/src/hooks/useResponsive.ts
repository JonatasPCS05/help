import { useWindowDimensions } from "react-native";

const BREAKPOINT_LARGO = 768;

export function useResponsive() {
  const { width } = useWindowDimensions();
  return { isWide: width >= BREAKPOINT_LARGO };
}
