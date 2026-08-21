import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { HomeStack } from "./HomeStack";
import { OrdersScreen } from "@/screens/OrdersScreen";
import { IncomingRequestsScreen } from "@/screens/IncomingRequestsScreen";
import { ChatListScreen } from "@/screens/ChatListScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/hooks/useResponsive";
import { colors } from "@/theme";

const Tab = createBottomTabNavigator();

// Nomes de ícones do Ionicons (@expo/vector-icons) — substituem os emojis
// que ficavam inconsistentes com os demais ícones vetoriais do app.
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: "home-outline",
  Recebidos: "file-tray-full-outline",
  Orders: "receipt-outline",
  Trabalhos: "briefcase-outline",
  Chat: "chatbubble-ellipses-outline",
  Profile: "person-outline",
};

const LABELS: Record<string, string> = {
  Home: "Home",
  Recebidos: "Recebidos",
  Orders: "Meus Pedidos",
  Trabalhos: "Trabalhos",
  Chat: "Chat",
  Profile: "Perfil",
};

function telasDisponiveis(isAutonomo: boolean): string[] {
  return ["Home", ...(isAutonomo ? ["Recebidos"] : []), "Orders", ...(isAutonomo ? ["Trabalhos"] : []), "Chat", "Profile"];
}

function renderizarTela(chave: string) {
  switch (chave) {
    case "Home":
      return <HomeStack />;
    case "Recebidos":
      return <IncomingRequestsScreen />;
    case "Orders":
      return <OrdersScreen papel="cliente" />;
    case "Trabalhos":
      return <OrdersScreen papel="autonomo" />;
    case "Chat":
      return <ChatListScreen />;
    case "Profile":
      return <ProfileScreen />;
    default:
      return null;
  }
}

// Em telas largas (tablet/desktop na versão web) usamos um menu lateral
// fixo, no mesmo estilo do dashboard admin. Em telas estreitas (celular),
// mantemos a barra de abas embaixo — mesmas telas, layout diferente.
function DesktopShell() {
  const { usuario } = useAuth();
  const telas = telasDisponiveis(!!usuario?.isAutonomo);
  const [telaAtiva, setTelaAtiva] = useState(telas[0]);

  const itens = telas.map((chave) => ({ chave, label: LABELS[chave], icone: ICONS[chave] }));

  return (
    <View style={styles.desktopContainer}>
      <AppSidebar itens={itens} ativo={telaAtiva} onSelecionar={setTelaAtiva} />
      <View style={styles.desktopContent}>{renderizarTela(telaAtiva)}</View>
    </View>
  );
}

function MobileTabs() {
  const { usuario } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size }) => <Ionicons name={ICONS[route.name]} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ title: "Home" }} />
      {usuario?.isAutonomo && (
        <Tab.Screen name="Recebidos" component={IncomingRequestsScreen} options={{ title: "Recebidos" }} />
      )}
      <Tab.Screen name="Orders" options={{ title: "Orders" }}>
        {() => <OrdersScreen papel="cliente" />}
      </Tab.Screen>
      {usuario?.isAutonomo && (
        <Tab.Screen name="Trabalhos" options={{ title: "Trabalhos" }}>
          {() => <OrdersScreen papel="autonomo" />}
        </Tab.Screen>
      )}
      <Tab.Screen name="Chat" component={ChatListScreen} options={{ title: "Chat" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}

export function MainTabs() {
  const { isWide } = useResponsive();
  return isWide ? <DesktopShell /> : <MobileTabs />;
}

const styles = StyleSheet.create({
  desktopContainer: { flex: 1, flexDirection: "row", backgroundColor: colors.canvas },
  desktopContent: { flex: 1 },
});
