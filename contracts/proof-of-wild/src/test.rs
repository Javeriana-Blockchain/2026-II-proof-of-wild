#![cfg(test)]

extern crate std;

use super::*;
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation, MockAuth, MockAuthInvoke},
    token::{StellarAssetClient, TokenClient},
    vec, Address, BytesN, Env, IntoVal, Symbol, Vec,
};

/// 1 USDC de prueba = 10.000.000 unidades (7 decimales, como todos los activos de Stellar).
fn usdc(n: i128) -> i128 {
    n * 10_000_000
}

fn hash(env: &Env, b: u8) -> BytesN<32> {
    BytesN::from_array(env, &[b; 32])
}

fn costos(env: &Env, valores: &[i128]) -> Vec<i128> {
    let mut v = Vec::new(env);
    for c in valores {
        v.push_back(usdc(*c));
    }
    v
}

fn en_usdc(env: &Env, valores: &[i128]) -> Vec<i128> {
    costos(env, valores)
}

struct Setup<'a> {
    env: Env,
    client: ProofOfWildClient<'a>,
    token: TokenClient<'a>,
    sac: StellarAssetClient<'a>,
    admin: Address,
    ong: Address,
    donante: Address,
    proveedor: Address,
}

/// Contrato inicializado con el USDC de prueba, una ONG y la billetera de Ana con 100 USDC.
fn setup<'a>() -> Setup<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let ong = Address::generate(&env);
    let donante = Address::generate(&env);
    let proveedor = Address::generate(&env);

    let asset = env.register_stellar_asset_contract_v2(admin.clone());
    let sac = StellarAssetClient::new(&env, &asset.address());
    sac.mint(&donante, &usdc(100));
    let token = TokenClient::new(&env, &asset.address());

    let id = env.register(ProofOfWild, ());
    let client = ProofOfWildClient::new(&env, &id);
    client.inicializar(&admin, &asset.address());

    Setup { env, client, token, sac, admin, ong, donante, proveedor }
}

fn guacamaya(s: &Setup) -> Symbol {
    let caso = symbol_short!("POW_001");
    s.client.crear_caso(&caso, &s.ong, &costos(&s.env, &[40, 30, 50, 30]));
    caso
}

#[test]
fn flujo_de_la_demo_aporte_gasto_e_hito() {
    let s = setup();
    let caso = guacamaya(&s);
    assert_eq!(s.env.auths()[0].0, s.admin, "crear_caso exige la firma del administrador");

    // Ana aporta 50 USDC: cubre los 40 de la etapa 1 y 10 de la etapa 2.
    let reparto = s.client.aportar(&s.donante, &caso, &usdc(50));
    assert_eq!(s.env.auths()[0].0, s.donante, "aportar exige la firma del donante");
    assert_eq!(reparto, en_usdc(&s.env, &[40, 10, 0, 0]));
    assert_eq!(s.token.balance(&s.donante), usdc(50));
    assert_eq!(s.token.balance(&s.client.address), usdc(50));

    // La ONG paga la medicina: el contrato le transfiere al proveedor y guarda el hash de la factura.
    s.client
        .registrar_gasto(&s.ong, &caso, &1, &s.proveedor, &usdc(40), &hash(&s.env, 7));
    assert_eq!(s.env.auths()[0].0, s.ong, "registrar_gasto exige la firma de la ONG");
    assert_eq!(s.token.balance(&s.proveedor), usdc(40));
    assert_eq!(s.token.balance(&s.client.address), usdc(10));

    let i = s.client.registrar_hito(&s.ong, &caso, &1, &hash(&s.env, 9));
    assert_eq!(i, 0);
    assert_eq!(
        s.client.consultar_hito(&caso, &0),
        RegistroHito { etapa: 1, hash_evidencia: hash(&s.env, 9) }
    );

    let r = s.client.consultar_caso(&caso);
    assert_eq!(r.ong, s.ong);
    assert_eq!(r.etapas.get_unchecked(0), Etapa { costo: usdc(40), cubierto: usdc(40), gastado: usdc(40) });
    assert_eq!(r.etapas.get_unchecked(1), Etapa { costo: usdc(30), cubierto: usdc(10), gastado: 0 });
    assert_eq!((r.meta, r.recaudado, r.gastado, r.saldo, r.hitos), (usdc(150), usdc(50), usdc(40), usdc(10), 1));
}

#[test]
fn reparte_en_orden_como_el_ejemplo_del_brief() {
    let s = setup();
    let caso = symbol_short!("POW_009");
    s.client.crear_caso(&caso, &s.ong, &costos(&s.env, &[40, 30, 50]));
    assert_eq!(s.client.aportar(&s.donante, &caso, &usdc(50)), en_usdc(&s.env, &[40, 10, 0]));
    assert_eq!(s.client.aportar(&s.donante, &caso, &usdc(30)), en_usdc(&s.env, &[0, 20, 10]));
}

