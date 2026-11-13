/**
 * Factura de prueba en PDF, marcada como EJEMPLO y sin datos reales. La genera el script para cada gasto de
 * los datos de prueba: la página publica el archivo y el contrato guarda su hash (doble confirmación).
 * PDF 1.4 mínimo, una página, Helvetica con codificación WinAnsi (admite tildes y eñes). Sin dependencias.
 */

export interface InvoiceData {
  number: string;
  date: string;
  providerName: string;
  providerCity: string;
  ngoName: string;
  ngoNit: string;
  caseCode: string;
  stageName: string;
  concept: string;
  amount: string;
  assetCode: string;
}

/** Escapa un texto para una cadena literal de PDF y lo pasa a Latin-1 (WinAnsi). */
function pdfString(text: string): string {
  return `(${text.replace(/[\\()]/g, (c) => `\\${c}`)})`;
}

export function invoicePdf(data: InvoiceData): Uint8Array {
  const lines: Array<[size: number, x: number, y: number, text: string]> = [
    [10, 72, 770, "DOCUMENTO DE EJEMPLO - SIN VALOR FISCAL - DATOS FICTICIOS PARA LA DEMO DE PROOF OF WILD"],
    [20, 72, 730, `Factura de venta ${data.number}`],
    [12, 72, 700, data.providerName],
    [11, 72, 684, data.providerCity],
    [11, 72, 650, `Fecha: ${data.date}`],
    [11, 72, 630, `Cliente: ${data.ngoName} (NIT ${data.ngoNit})`],
    [11, 72, 610, `Caso: ${data.caseCode} - Etapa: ${data.stageName}`],
    [12, 72, 570, "Concepto"],
    [12, 440, 570, "Valor"],
    [11, 72, 548, data.concept],
    [11, 440, 548, `${data.amount} ${data.assetCode}`],
    [13, 72, 500, `Total: ${data.amount} ${data.assetCode}`],
    [9, 72, 120, "Los datos personales de terceros se tapan antes de publicar una factura (Ley 1581 de 2012)."],
    [9, 72, 106, "El hash SHA-256 de este archivo queda en el contrato de Proof of Wild en Stellar testnet."],
  ];

  const content = [
    "0.85 0.76 0.6 rg 60 760 492 24 re f", // franja arena de «EJEMPLO»
    "0 0 0 rg",
    "0.8 0.8 0.8 RG 72 560 m 540 560 l S",
    ...lines.map(([size, x, y, text]) => `BT /F1 ${size} Tf ${x} ${y} Td ${pdfString(text)} Tj ET`),
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body, "latin1");
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  return new Uint8Array(Buffer.from(body, "latin1"));
}
