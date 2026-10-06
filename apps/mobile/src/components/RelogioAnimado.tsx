import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  size?: number;
  color: string;
}

// Pulsa a opacidade do ícone de relógio enquanto algo está pendente (ex.:
// aguardando o autônomo agendar a visita) — dá uma pista visual de "em
// andamento" sem precisar de texto.
export function RelogioAnimado({ size = 15, color }: Props) {
  const opacidade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidade, { toValue: 0.25, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacidade, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacidade]);

  return (
    <Animated.View style={{ opacity: opacidade }}>
      <Ionicons name="time-outline" size={size} color={color} />
    </Animated.View>
  );
}
