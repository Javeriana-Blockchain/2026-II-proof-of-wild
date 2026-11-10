/**
 * Datos de la demo del 13 de noviembre, tal como vienen en «Proof of Wild — Datos de prueba».
 * Es la única fuente: la usan las semillas de la base de datos y el script que prepara la red.
 * Todo es ficticio. Las cuentas de Stellar se nombran con una clave corta (ONG_ALAS, PROV_ARRAYAN, DON_ANA…)
 * y las genera el script de preparación.
 *
 * Lo que el documento no trae y aquí se completa (se puede reemplazar sin tocar el código):
 * - Las fechas de gastos e hitos de los casos cerrados y los textos de esos hitos.
 * - El nombre corto de cada etapa para el chip y la categoría de los gastos de los casos cerrados.
 */

export type AccountKey = string;

export interface DemoNgo {
  key: AccountKey;
  slug: string;
  loginEmail: string;
  name: string;
  nit: string;
  kind: "centro_atencion" | "fundacion" | "ong";
  kindDetail: string;
  city: string;
  foundedYear: number;
  description: string;
  environmentalPermit: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  offersVolunteering: boolean;
  photoPath: string;
}

export interface DemoProvider {
  key: AccountKey;
  name: string;
  sells: string;
  city: string;
  ngos: AccountKey[];
}

export type ExpenseCategory =
  | "alimentacion"
  | "atencion_veterinaria"
  | "medicamentos"
  | "rehabilitacion"
  | "traslado_liberacion";

export interface DemoExpense {
  provider: AccountKey;
  amount: string;
  category: ExpenseCategory;
  invoiceNumber: string;
  concept?: string;
  validationLevel: "presentado" | "revisado";
  /** Fecha de la factura. Nula = la fecha en que corre el script. */
  occurredOn: string | null;
}

export interface DemoMilestone {
  description: string;
  validationLevel: "presentado" | "revisado";
  occurredOn: string | null;
  photoPath: string | null;
}

export interface DemoStage {
  name: string;
  shortName: string;
  covers: string;
  cost: string;
  status: "pendiente" | "en_curso" | "completada";
  expense?: DemoExpense;
  milestone?: DemoMilestone;
}

export interface DemoCase {
  code: string;
  ngo: AccountKey;
  commonName: string;
  scientificName: string;
  group: "ave" | "mamifero" | "reptil";
  shortStory: string;
  story: string;
  photoPath: string;
  intakeDate: string;
  outcome: null | { kind: "liberado" | "en_reserva"; label: string; date: string };
  stages: DemoStage[];
}

export interface DemoContribution {
  caseCode: string;
  donor: AccountKey;
  amount: string;
  /** Reparto esperado según el documento, para comprobar que el contrato (y la página) lo calculan igual. */
  expected: Array<[stage: number, amount: string]>;
}

export interface DemoVolunteering {
  ngo: AccountKey;
  title: string;
  date: string;
  schedule: string;
  city: string;
  tasks: string[];
  requirements: string[];
  capacity: number;
  preOccupied: number;
  photoPath: string;
}

export const DEMO_ADMIN_EMAIL = "admin@proofofwild.example";

export const DEMO_NGOS: DemoNgo[] = [
  {
    key: "ONG_ALAS",
    slug: "refugio-alas-libres",
    loginEmail: "contacto@alaslibres.example",
    name: "Refugio Alas Libres",
    nit: "900.000.101-1",
    kind: "fundacion",
    kindDetail: "centro de rehabilitación de aves",
    city: "Villavicencio, Meta",
    foundedYear: 2017,
    description: "Rehabilitamos aves rescatadas del tráfico ilegal en los Llanos hasta que pueden volver a volar.",
    environmentalPermit: "Permiso PA-0101 (ficticio)",
    contactName: "Laura Méndez, directora",
    contactEmail: "contacto@alaslibres.example",
    contactPhone: "+57 300 000 0101",
    offersVolunteering: true,
    photoPath: "/fotos/ong/refugio-alas-libres.webp",
  },
  {
    key: "ONG_BOSQUE",
    slug: "fundacion-bosque-vivo",
    loginEmail: "hola@bosquevivo.example",
    name: "Fundación Bosque Vivo",
    nit: "900.000.202-2",
    kind: "fundacion",
    kindDetail: "hogar de paso de fauna silvestre",
    city: "Fusagasugá, Cundinamarca",
    foundedYear: 2014,
    description:
      "Recibimos mamíferos y reptiles rescatados en Cundinamarca y los acompañamos hasta su liberación.",
    environmentalPermit: "Permiso PA-0202 (ficticio)",
    contactName: "Andrés Rojas, coordinador",
    contactEmail: "hola@bosquevivo.example",
    contactPhone: "+57 300 000 0202",
    offersVolunteering: true,
    photoPath: "/fotos/ong/fundacion-bosque-vivo.webp",
  },
];

