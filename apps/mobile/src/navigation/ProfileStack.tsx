import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { BecomeAutonomoScreen } from "@/screens/BecomeAutonomoScreen";
import { EditProfileScreen } from "@/screens/EditProfileScreen";
import { HistoryScreen } from "@/screens/HistoryScreen";
import { PaymentsScreen } from "@/screens/PaymentsScreen";
import { SolicitacaoDetailScreen } from "@/screens/SolicitacaoDetailScreen";
import { FavoritosScreen } from "@/screens/FavoritosScreen";
import { ProfessionalProfileScreen } from "@/screens/ProfessionalProfileScreen";

export type ProfileStackParamList = {
  ProfileMain: undefined;
  BecomeAutonomo: undefined;
  EditProfile: undefined;
  History: undefined;
  Payments: undefined;
  SolicitacaoDetail: { id: string };
  Favoritos: undefined;
  PerfilProfissional: { autonomoId: string };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

interface Props {
  // Mesma ideia do HomeStack: navegação pras abas Pedidos/Chat resolvida
  // de fora, já que desktop (troca manual de tela) e mobile (tabs de
  // verdade) funcionam diferente.
  onAbrirPedidos?: () => void;
  onAbrirChat?: () => void;
}

export function ProfileStack({ onAbrirPedidos, onAbrirChat }: Props) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain">
        {({ navigation }) => (
          <ProfileScreen
            onTornarAutonomo={() => navigation.navigate("BecomeAutonomo")}
            onEditarPerfil={() => navigation.navigate("EditProfile")}
            onAbrirHistorico={() => navigation.navigate("History")}
            onAbrirPagamentos={() => navigation.navigate("Payments")}
            onAbrirFavoritos={() => navigation.navigate("Favoritos")}
            onAbrirPedidos={onAbrirPedidos}
            onAbrirChat={onAbrirChat}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Favoritos">
        {({ navigation }) => (
          <FavoritosScreen
            onVoltar={() => navigation.goBack()}
            onVerPerfil={(autonomoId) => navigation.navigate("PerfilProfissional", { autonomoId })}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="PerfilProfissional">
        {({ navigation, route }) => (
          <ProfessionalProfileScreen
            autonomoId={route.params.autonomoId}
            onVoltar={() => navigation.goBack()}
            onPedirOrcamento={() => {}}
            onPrecisaEntrar={() => {}}
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
