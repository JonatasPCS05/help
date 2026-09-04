import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { ApiClientError } from "@/lib/api";
import { colors, radius, spacing } from "@/theme";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

const discovery = { authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth" };

interface Props {
  onPrecisaCpf: (idToken: string) => void;
  onErro: (mensagem: string) => void;
}

export function GoogleSignInButton({ onPrecisaCpf, onErro }: Props) {
  const { entrarComGoogle } = useAuth();
  const [processando, setProcessando] = useState(false);
  const nonce = useMemo(() => Crypto.randomUUID(), []);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID ?? "",
      scopes: ["openid", "profile", "email"],
      redirectUri: AuthSession.makeRedirectUri(),
      responseType: AuthSession.ResponseType.IdToken,
      usePKCE: false,
      extraParams: { nonce },
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === "success" && response.params.id_token) {
      processar(response.params.id_token);
    } else if (response?.type === "error") {
      onErro("Não foi possível entrar com o Google");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  async function processar(idToken: string) {
    setProcessando(true);
    try {
      await entrarComGoogle(idToken);
    } catch (e) {
      if (e instanceof ApiClientError && e.code === "cpf_obrigatorio") {
        onPrecisaCpf(idToken);
      } else {
        onErro(e instanceof ApiClientError ? e.message : "Não foi possível entrar com o Google");
      }
    } finally {
      setProcessando(false);
    }
  }

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <TouchableOpacity style={styles.botao} onPress={() => promptAsync()} disabled={!request || processando}>
      {processando ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <View style={styles.conteudo}>
          <Ionicons name="logo-google" size={18} color={colors.ink} />
          <Text style={styles.texto}>Entrar com Google</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  botao: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  conteudo: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  texto: { color: colors.ink, fontWeight: "600" },
});