export const DEMO_PROVIDERS: DemoProvider[] = [
  {
    key: "PROV_ARRAYAN",
    name: "Droguería Veterinaria El Arrayán",
    sells: "Medicamentos y vitaminas",
    city: "Villavicencio",
    ngos: ["ONG_ALAS"],
  },
  {
    key: "PROV_LLANOVERDE",
    name: "Clínica Veterinaria Llano Verde",
    sells: "Atención veterinaria",
    city: "Villavicencio",
    ngos: ["ONG_ALAS"],
  },
  {
    key: "PROV_SABANA",
    name: "Clínica Veterinaria Sabana",
    sells: "Atención veterinaria",
    city: "Fusagasugá",
    ngos: ["ONG_BOSQUE"],
  },
  {
    key: "PROV_COSECHA",
    name: "Agropecuaria La Cosecha",
    sells: "Alimentos",
    city: "Fusagasugá",
    ngos: ["ONG_BOSQUE"],
  },
  {
    key: "PROV_MALLAS",
    name: "Mallas y Recintos del Sumapaz",
    sells: "Mallas, perchas y materiales para recintos",
    city: "Fusagasugá",
    ngos: ["ONG_ALAS", "ONG_BOSQUE"],
  },
];

const revisado = (
  provider: AccountKey,
  amount: string,
  category: ExpenseCategory,
  invoiceNumber: string,
  occurredOn: string,
  concept?: string,
): DemoExpense => ({ provider, amount, category, invoiceNumber, concept, validationLevel: "revisado", occurredOn });

const hitoCerrado = (description: string, occurredOn: string): DemoMilestone => ({
  description,
  validationLevel: "revisado",
  occurredOn,
  photoPath: null,
});

