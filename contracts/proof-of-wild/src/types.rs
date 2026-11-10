use soroban_sdk::{contracterror, contracttype, Address, BytesN, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Config,
    /// Caso por su código, por ejemplo `POW_001`.
    Caso(Symbol),
    /// Hito de un caso por su índice (0, 1, 2…).
    Hito(Symbol, u32),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Config {
    pub admin: Address,
    /// Contrato del USDC de prueba (Stellar Asset Contract, SEP-41).
    pub token: Address,
}

/// Una etapa del tratamiento. Montos en unidades del token (7 decimales: 1 USDC = 10.000.000).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Etapa {
    pub costo: i128,
    /// Lo que ya aportaron los donantes a esta etapa.
    pub cubierto: i128,
    /// Lo que la ONG ya le pagó a proveedores desde esta etapa.
    pub gastado: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Caso {
    pub ong: Address,
    pub etapas: Vec<Etapa>,
    pub hitos: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RegistroHito {
    /// Etapa del hito, empezando en 1.
    pub etapa: u32,
    pub hash_evidencia: BytesN<32>,
}

/// Lo que devuelve `consultar_caso`: la ONG, cada etapa y los totales del caso.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ResumenCaso {
    pub ong: Address,
    pub etapas: Vec<Etapa>,
    pub meta: i128,
    pub recaudado: i128,
    pub gastado: i128,
    pub saldo: i128,
    pub hitos: u32,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    YaInicializado = 1,
    NoInicializado = 2,
    MontoInvalido = 3,
    CasoNoExiste = 4,
    CasoYaExiste = 5,
    EtapasInvalidas = 6,
    SuperaLaMeta = 7,
    NoEsLaOngDelCaso = 8,
    EtapaNoExiste = 9,
    FondosInsuficientes = 10,
    HitoNoExiste = 11,
}
