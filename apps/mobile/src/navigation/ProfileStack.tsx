import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { BecomeAutonomoScreen } from "@/screens/BecomeAutonomoScreen";
import { EditProfileScreen } from "@/screens/EditProfileScreen";
import { HistoryScreen } from "@/screens/HistoryScreen";
import { PaymentsScreen } from "@/screens/PaymentsScreen";
import { SolicitacaoDetailScreen } from "@/screens/SolicitacaoDetailScreen";

export type ProfileStackParamList = {
  ProfileMain: undefined;
  BecomeAutonomo: undefined;
  EditProfile: undefined;
  History: undefined;
  Payments: undefined;
  SolicitacaoDetail: { id: string };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain">
        {({ navigation }) => (
          <ProfileScreen
            onTornarAutonomo={() => navigation.navigate("BecomeAutonomo")}
            onEditarPerfil={() => navigation.navigate("EditProfile")}
            onAbrirHistorico={() => navigation.navigate("History")}
            onAbrirPagamentos={() => navigation.navigate("Payments")}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="BecomeAutonomo">
        {({ navigation }) => <BecomeAutonomoScreen onVoltar={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="EditProfile">
        {({ navigation }) => <EditProfileScreen onVoltar={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="History">
        {({ navigation }) => (
          <HistoryScreen
            onVoltar={() => navigation.goBack()}
            onAbrirSolicitacao={(id) => navigation.navigate("SolicitacaoDetail", { id })}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Payments">
        {({ navigation }) => (
          <PaymentsScreen
            onVoltar={() => navigation.goBack()}
            onAbrirSolicitacao={(id) => navigation.navigate("SolicitacaoDetail", { id })}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="SolicitacaoDetail">
        {({ navigation, route }) => (
          <SolicitacaoDetailScreen solicitacaoId={route.params.id} onVoltar={() => navigation.goBack()} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