export const DEMO_CASES: DemoCase[] = [
  {
    code: "POW_001",
    ngo: "ONG_ALAS",
    commonName: "Guacamaya roja",
    scientificName: "Ara macao",
    group: "ave",
    shortStory: "Llegó al centro con un ala rota.",
    story:
      "La decomisaron en un control de carretera, dentro de una caja de cartón, junto con otras aves que iban a ser vendidas. Llegó deshidratada y con el ala izquierda fracturada. El equipo veterinario le inmovilizó el ala y empezó el tratamiento.",
    photoPath: "/fotos/casos/pow_001-guacamaya-roja.webp",
    intakeDate: "2026-10-20",
    outcome: null,
    // Arranca en 0: el gasto de la etapa 1 y el hito se registran en vivo durante la demo.
    stages: [
      {
        name: "Medicamento para el ala",
        shortName: "Medicamento",
        covers: "Antiinflamatorio, antibiótico y vendajes",
        cost: "40",
        status: "completada",
      },
      {
        name: "Cuidados especiales y recinto adaptado",
        shortName: "Cuidados especiales",
        covers: "Dieta blanda y percha baja mientras sana el ala",
        cost: "30",
        status: "en_curso",
      },
      {
        name: "Rehabilitación de vuelo",
        shortName: "Rehabilitación de vuelo",
        covers: "Entrenamiento en un aviario grande",
        cost: "50",
        status: "pendiente",
      },
      {
        name: "Liberación y seguimiento",
        shortName: "Liberación",
        covers: "Traslado, liberación y monitoreo",
        cost: "30",
        status: "pendiente",
      },
    ],
  },
  {
    code: "POW_002",
    ngo: "ONG_BOSQUE",
    commonName: "Tortuga hicotea",
    scientificName: "Trachemys callirostris",
    group: "reptil",
    shortStory: "La tenían de mascota en un balde y llegó con el caparazón blando.",
    story:
      "Una familia la entregó después de tenerla dos años en un balde en el patio. Llegó con el caparazón blando por falta de sol y de una dieta adecuada. Ya le hicieron la valoración y ahora empieza la dieta con calcio y luz UV.",
    photoPath: "/fotos/casos/pow_002-tortuga-hicotea.webp",
    intakeDate: "2026-11-02",
    outcome: null,
    stages: [
      {
        name: "Valoración y exámenes",
        shortName: "Valoración",
        covers: "Revisión, radiografía y desparasitación",
        cost: "25",
        status: "completada",
        expense: {
          provider: "PROV_SABANA",
          amount: "25",
          category: "atencion_veterinaria",
          invoiceNumber: "FV-0388",
          validationLevel: "revisado",
          occurredOn: null,
        },
        milestone: {
          description: "Radiografía lista: no tiene fracturas, pero el caparazón está blando.",
          validationLevel: "presentado",
          occurredOn: null,
          photoPath: null,
        },
      },
      {
        name: "Dieta, calcio y luz UV",
        shortName: "Dieta y luz UV",
        covers: "Dieta con calcio y lámpara UV durante 6 semanas",
        cost: "35",
        status: "en_curso",
      },
      {
        name: "Recuperación en estanque",
        shortName: "Estanque",
        covers: "Estanque con agua limpia y asoleadero",
        cost: "20",
        status: "pendiente",
      },
      {
        name: "Liberación en humedal",
        shortName: "Liberación",
        covers: "Traslado y liberación",
        cost: "10",
        status: "pendiente",
      },
    ],
  },
  {
    code: "POW_003",
    ngo: "ONG_BOSQUE",
    commonName: "Zarigüeya común",
    scientificName: "Didelphis marsupialis",
    group: "mamifero",
    shortStory: "Llegó huérfana con dos meses, después de que atropellaran a su mamá.",
    story:
      "Unos vecinos la encontraron junto a su mamá, que había muerto atropellada en una vía rural. Tenía unos dos meses y todavía tomaba leche. Creció en el hogar de paso con poco contacto humano y, cuando aprendió a buscar comida sola, la liberaron en un bosque de la región.",
    photoPath: "/fotos/casos/pow_003-zarigueya-comun.webp",
    intakeDate: "2026-08-03",
    outcome: { kind: "liberado", label: "Liberada", date: "2026-10-25" },
    stages: [
      {
        name: "Leche especial y calor",
        shortName: "Leche y calor",
        covers: "Leche especial para crías y fuente de calor",
        cost: "20",
        status: "completada",
        expense: revisado("PROV_COSECHA", "20", "alimentacion", "FV-0201", "2026-08-05"),
        milestone: hitoCerrado("Recibe leche especial cada tres horas y gana peso.", "2026-08-10"),
      },
      {
        name: "Alimentación y crecimiento",
        shortName: "Alimentación",
        covers: "Paso a alimento sólido mientras crece",
        cost: "25",
        status: "completada",
        expense: revisado("PROV_COSECHA", "25", "alimentacion", "FV-0233", "2026-09-01"),
        milestone: hitoCerrado("Ya come alimento sólido y duplicó su peso.", "2026-09-05"),
      },
      {
        name: "Entrenamiento en recinto exterior",
        shortName: "Recinto exterior",
        covers: "Recinto exterior para aprender a buscar comida",
        cost: "20",
        status: "completada",
        expense: revisado("PROV_MALLAS", "20", "rehabilitacion", "FV-0270", "2026-09-28"),
        milestone: hitoCerrado("Busca comida sola en el recinto exterior.", "2026-10-10"),
      },
      {
        name: "Liberación",
        shortName: "Liberación",
        covers: "Revisión final y liberación en un bosque de la región",
        cost: "15",
        status: "completada",
        expense: revisado("PROV_SABANA", "15", "atencion_veterinaria", "FV-0305", "2026-10-22", "Revisión final"),
        milestone: hitoCerrado("Liberada en un bosque de la región.", "2026-10-25"),
      },
    ],
  },
  {
    code: "POW_004",
    ngo: "ONG_ALAS",
    commonName: "Loro real",
    scientificName: "Amazona ochrocephala",
    group: "ave",
    shortStory: "Vivía en una jaula pequeña y no sabía volar.",
    story:
      "Lo entregaron a la autoridad ambiental después de años en una jaula donde no podía abrir las alas. Llegó con las plumas cortadas y los músculos del vuelo débiles. Cuando le crecieron las plumas, entrenó en el aviario y voló junto a otros loros.",
    photoPath: "/fotos/casos/pow_004-loro-real.webp",
    intakeDate: "2026-06-12",
    outcome: { kind: "liberado", label: "Liberado", date: "2026-09-30" },
    stages: [
      {
        name: "Valoración y desparasitación",
        shortName: "Valoración",
        covers: "Revisión veterinaria y desparasitación",
        cost: "20",
        status: "completada",
        expense: revisado("PROV_LLANOVERDE", "20", "atencion_veterinaria", "FV-0150", "2026-06-14"),
        milestone: hitoCerrado("Valoración completa y desparasitado.", "2026-06-15"),
      },
      {
        name: "Dieta con vitaminas y recinto",
        shortName: "Dieta y recinto",
        covers: "Vitaminas para el plumaje y recinto de recuperación",
        cost: "35",
        status: "completada",
        expense: revisado("PROV_ARRAYAN", "35", "medicamentos", "FV-0177", "2026-07-10"),
        milestone: hitoCerrado("Le están creciendo las plumas de vuelo.", "2026-07-25"),
      },
      {
        name: "Entrenamiento de vuelo",
        shortName: "Entrenamiento de vuelo",
        covers: "Malla y perchas del aviario",
        cost: "45",
        status: "completada",
        expense: revisado("PROV_MALLAS", "45", "rehabilitacion", "FV-0196", "2026-08-12", "Malla y perchas del aviario"),
        milestone: hitoCerrado("Vuela de lado a lado del aviario con otros loros.", "2026-09-05"),
      },
      {
        name: "Liberación y seguimiento",
        shortName: "Liberación",
        covers: "Revisión antes de liberar, liberación y monitoreo",
        cost: "20",
        status: "completada",
        expense: revisado(
          "PROV_LLANOVERDE",
          "20",
          "atencion_veterinaria",
          "FV-0219",
          "2026-09-25",
          "Revisión antes de liberar",
        ),
        milestone: hitoCerrado("Liberado junto a otros loros.", "2026-09-30"),
      },
    ],
  },
  {
    code: "POW_005",
    ngo: "ONG_BOSQUE",
    commonName: "Perezoso de dos dedos",
    scientificName: "Choloepus hoffmanni",
    group: "mamifero",
    shortStory: "Lo rescataron de un vendedor en la carretera y hoy vive en una reserva.",
    story:
      "Lo ofrecían a turistas en una carretera, amarrado a un palo. Lo decomisaron y llegó con desnutrición y deshidratación. Recuperó peso, pero pasó tanto tiempo en manos de personas que no aprendió a valerse solo en el bosque. Por eso no pudo ser liberado y ahora vive en la reserva de la fundación, en un bosque cercado.",
    photoPath: "/fotos/casos/pow_005-perezoso-de-dos-dedos.webp",
    intakeDate: "2026-05-15",
    outcome: { kind: "en_reserva", label: "En reserva", date: "2026-10-10" },
    stages: [
      {
        name: "Tratamiento de la desnutrición",
        shortName: "Desnutrición",
        covers: "Hidratación, dieta de recuperación y controles",
        cost: "60",
        status: "completada",
        expense: revisado("PROV_SABANA", "60", "atencion_veterinaria", "FV-0122", "2026-05-18"),
        milestone: hitoCerrado("Está hidratado y empezó a recuperar peso.", "2026-06-01"),
      },
      {
        name: "Recinto con árboles",
        shortName: "Recinto con árboles",
        covers: "Recinto con árboles para trepar",
        cost: "70",
        status: "completada",
        expense: revisado("PROV_MALLAS", "70", "rehabilitacion", "FV-0160", "2026-06-20"),
        milestone: hitoCerrado("Ya trepa y descansa en los árboles del recinto.", "2026-07-10"),
      },
      {
        name: "Adaptación y alimentación",
        shortName: "Adaptación",
        covers: "Hojas y frutas de su dieta silvestre",
        cost: "40",
        status: "completada",
        expense: revisado("PROV_COSECHA", "40", "alimentacion", "FV-0241", "2026-08-20"),
        milestone: hitoCerrado("Come hojas de su dieta silvestre, pero no se vale solo en el bosque.", "2026-09-15"),
      },
      {
        name: "Traslado a la reserva",
        shortName: "Traslado a la reserva",
        covers: "Revisión antes del traslado y traslado a la reserva",
        cost: "30",
        status: "completada",
        expense: revisado(
          "PROV_SABANA",
          "30",
          "atencion_veterinaria",
          "FV-0290",
          "2026-10-05",
          "Revisión antes del traslado",
        ),
        milestone: hitoCerrado("Vive en la reserva de la fundación, en un bosque cercado.", "2026-10-10"),
      },
    ],
  },
];

