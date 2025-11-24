import { useRef } from "react";
import QRCode from "react-qr-code";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface QRCodeDisplayProps {
  value: string;
  title?: string;
  subtitle?: string;
  size?: number;
  showActions?: boolean;
}

export function QRCodeDisplay({
  value,
  title,
  subtitle,
  size = 200,
  showActions = true,
}: QRCodeDisplayProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    try {
      const svg = qrRef.current?.querySelector("svg");
      if (!svg) return;

      // Criar canvas e desenhar SVG
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        canvas.width = size;
        canvas.height = size;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0);

        // Download
        canvas.toBlob((blob) => {
          if (!blob) return;
          const link = document.createElement("a");
          link.download = `qrcode-${value}.png`;
          link.href = URL.createObjectURL(blob);
          link.click();
          URL.revokeObjectURL(link.href);
          toast.success("QR Code baixado com sucesso!");
        });

        URL.revokeObjectURL(url);
      };

      img.src = url;
    } catch (error) {
      console.error("Erro ao baixar QR Code:", error);
      toast.error("Erro ao baixar QR Code");
    }
  };

  const handlePrint = () => {
    try {
      const svg = qrRef.current?.querySelector("svg");
      if (!svg) return;

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Não foi possível abrir janela de impressão");
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svg);

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Imprimir QR Code - ${title || value}</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                font-family: Arial, sans-serif;
              }
              .qr-container {
                text-align: center;
                page-break-inside: avoid;
              }
              h2 {
                margin: 0 0 10px 0;
                font-size: 18px;
              }
              p {
                margin: 5px 0;
                font-size: 14px;
                color: #666;
              }
              svg {
                margin: 20px 0;
              }
              @media print {
                body {
                  padding: 0;
                }
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              ${title ? `<h2>${title}</h2>` : ""}
              ${subtitle ? `<p>${subtitle}</p>` : ""}
              ${svgData}
              <p>Código: ${value}</p>
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();

      // Aguardar carregar antes de imprimir
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);

      toast.success("Abrindo janela de impressão...");
    } catch (error) {
      console.error("Erro ao imprimir:", error);
      toast.error("Erro ao imprimir QR Code");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">
          {title || "QR Code do Produto"}
        </CardTitle>
        {subtitle && (
          <p className="text-sm text-muted-foreground text-center">
            {subtitle}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div
          ref={qrRef}
          className="bg-white p-4 rounded-lg border-2 border-border"
        >
          <QRCode value={value} size={size} level="M" />
        </div>

        <p className="text-xs text-muted-foreground font-mono text-center break-all max-w-full">
          {value}
        </p>

        {showActions && (
          <div className="flex gap-2 w-full">
            <Button
              onClick={handleDownload}
              variant="outline"
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar
            </Button>
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
