import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { HomeStack } from "./HomeStack";
import { OrdersScreen } from "@/screens/OrdersScreen";
import { ChatListScreen } from "@/screens/ChatListScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { colors } from "@/theme";

const Tab = createBottomTabNavigator();

const ICONS: Record<string, string> = {
  Home: "⌂",
  Orders: "☰",
  Chat: "✉",
  Profile: "◉",
};

export function MainTabs() {
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
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: "Orders" }} />
      <Tab.Screen name="Chat" component={ChatListScreen} options={{ title: "Chat" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}
