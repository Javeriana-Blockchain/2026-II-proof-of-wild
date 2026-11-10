#![no_std]

//! Contrato Proof of Wild (MVP). Amplía el contrato RaizSilvestre de la semana 3 con lo que pide el brief:
//! cada caso tiene etapas con su costo; `aportar` reparte el aporte entre las etapas en orden y rechaza lo
//! que supere la meta; `registrar_gasto` le paga al proveedor desde los fondos cubiertos y sin gastar de una
//! etapa y guarda el hash de la factura; `registrar_hito` deja en la red el hash de la evidencia.
//! La firma doble (ONG y validador) para los gastos queda para la etapa 2.

mod types;

#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractevent, contractimpl, token, Address, BytesN, Env, Symbol, Vec};
pub use types::{Caso, Config, DataKey, Error, Etapa, RegistroHito, ResumenCaso};

const DAY_LEDGERS: u32 = 17_280;
const TTL_THRESHOLD: u32 = 30 * DAY_LEDGERS;
const TTL_EXTEND_TO: u32 = 90 * DAY_LEDGERS;

/// Evento `caso_creado`.
#[contractevent]
pub struct CasoCreado {
    #[topic]
    pub caso: Symbol,
    pub ong: Address,
    pub costos_etapas: Vec<i128>,
}

/// Evento `aporte`: `reparto` trae lo que el aporte asignó a cada etapa, en orden (una posición por etapa).
#[contractevent]
pub struct Aporte {
    #[topic]
    pub caso: Symbol,
    #[topic]
    pub donante: Address,
    pub monto: i128,
    pub reparto: Vec<i128>,
}

/// Evento `gasto`: el pago al proveedor desde una etapa (empezando en 1) con el hash de la factura.
#[contractevent]
pub struct Gasto {
    #[topic]
    pub caso: Symbol,
    pub etapa: u32,
    pub proveedor: Address,
    pub monto: i128,
    pub hash_factura: BytesN<32>,
}

/// Evento `hito`: el hash de la foto o del documento de un avance del tratamiento.
#[contractevent]
pub struct Hito {
    #[topic]
    pub caso: Symbol,
    pub etapa: u32,
    pub indice: u32,
    pub hash_evidencia: BytesN<32>,
}

#[contract]
pub struct ProofOfWild;