/** Alias públicos de los donantes. Sin alias se muestra la dirección abreviada (G…). */
export const DEMO_DONORS: Record<AccountKey, string | null> = {
  DON_ANA: "Ana M.",
  DON_VALENTINA: "Valentina C.",
  DON_LAURA: "Laura G.",
  DON_MATEO: "Mateo V.",
  DON_ANONIMO: null,
  DON_DANIEL: "Daniel P.",
  DON_SOFIA: "Sofía T.",
  DON_CAMILA: "Camila R.",
};

/** USDC de prueba con que el script fondea la billetera de Ana para su aporte en vivo. */
export const DEMO_ANA_BALANCE = "100";

/** Aportes que carga el script, en este orden (el orden cambia el reparto). El de Ana se hace en vivo. */
export const DEMO_CONTRIBUTIONS: DemoContribution[] = [
  { caseCode: "POW_005", donor: "DON_VALENTINA", amount: "80", expected: [[1, "60"], [2, "20"]] },
  { caseCode: "POW_005", donor: "DON_LAURA", amount: "60", expected: [[2, "50"], [3, "10"]] },
  { caseCode: "POW_005", donor: "DON_MATEO", amount: "40", expected: [[3, "30"], [4, "10"]] },
  { caseCode: "POW_005", donor: "DON_ANONIMO", amount: "20", expected: [[4, "20"]] },
  { caseCode: "POW_004", donor: "DON_MATEO", amount: "50", expected: [[1, "20"], [2, "30"]] },
  { caseCode: "POW_004", donor: "DON_DANIEL", amount: "40", expected: [[2, "5"], [3, "35"]] },
  { caseCode: "POW_004", donor: "DON_ANONIMO", amount: "30", expected: [[3, "10"], [4, "20"]] },
  { caseCode: "POW_003", donor: "DON_DANIEL", amount: "30", expected: [[1, "20"], [2, "10"]] },
  { caseCode: "POW_003", donor: "DON_LAURA", amount: "25", expected: [[2, "15"], [3, "10"]] },
  { caseCode: "POW_003", donor: "DON_ANONIMO", amount: "15", expected: [[3, "10"], [4, "5"]] },
  { caseCode: "POW_003", donor: "DON_SOFIA", amount: "10", expected: [[4, "10"]] },
  { caseCode: "POW_002", donor: "DON_CAMILA", amount: "20", expected: [[1, "20"]] },
  { caseCode: "POW_002", donor: "DON_ANONIMO", amount: "15", expected: [[1, "5"], [2, "10"]] },
];

