import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrCodeRegionId = "qr-reader";

  useEffect(() => {
    return () => {
      // Limpar scanner ao desmontar componente
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    setIsLoading(true);

    try {
      // Criar instância do scanner
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(qrCodeRegionId);
      }

      const scanner = scannerRef.current;

      // Configurações do scanner
      const config = {
        fps: 10, // Frames por segundo
        qrbox: { width: 250, height: 250 }, // Tamanho da área de scan
        aspectRatio: 1.0,
      };

      // Callback de sucesso
      const qrCodeSuccessCallback = (decodedText: string) => {
        toast.success("QR Code detectado!");
        onScan(decodedText);
        // Opcionalmente, parar o scanner após detectar
        // stopScanning();
      };

      // Callback de erro (opcional)
      const qrCodeErrorCallback = (errorMessage: string) => {
        // Ignorar erros comuns de "não encontrado"
        // console.log("Scanner error:", errorMessage);
      };

      // Iniciar scanner
      await scanner.start(
        { facingMode: "environment" }, // Câmera traseira em mobile
        config,
        qrCodeSuccessCallback,
        qrCodeErrorCallback
      );

      setIsScanning(true);
      setIsLoading(false);
      toast.success("Scanner ativado!");
    } catch (error: any) {
      console.error("Erro ao iniciar scanner:", error);
      setIsLoading(false);

      let errorMessage = "Erro ao acessar a câmera";

      if (error.name === "NotAllowedError") {
        errorMessage = "Permissão de câmera negada";
      } else if (error.name === "NotFoundError") {
        errorMessage = "Nenhuma câmera encontrada";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Câmera em uso por outro aplicativo";
      }

      toast.error(errorMessage);
      onError?.(errorMessage);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        setIsScanning(false);
        toast.info("Scanner desativado");
      } catch (error) {
        console.error("Erro ao parar scanner:", error);
      }
    }
  };

  return (
    <Card className="p-6 space-y-4">
      {/* Área de Scanner */}
      <div
        id={qrCodeRegionId}
        className={`
          w-full aspect-square max-w-md mx-auto rounded-lg overflow-hidden
          ${!isScanning ? "bg-muted border-2 border-dashed border-muted-foreground/25" : ""}
        `}
      >
        {!isScanning && !isLoading && (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <Camera className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Scanner Inativo</p>
            <p className="text-sm">
              Clique no botão abaixo para ativar a câmera e escanear QR Codes
            </p>
          </div>
        )}
        {isLoading && (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              Iniciando câmera...
            </p>
          </div>
        )}
      </div>

      {/* Botões de Controle */}
      <div className="flex justify-center gap-4">
        {!isScanning ? (
          <Button
            onClick={startScanning}
            disabled={isLoading}
            size="lg"
            className="w-full max-w-xs"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Iniciando...
              </>
            ) : (
              <>
                <Camera className="mr-2 h-5 w-5" />
                Iniciar Scanner
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={stopScanning}
            variant="destructive"
            size="lg"
            className="w-full max-w-xs"
          >
            <CameraOff className="mr-2 h-5 w-5" />
            Parar Scanner
          </Button>
        )}
      </div>

      {/* Instruções */}
      <div className="text-center text-sm text-muted-foreground space-y-2 pt-4 border-t">
        <p className="font-medium">Como usar:</p>
        <ul className="space-y-1 text-xs">
          <li>• Permita o acesso à câmera quando solicitado</li>
          <li>• Posicione o QR Code dentro da área de leitura</li>
          <li>• Aguarde a detecção automática</li>
          <li>• O produto será carregado automaticamente</li>
        </ul>
      </div>
    </Card>
  );
}
