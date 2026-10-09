import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ChatListScreen } from "@/screens/ChatListScreen";
import { ChatScreen } from "@/screens/ChatScreen";
import { ChatSplitView } from "@/screens/ChatSplitView";
import { useResponsive } from "@/hooks/useResponsive";

export type ChatStackParamList = {
  ChatMain: undefined;
  ChatThread: { id: string; nome?: string; categoria?: string };
};

const Stack = createNativeStackNavigator<ChatStackParamList>();

export function ChatStack() {
  // Tela larga: lista + conversa lado a lado, sem navegação de verdade.
  // Estreita: continua uma tela por vez (padrão mobile).
  const { isWide } = useResponsive();
  if (isWide) return <ChatSplitView />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChatMain">
        {({ navigation }) => (
          <ChatListScreen
            onAbrirConversa={(id, nome, categoria) => navigation.navigate("ChatThread", { id, nome, categoria })}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ChatThread">
        {({ navigation, route }) => (
          <ChatScreen
            solicitacaoId={route.params.id}
            nomeOutraParte={route.params.nome}
            categoria={route.params.categoria}
            onVoltar={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