#[test]
fn rechaza_aportes_por_encima_de_lo_que_falta() {
    let s = setup();
    let caso = symbol_short!("POW_009");
    s.client.crear_caso(&caso, &s.ong, &costos(&s.env, &[40, 30]));
    assert_eq!(s.client.try_aportar(&s.donante, &caso, &(usdc(70) + 1)), Err(Ok(Error::SuperaLaMeta)));
    assert_eq!(s.token.balance(&s.donante), usdc(100));

    s.client.aportar(&s.donante, &caso, &usdc(70));
    assert_eq!(s.client.try_aportar(&s.donante, &caso, &1), Err(Ok(Error::SuperaLaMeta)));
}

#[test]
fn rechaza_montos_no_positivos() {
    let s = setup();
    let caso = guacamaya(&s);
    assert_eq!(s.client.try_aportar(&s.donante, &caso, &0), Err(Ok(Error::MontoInvalido)));
    assert_eq!(s.client.try_aportar(&s.donante, &caso, &-5), Err(Ok(Error::MontoInvalido)));
    assert_eq!(
        s.client.try_registrar_gasto(&s.ong, &caso, &1, &s.proveedor, &0, &hash(&s.env, 1)),
        Err(Ok(Error::MontoInvalido))
    );
}

#[test]
fn solo_la_ong_del_caso_registra_gastos_e_hitos() {
    let s = setup();
    let caso = guacamaya(&s);
    s.client.aportar(&s.donante, &caso, &usdc(50));
    let otra = Address::generate(&s.env);
    assert_eq!(
        s.client.try_registrar_gasto(&otra, &caso, &1, &otra, &usdc(10), &hash(&s.env, 1)),
        Err(Ok(Error::NoEsLaOngDelCaso))
    );
    assert_eq!(
        s.client.try_registrar_hito(&otra, &caso, &1, &hash(&s.env, 1)),
        Err(Ok(Error::NoEsLaOngDelCaso))
    );
    assert_eq!(s.token.balance(&otra), 0);
}

#[test]
fn una_etapa_no_gasta_mas_de_lo_cubierto_y_sin_gastar() {
    let s = setup();
    let caso = guacamaya(&s);
    s.client.aportar(&s.donante, &caso, &usdc(50)); // etapa 1: 40, etapa 2: 10

    // El contrato tiene 50, pero la etapa 2 solo tiene 10: el dinero de la etapa 1 no se usa en la 2.
    assert_eq!(
        s.client.try_registrar_gasto(&s.ong, &caso, &2, &s.proveedor, &usdc(11), &hash(&s.env, 1)),
        Err(Ok(Error::FondosInsuficientes))
    );
    assert_eq!(
        s.client.try_registrar_gasto(&s.ong, &caso, &3, &s.proveedor, &1, &hash(&s.env, 1)),
        Err(Ok(Error::FondosInsuficientes))
    );

    s.client.registrar_gasto(&s.ong, &caso, &1, &s.proveedor, &usdc(30), &hash(&s.env, 1));
    s.client.registrar_gasto(&s.ong, &caso, &1, &s.proveedor, &usdc(10), &hash(&s.env, 2));
    assert_eq!(
        s.client.try_registrar_gasto(&s.ong, &caso, &1, &s.proveedor, &1, &hash(&s.env, 3)),
        Err(Ok(Error::FondosInsuficientes))
    );
    assert_eq!(s.token.balance(&s.proveedor), usdc(40));
}

#[test]
fn rechaza_etapas_que_no_existen() {
    let s = setup();
    let caso = guacamaya(&s);
    s.client.aportar(&s.donante, &caso, &usdc(10));
    for etapa in [0u32, 5] {
        assert_eq!(
            s.client.try_registrar_gasto(&s.ong, &caso, &etapa, &s.proveedor, &1, &hash(&s.env, 1)),
            Err(Ok(Error::EtapaNoExiste))
        );
        assert_eq!(
            s.client.try_registrar_hito(&s.ong, &caso, &etapa, &hash(&s.env, 1)),
            Err(Ok(Error::EtapaNoExiste))
        );
    }
}

#[test]
fn valida_los_casos_al_crearlos() {
    let s = setup();
    let caso = guacamaya(&s);
    assert_eq!(
        s.client.try_crear_caso(&caso, &s.ong, &costos(&s.env, &[10])),
        Err(Ok(Error::CasoYaExiste))
    );
    let nuevo = symbol_short!("POW_010");
    assert_eq!(s.client.try_crear_caso(&nuevo, &s.ong, &vec![&s.env]), Err(Ok(Error::EtapasInvalidas)));
    assert_eq!(
        s.client.try_crear_caso(&nuevo, &s.ong, &costos(&s.env, &[10, 0])),
        Err(Ok(Error::EtapasInvalidas))
    );
}