#[contractimpl]
impl ProofOfWild {
    /// Configuración inicial, una sola vez: la cuenta administradora y el contrato del USDC de prueba.
    pub fn inicializar(env: Env, admin: Address, token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Config) {
            return Err(Error::YaInicializado);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Config, &Config { admin, token });
        bump_instance(&env);
        Ok(())
    }

    /// El administrador registra un caso, la cuenta de su ONG y el costo de cada etapa, en orden.
    pub fn crear_caso(env: Env, caso: Symbol, ong: Address, costos_etapas: Vec<i128>) -> Result<(), Error> {
        let cfg = config(&env)?;
        cfg.admin.require_auth();
        if env.storage().persistent().has(&DataKey::Caso(caso.clone())) {
            return Err(Error::CasoYaExiste);
        }
        if costos_etapas.is_empty() {
            return Err(Error::EtapasInvalidas);
        }
        let mut etapas = Vec::new(&env);
        for costo in costos_etapas.iter() {
            if costo <= 0 {
                return Err(Error::EtapasInvalidas);
            }
            etapas.push_back(Etapa { costo, cubierto: 0, gastado: 0 });
        }
        guardar_caso(&env, &caso, &Caso { ong: ong.clone(), etapas, hitos: 0 });
        bump_instance(&env);
        CasoCreado { caso, ong, costos_etapas }.publish(&env);
        Ok(())
    }

    /// El donante transfiere USDC al contrato. El aporte llena la primera etapa que falte por cubrir y sigue
    /// con la siguiente. Se rechaza si supera lo que falta para la meta. Devuelve el reparto por etapa.
    pub fn aportar(env: Env, donante: Address, caso: Symbol, monto: i128) -> Result<Vec<i128>, Error> {
        donante.require_auth();
        if monto <= 0 {
            return Err(Error::MontoInvalido);
        }
        let cfg = config(&env)?;
        let mut datos = cargar_caso(&env, &caso)?;
        let faltante: i128 = datos.etapas.iter().map(|e| e.costo - e.cubierto).sum();
        if monto > faltante {
            return Err(Error::SuperaLaMeta);
        }

        token::Client::new(&env, &cfg.token).transfer(&donante, &env.current_contract_address(), &monto);

        let mut restante = monto;
        let mut reparto = Vec::new(&env);
        let mut etapas = Vec::new(&env);
        for mut etapa in datos.etapas.iter() {
            let falta = etapa.costo - etapa.cubierto;
            let toma = if restante < falta { restante } else { falta };
            etapa.cubierto += toma;
            restante -= toma;
            reparto.push_back(toma);
            etapas.push_back(etapa);
        }
        datos.etapas = etapas;
        guardar_caso(&env, &caso, &datos);
        bump_instance(&env);
        Aporte { caso, donante, monto, reparto: reparto.clone() }.publish(&env);
        Ok(reparto)
    }

    /// La ONG del caso le paga a un proveedor desde una etapa (empezando en 1) y guarda el hash de la
    /// factura. La etapa no puede gastar más de lo que tiene cubierto y sin gastar: así el dinero de cada
    /// etapa solo se usa en esa etapa.
    pub fn registrar_gasto(
        env: Env,
        ong: Address,
        caso: Symbol,
        etapa: u32,
        proveedor: Address,
        monto: i128,
        hash_factura: BytesN<32>,
    ) -> Result<(), Error> {
        ong.require_auth();
        if monto <= 0 {
            return Err(Error::MontoInvalido);
        }
        let cfg = config(&env)?;
        let mut datos = cargar_caso(&env, &caso)?;
        if datos.ong != ong {
            return Err(Error::NoEsLaOngDelCaso);
        }
        let i = indice_etapa(&datos, etapa)?;
        let mut e = datos.etapas.get_unchecked(i);
        if monto > e.cubierto - e.gastado {
            return Err(Error::FondosInsuficientes);
        }
        e.gastado += monto;
        datos.etapas.set(i, e);
        guardar_caso(&env, &caso, &datos);

        token::Client::new(&env, &cfg.token).transfer(&env.current_contract_address(), &proveedor, &monto);
        bump_instance(&env);
        Gasto { caso, etapa, proveedor, monto, hash_factura }.publish(&env);
        Ok(())
    }

    /// La ONG del caso deja en la red el hash de la foto o del documento de un hito. Devuelve su índice.
    pub fn registrar_hito(
        env: Env,
        ong: Address,
        caso: Symbol,
        etapa: u32,
        hash_evidencia: BytesN<32>,
    ) -> Result<u32, Error> {
        ong.require_auth();
        let mut datos = cargar_caso(&env, &caso)?;
        if datos.ong != ong {
            return Err(Error::NoEsLaOngDelCaso);
        }
        indice_etapa(&datos, etapa)?;

        let indice = datos.hitos;
        datos.hitos += 1;
        let key = DataKey::Hito(caso.clone(), indice);
        env.storage().persistent().set(
            &key,
            &RegistroHito { etapa, hash_evidencia: hash_evidencia.clone() },
        );
        bump_persistent(&env, &key);
        guardar_caso(&env, &caso, &datos);
        bump_instance(&env);
        Hito { caso, etapa, indice, hash_evidencia }.publish(&env);
        Ok(indice)
    }

    /// Cualquiera, sin firma: la ONG, el costo, lo cubierto y lo gastado de cada etapa, y el saldo del caso.
    pub fn consultar_caso(env: Env, caso: Symbol) -> Result<ResumenCaso, Error> {
        let datos = cargar_caso(&env, &caso)?;
        let (mut meta, mut recaudado, mut gastado) = (0i128, 0i128, 0i128);
        for e in datos.etapas.iter() {
            meta += e.costo;
            recaudado += e.cubierto;
            gastado += e.gastado;
        }
        Ok(ResumenCaso {
            ong: datos.ong,
            etapas: datos.etapas,
            meta,
            recaudado,
            gastado,
            saldo: recaudado - gastado,
            hitos: datos.hitos,
        })
    }

    pub fn consultar_hito(env: Env, caso: Symbol, indice: u32) -> Result<RegistroHito, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Hito(caso, indice))
            .ok_or(Error::HitoNoExiste)
    }

    pub fn consultar_config(env: Env) -> Result<Config, Error> {
        config(&env)
    }
}

fn config(env: &Env) -> Result<Config, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Config)
        .ok_or(Error::NoInicializado)
}

/// Convierte la etapa (empezando en 1) en el índice del vector.
fn indice_etapa(datos: &Caso, etapa: u32) -> Result<u32, Error> {
    if etapa == 0 || etapa > datos.etapas.len() {
        return Err(Error::EtapaNoExiste);
    }
    Ok(etapa - 1)
}

fn cargar_caso(env: &Env, caso: &Symbol) -> Result<Caso, Error> {
    let key = DataKey::Caso(caso.clone());
    let datos = env.storage().persistent().get(&key).ok_or(Error::CasoNoExiste)?;
    bump_persistent(env, &key);
    Ok(datos)
}

fn guardar_caso(env: &Env, caso: &Symbol, datos: &Caso) {
    let key = DataKey::Caso(caso.clone());
    env.storage().persistent().set(&key, datos);
    bump_persistent(env, &key);
}

fn bump_instance(env: &Env) {
    env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
}

fn bump_persistent(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, TTL_THRESHOLD, TTL_EXTEND_TO);
}
