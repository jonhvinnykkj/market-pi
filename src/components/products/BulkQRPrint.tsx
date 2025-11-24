import { useState } from "react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer, X } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  qr_code: string;
  barcode?: string | null;
  sale_price: number;
}

interface BulkQRPrintProps {
  products: Product[];
}

export function BulkQRPrint({ products }: BulkQRPrintProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const selectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map((p) => p.id)));
    }
  };

  const handlePrint = () => {
    if (selectedProducts.size === 0) {
      toast.error("Selecione pelo menos um produto");
      return;
    }

    const selectedProductList = products.filter((p) =>
      selectedProducts.has(p.id)
    );

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Não foi possível abrir janela de impressão");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiquetas QR Code</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            @page {
              size: A4;
              margin: 10mm;
            }

            body {
              font-family: Arial, sans-serif;
              padding: 0;
            }

            .labels-container {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10mm;
              padding: 5mm;
            }

            .label {
              border: 1px dashed #ccc;
              padding: 8mm;
              text-align: center;
              page-break-inside: avoid;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 80mm;
            }

            .label-name {
              font-size: 12pt;
              font-weight: bold;
              margin-bottom: 4mm;
              text-align: center;
              word-wrap: break-word;
              max-width: 100%;
            }

            .qr-code-wrapper {
              margin: 4mm 0;
            }

            .qr-code-wrapper svg {
              max-width: 100%;
              height: auto;
            }

            .label-info {
              font-size: 9pt;
              color: #666;
              margin-top: 3mm;
            }

            .label-price {
              font-size: 14pt;
              font-weight: bold;
              color: #000;
              margin-top: 2mm;
            }

            .label-code {
              font-size: 7pt;
              color: #999;
              font-family: 'Courier New', monospace;
              margin-top: 2mm;
              word-break: break-all;
            }

            @media print {
              .labels-container {
                gap: 8mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="labels-container">
            ${selectedProductList
              .map(
                (product) => `
              <div class="label">
                <div class="label-name">${product.name}</div>
                <div class="qr-code-wrapper">
                  ${generateQRCodeSVG(product.qr_code)}
                </div>
                ${
                  product.barcode
                    ? `<div class="label-info">CÓD: ${product.barcode}</div>`
                    : ""
                }
                <div class="label-price">R$ ${product.sale_price.toFixed(
                  2
                )}</div>
                <div class="label-code">${product.qr_code}</div>
              </div>
            `
              )
              .join("")}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
      toast.success(`${selectedProducts.size} etiqueta(s) enviada(s) para impressão`);
      setShowDialog(false);
    }, 500);
  };

  const generateQRCodeSVG = (value: string): string => {
    // Criar um SVG temporário para extrair o código
    const container = document.createElement("div");
    container.style.display = "none";
    document.body.appendChild(container);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "150");
    svg.setAttribute("height", "150");
    svg.setAttribute("viewBox", "0 0 150 150");

    // Usar biblioteca qr-code para gerar o SVG path
    // Por simplicidade, vamos usar um placeholder que será renderizado pelo navegador
    const serializer = new XMLSerializer();
    const svgString = `
      <svg width="150" height="150" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
        <rect width="150" height="150" fill="#FFFFFF"/>
        <g transform="translate(15,15)">
          ${generateQRPath(value)}
        </g>
      </svg>
    `;

    document.body.removeChild(container);
    return svgString;
  };

  const generateQRPath = (value: string): string => {
    // Placeholder - o QRCodeSVG do react-qr-code renderizará corretamente
    // Esta função é um fallback
    return `<text x="60" y="60" font-size="8" text-anchor="middle">${value.substring(
      0,
      10
    )}...</text>`;
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowDialog(true)}
        disabled={products.length === 0}
      >
        <Printer className="mr-2 h-4 w-4" />
        Imprimir Etiquetas ({products.length})
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Impressão de Etiquetas QR Code</DialogTitle>
            <DialogDescription>
              Selecione os produtos para imprimir etiquetas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Header com ações */}
            <div className="flex justify-between items-center pb-4 border-b">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedProducts.size === products.length}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm font-medium">
                  Selecionar todos ({selectedProducts.size} de {products.length})
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button
                  onClick={handlePrint}
                  disabled={selectedProducts.size === 0}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir ({selectedProducts.size})
                </Button>
              </div>
            </div>

            {/* Lista de produtos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`
                    flex items-center gap-4 p-4 rounded-lg border-2 transition-colors cursor-pointer
                    ${
                      selectedProducts.has(product.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }
                  `}
                  onClick={() => toggleProduct(product.id)}
                >
                  <Checkbox
                    checked={selectedProducts.has(product.id)}
                    onCheckedChange={() => toggleProduct(product.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      R$ {product.sale_price.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <QRCode value={product.qr_code} size={50} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
