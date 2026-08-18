import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { HomeStack } from "./HomeStack";
import { OrdersScreen } from "@/screens/OrdersScreen";
import { IncomingRequestsScreen } from "@/screens/IncomingRequestsScreen";
import { ChatListScreen } from "@/screens/ChatListScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/theme";

const Tab = createBottomTabNavigator();

const ICONS: Record<string, string> = {
  Home: "⌂",
  Recebidos: "📥",
  Orders: "☰",
  Trabalhos: "🧰",
  Chat: "✉",
  Profile: "◉",
};

export function MainTabs() {
  const { usuario } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>{ICONS[route.name]}</Text>,
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
