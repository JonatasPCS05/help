import { createElement } from "react";
import { colors, radius, spacing } from "@/theme";
import { paraDataISO } from "@/lib/data";

interface Props {
  value: Date | null;
  onChange: (data: Date) => void;
  minimumDate?: Date;
  style?: object;
}

// Versão web: @react-native-community/datetimepicker não tem implementação
// pra web (só ios/android/windows). Usamos o seletor nativo do navegador
// (<input type="date">) em vez disso — o Metro escolhe este arquivo
// automaticamente quando o alvo de bundle é "web" (sufixo .web.tsx).
export function DatePickerField({ value, onChange, minimumDate, style }: Props) {
  return createElement("input", {
    type: "date",
    value: value ? paraDataISO(value) : "",
    min: minimumDate ? paraDataISO(minimumDate) : undefined,
    onChange: (evento: { target: { value: string } }) => {
      const valorTexto = evento.target.value;
      if (valorTexto) onChange(new Date(`${valorTexto}T00:00:00`));
    },
    style: {
      backgroundColor: colors.white,
      borderRadius: radius.md,
      paddingLeft: spacing.md,
      paddingRight: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      marginBottom: spacing.md,
      color: colors.ink,
      border: "none",
      fontFamily: "inherit",
      fontSize: 14,
      ...style,
    },
  });
}
