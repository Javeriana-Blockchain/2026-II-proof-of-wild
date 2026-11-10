import { describe, expect, it } from "vitest";
import { sha256Hex } from "@/lib/hash";
import { invoicePdf, type InvoiceData } from "@/platform/db/invoice-pdf";

const data: InvoiceData = {
  number: "FV-0412",
  date: "2026-11-13",
  providerName: "Droguería Veterinaria El Arrayán",
  providerCity: "Villavicencio",
  ngoName: "Refugio Alas Libres",
  ngoNit: "900.000.101-1",
  caseCode: "POW_001",
  stageName: "Medicamento para el ala",
  concept: "Antiinflamatorio, antibiótico y vendajes",
  amount: "40",
  assetCode: "USDC",
};

describe("factura de prueba en PDF", () => {
  const pdf = invoicePdf(data);
  const text = Buffer.from(pdf).toString("latin1");

  it("es un PDF con su tabla de referencias apuntando a cada objeto", () => {
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    const offsets = [...text.matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    expect(offsets).toHaveLength(5);
    offsets.forEach((offset, i) => expect(text.slice(offset, offset + 8)).toBe(`${i + 1} 0 obj\n`));
    const startxref = Number(/startxref\n(\d+)/.exec(text)?.[1]);
    expect(text.slice(startxref, startxref + 4)).toBe("xref");
  });

  it("dice que es un ejemplo sin valor fiscal y trae los datos del gasto, con tildes en Latin-1", () => {
    expect(text).toContain("DOCUMENTO DE EJEMPLO - SIN VALOR FISCAL");
    expect(text).toContain("Factura de venta FV-0412");
    expect(text).toContain("40 USDC");
    expect(text).toContain("Droguer\xeda Veterinaria El Array\xe1n");
  });

  it("es reproducible: los mismos datos dan el mismo hash", async () => {
    expect(await sha256Hex(invoicePdf(data))).toBe(await sha256Hex(pdf));
    expect(await sha256Hex(invoicePdf({ ...data, amount: "41" }))).not.toBe(await sha256Hex(pdf));
  });
});
