import { getToken, ApiClientError } from "@/lib/api";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3333";

interface ImagemParaEnvio {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  file?: File;
}

export async function uploadImagem(imagem: ImagemParaEnvio): Promise<{ url: string }> {
  const token = await getToken();
  const formData = new FormData();

  if (imagem.file) {
    formData.append("arquivo", imagem.file, imagem.fileName ?? "documento.jpg");
  } else {
    formData.append(
      "arquivo",
      { uri: imagem.uri, name: imagem.fileName ?? "documento.jpg", type: imagem.mimeType ?? "image/jpeg" } as unknown as Blob
    );
  }

  const res = await fetch(`${API_URL}/uploads`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiClientError(res.status, body.message ?? "Não foi possível enviar o arquivo", body.error);
  }

  return res.json();
}
