import { describe, expect, it } from "vitest";
import { sumAmounts, toStroops } from "@/lib/amount";
import {
  allocateContribution,
  currentStage,
  fundingProgress,
  isValidCaseCode,
  remainingToGoal,
  type StageFunding,
} from "@/modules/cases";
import { ValidationError } from "@/modules/shared/errors";
import {
  DEMO_CASES,
  DEMO_CONTRIBUTIONS,
  DEMO_LIVE_CONTRIBUTION,
  DEMO_NGOS,
} from "@/platform/db/demo-data";

const stages = (...costs: string[]): StageFunding[] =>
  costs.map((cost, i) => ({ position: i + 1, cost, covered: "0" }));

describe("código de caso", () => {
  it("usa el formato Symbol del contrato: POW_001", () => {
    expect(isValidCaseCode("POW_001")).toBe(true);
    expect(isValidCaseCode("POW-001")).toBe(false);
    expect(isValidCaseCode("POW_1")).toBe(false);
  });
});

describe("reparto de un aporte entre las etapas (como aportar del contrato)", () => {
  it("reproduce el ejemplo del brief: 40/30/50 con aportes de 50 y 30", () => {
    const s = stages("40", "30", "50");
    expect(allocateContribution(s, "50")).toEqual([
      { position: 1, amount: "40.0000000" },
      { position: 2, amount: "10.0000000" },
    ]);
    s[0]!.covered = "40";
    s[1]!.covered = "10";
    expect(allocateContribution(s, "30")).toEqual([
      { position: 2, amount: "20.0000000" },
      { position: 3, amount: "10.0000000" },
    ]);
  });

  it("rechaza aportes que superan lo que falta para la meta, o que no son positivos", () => {
    const s = stages("40", "30");
    expect(remainingToGoal(s)).toBe("70.0000000");
    expect(() => allocateContribution(s, "70.0000001")).toThrow(ValidationError);
    expect(() => allocateContribution(s, "0")).toThrow(ValidationError);
    expect(allocateContribution(s, "70")).toHaveLength(2);
  });

  it("respeta el orden por posición aunque las etapas lleguen desordenadas", () => {
    const s: StageFunding[] = [
      { position: 2, cost: "10", covered: "0" },
      { position: 1, cost: "10", covered: "4" },
    ];
    expect(allocateContribution(s, "8")).toEqual([
      { position: 1, amount: "6.0000000" },
      { position: 2, amount: "2.0000000" },
    ]);
  });
});

describe("datos de prueba de la demo", () => {
  /** Reproduce todos los aportes en orden y devuelve lo cubierto por etapa de cada caso. */
  function replay() {
    const covered = new Map(DEMO_CASES.map((c) => [c.code, c.stages.map(() => 0n)]));
    for (const contribution of [...DEMO_CONTRIBUTIONS, DEMO_LIVE_CONTRIBUTION]) {
      const demoCase = DEMO_CASES.find((c) => c.code === contribution.caseCode)!;
      const current = covered.get(contribution.caseCode)!;
      const funding = demoCase.stages.map((s, i) => ({
        position: i + 1,
        cost: s.cost,
        covered: (Number(current[i]) / 1e7).toString(),
      }));
      const allocation = allocateContribution(funding, contribution.amount);
      expect(allocation.map((a) => [a.position, Number(a.amount).toString()])).toEqual(contribution.expected);
      for (const a of allocation) current[a.position - 1]! += toStroops(a.amount);
    }
    return covered;
  }

  it("cada aporte se reparte como dice el documento", () => {
    replay();
  });

  it("los casos cerrados quedan cubiertos al 100 % y sus gastos suman el costo de cada etapa", () => {
    const covered = replay();
    for (const demoCase of DEMO_CASES.filter((c) => c.outcome)) {
      demoCase.stages.forEach((stage, i) => {
        expect(covered.get(demoCase.code)![i]).toBe(toStroops(stage.cost));
        expect(stage.expense?.amount).toBe(stage.cost);
      });
    }
  });

  it("cuadran los totales de cada ONG después de la demo (170/160 y 315/305)", () => {
    const expensesAfterDemo = (code: string) =>
      DEMO_CASES.find((c) => c.code === code)!.stages.flatMap((s) => (s.expense ? [s.expense.amount] : []));
    // El gasto de 40 USDC de la guacamaya se registra en vivo.
    const liveExpense: Record<string, string[]> = { POW_001: ["40"] };

    const totals = DEMO_NGOS.map((ngo) => {
      const codes = DEMO_CASES.filter((c) => c.ngo === ngo.key).map((c) => c.code);
      const received = sumAmounts(
        [...DEMO_CONTRIBUTIONS, DEMO_LIVE_CONTRIBUTION].filter((c) => codes.includes(c.caseCode)).map((c) => c.amount),
      );
      const spent = sumAmounts(codes.flatMap((code) => [...expensesAfterDemo(code), ...(liveExpense[code] ?? [])]));
      return [ngo.name, Number(received), Number(spent)];
    });
    expect(totals).toEqual([
      ["Refugio Alas Libres", 170, 160],
      ["Fundación Bosque Vivo", 315, 305],
    ]);
  });
});

describe("progreso y etapa actual", () => {
  it("calcula el porcentaje con un decimal y lo limita a 100", () => {
    expect(fundingProgress("150", "50")).toBe(33.3);
    expect(fundingProgress("80", "80")).toBe(100);
    expect(fundingProgress("100", "150")).toBe(100);
  });

  it("la etapa actual es la que está en curso; si no hay, la primera pendiente; si todo terminó, la última", () => {
    const s = (status: "pendiente" | "en_curso" | "completada", position: number) => ({ position, status });
    expect(currentStage([s("completada", 1), s("en_curso", 2), s("pendiente", 3)])?.position).toBe(2);
    expect(currentStage([s("completada", 1), s("pendiente", 2)])?.position).toBe(2);
    expect(currentStage([s("completada", 2), s("completada", 1)])?.position).toBe(2);
    expect(currentStage([])).toBeNull();
  });
});
