import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "@/screens/HomeScreen";
import { NewRequestScreen } from "@/screens/NewRequestScreen";

export type HomeStackParamList = {
  HomeMain: undefined;
  NewRequest: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain">
        {({ navigation }) => <HomeScreen onNovaSolicitacao={() => navigation.navigate("NewRequest")} />}
      </Stack.Screen>
      <Stack.Screen name="NewRequest">
        {({ navigation }) => (
          <NewRequestScreen onEnviado={() => navigation.goBack()} onCancelar={() => navigation.goBack()} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