/** El aporte que Ana hace en vivo durante la demo (no lo carga el script). */
export const DEMO_LIVE_CONTRIBUTION: DemoContribution = {
  caseCode: "POW_001",
  donor: "DON_ANA",
  amount: "50",
  expected: [[1, "40"], [2, "10"]],
};

export const DEMO_VOLUNTEERINGS: DemoVolunteering[] = [
  {
    ngo: "ONG_BOSQUE",
    title: "Jornada de cuidado del refugio",
    date: "2026-12-13",
    schedule: "8:00 a. m. a 1:00 p. m.",
    city: "Fusagasugá",
    tasks: [
      "Limpiar las áreas de descanso de los animales",
      "Organizar los medicamentos",
      "Preparar los alimentos",
      "Reacomodar los hábitats temporales",
    ],
    requirements: ["Mayor de edad", "Ropa cómoda", "Zapatos cerrados"],
    capacity: 12,
    preOccupied: 8,
    photoPath: "/fotos/ong/fundacion-bosque-vivo.webp",
  },
  {
    ngo: "ONG_ALAS",
    title: "Mantenimiento de aviarios",
    date: "2027-01-17",
    schedule: "8:00 a. m. a 12:00 m.",
    city: "Villavicencio",
    tasks: [
      "Limpiar y desinfectar comederos",
      "Cortar fruta para la dieta de las aves",
      "Arreglar perchas en aviarios vacíos",
    ],
    requirements: ["Mayor de edad", "Zapatos cerrados", "Gorra"],
    capacity: 10,
    preOccupied: 3,
    photoPath: "/fotos/ong/refugio-alas-libres.webp",
  },
];
