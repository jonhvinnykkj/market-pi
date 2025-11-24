import { supabase } from "@/integrations/supabase/client";

/**
 * Upload de arquivo para o Supabase Storage
 * @param file - Arquivo a ser enviado
 * @param bucket - Nome do bucket (padrão: 'product-images')
 * @param path - Caminho dentro do bucket (ex: 'products/abc-123.jpg')
 * @returns URL pública do arquivo ou null em caso de erro
 */
export async function uploadFile(
  file: File,
  bucket: string = "product-images",
  path?: string
): Promise<string | null> {
  try {
    // Gerar nome único se não fornecido
    const fileName = path || `products/${Date.now()}-${file.name}`;

    // Upload do arquivo
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Erro ao fazer upload:", error);
      return null;
    }

    // Obter URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error("Erro inesperado no upload:", error);
    return null;
  }
}

/**
 * Atualizar arquivo existente
 * @param file - Novo arquivo
 * @param bucket - Nome do bucket
 * @param path - Caminho do arquivo existente
 * @returns URL pública ou null
 */
export async function updateFile(
  file: File,
  bucket: string = "product-images",
  path: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .update(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("Erro ao atualizar arquivo:", error);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error("Erro inesperado na atualização:", error);
    return null;
  }
}

/**
 * Deletar arquivo do Storage
 * @param bucket - Nome do bucket
 * @param path - Caminho do arquivo
 * @returns true se sucesso, false se erro
 */
export async function deleteFile(
  bucket: string = "product-images",
  path: string
): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error("Erro ao deletar arquivo:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erro inesperado ao deletar:", error);
    return false;
  }
}

/**
 * Extrair path do arquivo a partir da URL pública
 * @param url - URL pública do Supabase Storage
 * @returns Path do arquivo ou null
 */
export function extractPathFromUrl(url: string): string | null {
  try {
    // URL formato: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
    const matches = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    return matches ? matches[1] : null;
  } catch (error) {
    console.error("Erro ao extrair path da URL:", error);
    return null;
  }
}

/**
 * Validar tipo de arquivo de imagem
 * @param file - Arquivo a validar
 * @returns true se for imagem válida
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  return validTypes.includes(file.type);
}

/**
 * Validar tamanho do arquivo (padrão: 5MB)
 * @param file - Arquivo a validar
 * @param maxSizeMB - Tamanho máximo em MB
 * @returns true se tamanho válido
 */
export function isValidFileSize(file: File, maxSizeMB: number = 5): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}
