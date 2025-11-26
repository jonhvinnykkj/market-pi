/**
 * Upload de arquivo para o servidor
 * @param file - Arquivo a ser enviado
 * @returns URL pública do arquivo ou null em caso de erro
 */
export async function uploadFile(
  file: File,
  _bucket: string = "product-images",
  _path?: string
): Promise<string | null> {
  try {
    // Converter arquivo para base64
    const base64 = await fileToBase64(file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: base64,
        filename: file.name,
      }),
    });

    if (!response.ok) {
      console.error("Erro ao fazer upload:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error("Erro inesperado no upload:", error);
    return null;
  }
}

/**
 * Converter File para base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Atualizar arquivo existente (usa mesmo método de upload)
 */
export async function updateFile(
  file: File,
  bucket: string = "product-images",
  _path: string
): Promise<string | null> {
  return uploadFile(file, bucket);
}

/**
 * Deletar arquivo do Storage (não implementado no servidor simples)
 */
export async function deleteFile(
  _bucket: string = "product-images",
  _path: string
): Promise<boolean> {
  // TODO: implementar delete no servidor se necessário
  return true;
}

/**
 * Extrair path do arquivo a partir da URL
 */
export function extractPathFromUrl(url: string): string | null {
  try {
    const matches = url.match(/\/uploads\/(.+)$/);
    return matches ? matches[1] : null;
  } catch (error) {
    console.error("Erro ao extrair path da URL:", error);
    return null;
  }
}

/**
 * Validar tipo de arquivo de imagem
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  return validTypes.includes(file.type);
}

/**
 * Validar tamanho do arquivo (padrão: 5MB)
 */
export function isValidFileSize(file: File, maxSizeMB: number = 5): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}