#[test]
fn codigos_desconocidos_devuelven_errores() {
    let s = setup();
    let nada = symbol_short!("POW_404");
    assert_eq!(s.client.try_consultar_caso(&nada), Err(Ok(Error::CasoNoExiste)));
    assert_eq!(s.client.try_aportar(&s.donante, &nada, &1), Err(Ok(Error::CasoNoExiste)));
    assert_eq!(s.client.try_consultar_hito(&nada, &0), Err(Ok(Error::HitoNoExiste)));
}

#[test]
fn no_se_inicializa_dos_veces_ni_se_usa_sin_inicializar() {
    let s = setup();
    let cfg = s.client.consultar_config();
    assert_eq!(s.client.try_inicializar(&cfg.admin, &cfg.token), Err(Ok(Error::YaInicializado)));

    let env = Env::default();
    env.mock_all_auths();
    let client = ProofOfWildClient::new(&env, &env.register(ProofOfWild, ()));
    let ong = Address::generate(&env);
    assert_eq!(
        client.try_crear_caso(&symbol_short!("POW_001"), &ong, &costos(&env, &[10])),
        Err(Ok(Error::NoInicializado))
    );
}

/// Los 13 aportes que carga el script de la demo, en su orden, con el reparto que trae el documento
/// «Datos de prueba» (la página lo comprueba igual en tests/modules/cases.test.ts).
#[test]
fn reparte_los_aportes_de_los_datos_de_prueba_como_dice_el_documento() {
    let s = setup();
    let casos: [(&str, [i128; 4]); 4] = [
        ("POW_005", [60, 70, 40, 30]),
        ("POW_004", [20, 35, 45, 20]),
        ("POW_003", [20, 25, 20, 15]),
        ("POW_002", [25, 35, 20, 10]),
    ];
    for (codigo, c) in casos.iter() {
        s.client.crear_caso(&Symbol::new(&s.env, codigo), &s.ong, &costos(&s.env, c));
    }

    let aportes: [(&str, i128, [i128; 4]); 13] = [
        ("POW_005", 80, [60, 20, 0, 0]),
        ("POW_005", 60, [0, 50, 10, 0]),
        ("POW_005", 40, [0, 0, 30, 10]),
        ("POW_005", 20, [0, 0, 0, 20]),
        ("POW_004", 50, [20, 30, 0, 0]),
        ("POW_004", 40, [0, 5, 35, 0]),
        ("POW_004", 30, [0, 0, 10, 20]),
        ("POW_003", 30, [20, 10, 0, 0]),
        ("POW_003", 25, [0, 15, 10, 0]),
        ("POW_003", 15, [0, 0, 10, 5]),
        ("POW_003", 10, [0, 0, 0, 10]),
        ("POW_002", 20, [20, 0, 0, 0]),
        ("POW_002", 15, [5, 10, 0, 0]),
    ];
    let donante = Address::generate(&s.env);
    s.sac.mint(&donante, &usdc(1_000));
    for (codigo, monto, esperado) in aportes.iter() {
        let reparto = s.client.aportar(&donante, &Symbol::new(&s.env, codigo), &usdc(*monto));
        assert_eq!(reparto, en_usdc(&s.env, esperado), "aporte de {} a {}", monto, codigo);
    }

    // Los casos cerrados quedan cubiertos al 100 % y la tortuga en 35 de 90.
    for codigo in ["POW_005", "POW_004", "POW_003"] {
        let r = s.client.consultar_caso(&Symbol::new(&s.env, codigo));
        assert_eq!(r.recaudado, r.meta);
    }
    assert_eq!(s.client.consultar_caso(&symbol_short!("POW_002")).recaudado, usdc(35));
}

// ---------------------------------------------------------------------------------------------------------
// Autorización con firmas concretas (`mock_auths`). Las pruebas de arriba usan `mock_all_auths()`, que da por
// buena cualquier firma; estas dicen exactamente quién firma qué y comprueban que otra firma no sirve.
// ---------------------------------------------------------------------------------------------------------

