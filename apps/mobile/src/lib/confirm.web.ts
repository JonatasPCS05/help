// Versão web: usa o confirm() nativo do navegador diretamente, em vez do
// Alert.alert do react-native-web (que tem suporte inconsistente pra
// múltiplos botões e não estava disparando a ação de confirmar).
export function confirmarAcao(titulo: string, mensagem: string, aoConfirmar: () => void) {
  const confirmado = window.confirm(`${titulo}\n\n${mensagem}`);
  if (confirmado) aoConfirmar();
}
