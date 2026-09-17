import AsyncStorage from "@react-native-async-storage/async-storage";

// Indicador de "não lida" simples e sem backend: guarda no dispositivo
// quando cada conversa foi vista por último, sem precisar de campo novo
// no banco nem sincronizar entre dispositivos — suficiente pro escopo
// (mesma lógica de simplicidade já usada no chat, que também não tem
// WebSocket).
const PREFIXO = "help_chat_visto_";

export async function marcarComoVisto(solicitacaoId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${PREFIXO}${solicitacaoId}`, new Date().toISOString());
  } catch {
    // Falha ao gravar não deve travar o chat — só o indicador de não lida
    // fica menos preciso.
  }
}

export async function ultimaVezVisto(solicitacaoId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(`${PREFIXO}${solicitacaoId}`);
  } catch {
    return null;
  }
}
