import { Alert } from "react-native";

// Versão iOS/Android: usa o diálogo nativo do sistema.
export function confirmarAcao(titulo: string, mensagem: string, aoConfirmar: () => void) {
  Alert.alert(titulo, mensagem, [
    { text: "Cancelar", style: "cancel" },
    { text: "Confirmar", style: "destructive", onPress: aoConfirmar },
  ]);
}
