// Reexporta o modal custom (ver components/ConfirmModal.tsx) — era um
// Alert.alert nativo + window.confirm separado por plataforma antes, mas
// o confirm() cru do navegador destoava completamente do resto do app, e
// o professor pediu pra todo alerta ter o mesmo estilo. Um único arquivo
// cross-platform agora resolve as duas plataformas.
export { confirmarAcao } from "@/components/ConfirmModal";