#[test]
fn aportar_solo_con_la_firma_del_donante() {
    let s = setup();
    let caso = guacamaya(&s);
    let monto = usdc(50);
    let contrato = s.client.address.clone();
    let token = s.token.address.clone();

    // Ni el administrador puede aportar con el dinero de Ana: su firma no reemplaza la de ella.
    s.env.mock_auths(&[MockAuth {
        address: &s.admin,
        invoke: &MockAuthInvoke {
            contract: &contrato,
            fn_name: "aportar",
            args: (&s.donante, &caso, monto).into_val(&s.env),
            sub_invokes: &[],
        },
    }]);
    assert!(s.client.try_aportar(&s.donante, &caso, &monto).is_err());
    assert_eq!(s.token.balance(&s.donante), usdc(100));

    // Ana firma el aporte y, dentro de él, la transferencia de su USDC al contrato.
    s.env.mock_auths(&[MockAuth {
        address: &s.donante,
        invoke: &MockAuthInvoke {
            contract: &contrato,
            fn_name: "aportar",
            args: (&s.donante, &caso, monto).into_val(&s.env),
            sub_invokes: &[MockAuthInvoke {
                contract: &token,
                fn_name: "transfer",
                args: (&s.donante, &contrato, monto).into_val(&s.env),
                sub_invokes: &[],
            }],
        },
    }]);
    s.client.aportar(&s.donante, &caso, &monto);

    // La red registró exactamente esa firma: el aporte de Ana y su transferencia, nada más.
    assert_eq!(
        s.env.auths(),
        std::vec![(
            s.donante.clone(),
            AuthorizedInvocation {
                function: AuthorizedFunction::Contract((
                    contrato.clone(),
                    Symbol::new(&s.env, "aportar"),
                    (&s.donante, &caso, monto).into_val(&s.env),
                )),
                sub_invocations: std::vec![AuthorizedInvocation {
                    function: AuthorizedFunction::Contract((
                        token.clone(),
                        Symbol::new(&s.env, "transfer"),
                        (&s.donante, &contrato, monto).into_val(&s.env),
                    )),
                    sub_invocations: std::vec![],
                }],
            }
        )]
    );
    assert_eq!(s.token.balance(&s.donante), usdc(50));
    assert_eq!(s.token.balance(&contrato), monto);
}

#[test]
fn registrar_gasto_solo_con_la_firma_de_la_ong_del_caso() {
    let s = setup();
    let caso = guacamaya(&s);
    s.client.aportar(&s.donante, &caso, &usdc(50));
    let factura = hash(&s.env, 7);
    let args: Vec<soroban_sdk::Val> = (&s.ong, &caso, 1u32, &s.proveedor, usdc(40), &factura).into_val(&s.env);

    // El proveedor no puede cobrarse solo: si firma él y no la ONG, el contrato no le paga.
    s.env.mock_auths(&[MockAuth {
        address: &s.proveedor,
        invoke: &MockAuthInvoke {
            contract: &s.client.address,
            fn_name: "registrar_gasto",
            args: args.clone(),
            sub_invokes: &[],
        },
    }]);
    assert!(s
        .client
        .try_registrar_gasto(&s.ong, &caso, &1, &s.proveedor, &usdc(40), &factura)
        .is_err());
    assert_eq!(s.token.balance(&s.proveedor), 0);

    // Con la firma de la ONG del caso, el contrato le paga al proveedor desde la etapa 1.
    s.env.mock_auths(&[MockAuth {
        address: &s.ong,
        invoke: &MockAuthInvoke {
            contract: &s.client.address,
            fn_name: "registrar_gasto",
            args,
            sub_invokes: &[],
        },
    }]);
    s.client.registrar_gasto(&s.ong, &caso, &1, &s.proveedor, &usdc(40), &factura);
    assert_eq!(s.env.auths().len(), 1);
    assert_eq!(s.env.auths()[0].0, s.ong);
    assert_eq!(s.token.balance(&s.proveedor), usdc(40));
}

#[test]
fn crear_caso_solo_con_la_firma_del_administrador() {
    let s = setup();
    let caso = symbol_short!("POW_011");
    let etapas = costos(&s.env, &[10, 20]);
    let args: Vec<soroban_sdk::Val> = (&caso, &s.ong, &etapas).into_val(&s.env);

    // Una ONG no puede crear sus propios casos.
    s.env.mock_auths(&[MockAuth {
        address: &s.ong,
        invoke: &MockAuthInvoke {
            contract: &s.client.address,
            fn_name: "crear_caso",
            args: args.clone(),
            sub_invokes: &[],
        },
    }]);
    assert!(s.client.try_crear_caso(&caso, &s.ong, &etapas).is_err());
    assert_eq!(s.client.try_consultar_caso(&caso), Err(Ok(Error::CasoNoExiste)));

    s.env.mock_auths(&[MockAuth {
        address: &s.admin,
        invoke: &MockAuthInvoke {
            contract: &s.client.address,
            fn_name: "crear_caso",
            args,
            sub_invokes: &[],
        },
    }]);
    s.client.crear_caso(&caso, &s.ong, &etapas);
    assert_eq!(s.env.auths()[0].0, s.admin);
    assert_eq!(s.client.consultar_caso(&caso).meta, usdc(30));
}
