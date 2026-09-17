import { createElement } from "react";
import { colors, radius, spacing } from "@/theme";

interface Props {
  value: Date | null;
  onChange: (data: Date) => void;
  minimumDate?: Date;
  style?: object;
}

function paraDataHoraLocalInput(data: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

// Versão web: usa <input type="datetime-local"> nativo do navegador — mesmo
// padrão de DatePickerField.web.tsx, mas incluindo a hora.
export function DateTimePickerField({ value, onChange, minimumDate, style }: Props) {
  return createElement("input", {
    type: "datetime-local",
    value: value ? paraDataHoraLocalInput(value) : "",
    min: minimumDate ? paraDataHoraLocalInput(minimumDate) : undefined,
    onChange: (evento: { target: { value: string } }) => {
      const valorTexto = evento.target.value;
      if (valorTexto) onChange(new Date(valorTexto));
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
