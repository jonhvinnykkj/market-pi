import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isValidImageFile, isValidFileSize } from "@/lib/storage";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  onFileSelect?: (file: File | null) => void;
  disabled?: boolean;
  maxSizeMB?: number;
}

export function ImageUpload({
  value,
  onChange,
  onFileSelect,
  disabled = false,
  maxSizeMB = 5,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setPreview(null);
      onChange(null);
      onFileSelect?.(null);
      return;
    }

    // Validar tipo
    if (!isValidImageFile(file)) {
      toast.error("Tipo de arquivo inválido", {
        description: "Por favor, selecione uma imagem (JPG, PNG ou WebP)",
      });
      return;
    }

    // Validar tamanho
    if (!isValidFileSize(file, maxSizeMB)) {
      toast.error("Arquivo muito grande", {
        description: `O tamanho máximo permitido é ${maxSizeMB}MB`,
      });
      return;
    }

    // Criar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Notificar componente pai
    onFileSelect?.(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0] || null;
    handleFileChange(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    onFileSelect?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {preview ? (
        // Preview da imagem
        <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden border-2 border-border">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          {!disabled && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        // Área de upload
        <div
          onClick={!disabled ? handleClick : undefined}
          onDragOver={!disabled ? handleDragOver : undefined}
          onDragLeave={!disabled ? handleDragLeave : undefined}
          onDrop={!disabled ? handleDrop : undefined}
          className={`
            w-full aspect-video rounded-lg border-2 border-dashed
            flex flex-col items-center justify-center gap-2
            transition-colors cursor-pointer
            ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
            ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary hover:bg-accent"}
          `}
        >
          <div className="flex flex-col items-center gap-2 text-center p-4">
            {isDragging ? (
              <Upload className="h-10 w-10 text-primary animate-bounce" />
            ) : (
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isDragging
                  ? "Solte a imagem aqui"
                  : "Clique ou arraste uma imagem"}
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG ou WebP (máx. {maxSizeMB}MB)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
