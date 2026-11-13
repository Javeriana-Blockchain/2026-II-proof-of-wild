/**
 * Textos del área «errores»: los mensajes que el dominio (`src/modules`) y los adaptadores (`src/platform`) lanzan en
 * español y que pueden llegar a la persona, más los de las rutas de API. `es` es la fuente y debe ser IDÉNTICO al
 * mensaje original: `traducirError` (src/i18n/errores.ts) invierte este diccionario para reconocerlo. Los mensajes
 * con datos usan `{nombre}` donde el original interpola un valor. `en` y `pt` (Brasil) los traducen y el compilador
 * avisa si falta o sobra alguna clave. Las claves empiezan por «errores.».
 *
 * No se traducen: Proof of Wild, Stellar, Friendbot, USDC, testnet ni la Registraduría.
 */
const es = {
  // ── Aportes (modules/contributions, modules/cases, api/_lib/donante) ──
  "errores.aporte.mayorQueCero": "El aporte debe ser mayor que cero.",
  "errores.aporte.superaLoQueFalta": "El aporte supera lo que falta para el tratamiento.",
  "errores.aporte.billeteraInvalida": "La billetera no es una cuenta Stellar válida.",
  "errores.aporte.noEsAporte": "La transacción no es un aporte.",
  "errores.aporte.mismaBilletera": "El aporte debe firmarlo la misma billetera que aporta.",
  "errores.aporte.hashInvalido": "El hash de la transacción no es válido.",
  "errores.aporte.noEncontrado": "No encontramos ese aporte.",
  "errores.aporte.noCoincide": "La transacción de la red no coincide con el aporte guardado.",
  "errores.aporte.casoCerrado": "Este caso ya no recibe aportes.",
  "errores.aporte.iniciarSesion": "Inicia sesión o crea tu cuenta para apadrinar.",
  "errores.aporte.cuentaPersona": "Para apadrinar, entra con una cuenta de persona.",
  "errores.aporte.verificarIdentidad":
    "Para aportes de más de {limite} USDC verifica tu identidad. Toma unos dos minutos.",
  "errores.aporte.sinSaldo": "Tu billetera no tiene suficiente USDC de prueba para este aporte.",
  "errores.aporte.sinLineaConfianza": "Tu billetera no tiene la línea de confianza del USDC de prueba.",

  // ── Montos (servicios y lib/amount) ──
  "errores.monto.formato": "Escribe un monto mayor que cero, con hasta 7 decimales.",
  "errores.monto.mayorQueCero": "El monto debe ser mayor que cero.",
  "errores.monto.invalido": 'Monto inválido: "{monto}". Usa un decimal positivo con hasta 7 decimales.',
  "errores.monto.negativo": "Los montos negativos no son válidos.",

  // ── Casos y etapas ──
  "errores.caso.noExiste": "No existe ese caso.",
  "errores.caso.noEsDeTuOng": "Ese caso no es de tu ONG.",
  "errores.caso.noRegistrado": "Ese caso no está registrado en el contrato.",
  "errores.etapa.elegir": "Elige una etapa del caso.",
  "errores.etapa.noExiste": "Esa etapa no existe en el caso.",
  "errores.etapa.sinFondos": "La etapa no tiene fondos cubiertos y sin gastar suficientes para ese gasto.",
  "errores.etapa.disponible": "La etapa {etapa} solo tiene {monto} USDC cubiertos y sin gastar.",

  // ── Gastos e hitos del portal de la ONG (modules/records, api/portal) ──
  "errores.registro.proveedor": "Elige un proveedor que trabaje con tu ONG.",
  "errores.registro.categoria": "Elige la categoría del gasto.",
  "errores.registro.numeroFactura": "Escribe el número de la factura.",
  "errores.registro.facturaObligatoria": "La factura es obligatoria: súbela en PDF o imagen.",
  "errores.registro.descripcion": "Escribe una descripción corta del avance (de 5 a 280 caracteres).",
  "errores.registro.fechaInvalida": "Escribe una fecha válida.",
  "errores.registro.fechaFutura": "La fecha no puede ser futura.",
  "errores.registro.firmaOng": "Firma con la billetera de la ONG registrada en Proof of Wild.",
  "errores.registro.noCoincide": "La transacción firmada no coincide con lo que registraste. Vuelve a empezar.",
  "errores.registro.yaEnviado": "Este registro ya se envió con otra transacción.",
  "errores.registro.noEncontrado": "No encontramos ese registro.",
  "errores.registro.formulario": "El formulario no es válido o el archivo supera 4 MB.",

  // ── Permisos ──
  "errores.permiso.general": "No tienes permiso para realizar esta operación.",
  "errores.permiso.soloOngDelCaso": "Solo la ONG del caso puede registrar sus gastos e hitos.",
  "errores.permiso.cuentaOng": "Ingresa con la cuenta de tu ONG.",
  "errores.permiso.ongNoAprobada": "Tu ONG todavía no está aprobada para registrar gastos e hitos.",
  "errores.permiso.noEsLaOng": "Esa cuenta no es la de la ONG del caso.",

  // ── Red de Stellar y contrato (platform/stellar) ──
  "errores.red.noRespondio": "La red de Stellar no respondió. Inténtalo de nuevo en unos segundos.",
  "errores.red.cuentaNoExiste": "Esa cuenta no existe en testnet. Fondéala con Friendbot y vuelve a intentarlo.",
  "errores.red.noAcepto": "La red no aceptó la operación. Revisa los datos e inténtalo de nuevo.",
  "errores.red.firmaIncorrecta": "La firma no corresponde a la cuenta esperada. Conecta la billetera correcta.",
  "errores.red.rechazada": "La red rechazó la transacción ({codigo}).",
  "errores.red.fallo": "La transacción falló en la red.",
  "errores.red.envueltaAjena": "Transacción envuelta: no es de la página.",
  "errores.red.envueltasNo": "No se aceptan transacciones envueltas.",
  "errores.red.firmadaInvalida": "La transacción firmada no es válida.",
  "errores.red.noEsDelContrato": "La transacción no es una llamada al contrato.",
  "errores.red.otroContrato": "La transacción no es para el contrato de Proof of Wild.",
  "errores.red.funcionNoAceptada": "La función «{funcion}» no se acepta desde la página.",

  // ── Verificar identidad (modules/identity, platform/identity) ──
  "errores.identidad.cedula": "La cédula debe tener entre 6 y 10 dígitos.",
  "errores.identidad.pasaporte": "El pasaporte debe tener entre 6 y 9 letras o números.",
  "errores.identidad.pruebaDeVida": "Falta completar la prueba de vida: parpadear y girar la cabeza.",
  "errores.identidad.rostroReal":
    "No pudimos confirmar que el rostro sea real. Usa tu cámara sin fotos ni pantallas delante.",
  "errores.identidad.rostroNoCoincide": "Tu rostro no coincide con la foto del documento. Inténtalo con más luz.",
  "errores.identidad.autorizacion":
    "Para verificar tu identidad necesitamos tu autorización para tratar datos sensibles.",
  "errores.identidad.documentoEnUso": "Este documento ya verificó otra cuenta.",
  "errores.identidad.noConfirmado": "El registro no confirmó tu documento.",
  "errores.identidad.noApareceCedula": "El documento no aparece en la Registraduría (simulado).",
  "errores.identidad.noAparecePasaporte": "El documento no aparece en el registro de pasaportes (simulado).",

  // ── Archivos (platform/storage, api/evidencias) ──
  "errores.archivo.tipo": "Tipo de archivo no permitido. Usa JPG, PNG, WebP o PDF.",
  "errores.archivo.vacio": "El archivo está vacío.",
  "errores.archivo.tamano": "El archivo supera el tamaño máximo de 4 MB.",
  "errores.archivo.evidenciaNoEncontrada": "Evidencia no encontrada.",

  // ── Cuenta (platform/auth) ──
  "errores.cuenta.correoEnUso": "Ya existe una cuenta con ese correo. Ingresa con tu contraseña.",
  "errores.cuenta.demasiadosIntentos": "Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.",
  "errores.cuenta.correoInvalido": "El correo no es válido.",
  "errores.cuenta.datosAutenticacion": "Datos de autenticación inválidos.",

  // ── Voluntariados (platform/db/repositories/volunteering) ──
  "errores.voluntariado.noExiste": "Ese voluntariado no existe.",
  "errores.voluntariado.sinCupos": "Esta jornada ya no tiene cupos.",
  "errores.voluntariado.yaInscrito": "Ya hay una inscripción con ese correo para esta jornada.",

  // ── Peticiones a la API (api/_lib/http) ──
  "errores.api.cuerpoJson": "El cuerpo de la petición debe ser JSON.",
  "errores.api.datosInvalidos": "Los datos enviados no son válidos.",
  "errores.api.interno": "Algo falló de nuestro lado. Inténtalo de nuevo.",
};

/** Solo el español, para `traducirError`: así el navegador no descarga las traducciones que no usa. */
export { es as erroresEs };

export const errores = {
  es,
  en: {
    "errores.aporte.mayorQueCero": "The contribution must be greater than zero.",
    "errores.aporte.superaLoQueFalta": "The contribution is more than what's still needed for the treatment.",
    "errores.aporte.billeteraInvalida": "The wallet isn't a valid Stellar account.",
    "errores.aporte.noEsAporte": "The transaction isn't a contribution.",
    "errores.aporte.mismaBilletera": "The contribution must be signed by the same wallet that's contributing.",
    "errores.aporte.hashInvalido": "The transaction hash isn't valid.",
    "errores.aporte.noEncontrado": "We couldn't find that contribution.",
    "errores.aporte.noCoincide": "The transaction on the network doesn't match the saved contribution.",
    "errores.aporte.casoCerrado": "This case is no longer accepting contributions.",
    "errores.aporte.iniciarSesion": "Sign in or create your account to sponsor.",
    "errores.aporte.cuentaPersona": "To sponsor, sign in with a personal account.",
    "errores.aporte.verificarIdentidad":
      "For contributions over {limite} USDC, verify your identity. It takes about two minutes.",
    "errores.aporte.sinSaldo": "Your wallet doesn't have enough test USDC for this contribution.",
    "errores.aporte.sinLineaConfianza": "Your wallet doesn't have a trustline for test USDC.",

    "errores.monto.formato": "Enter an amount greater than zero, with up to 7 decimal places.",
    "errores.monto.mayorQueCero": "The amount must be greater than zero.",
    "errores.monto.invalido": 'Invalid amount: "{monto}". Use a positive decimal with up to 7 decimal places.',
    "errores.monto.negativo": "Negative amounts aren't valid.",

    "errores.caso.noExiste": "That case doesn't exist.",
    "errores.caso.noEsDeTuOng": "That case doesn't belong to your NGO.",
    "errores.caso.noRegistrado": "That case isn't registered in the contract.",
    "errores.etapa.elegir": "Choose a stage of the case.",
    "errores.etapa.noExiste": "That stage doesn't exist in the case.",
    "errores.etapa.sinFondos": "The stage doesn't have enough covered, unspent funds for that expense.",
    "errores.etapa.disponible": "Stage {etapa} only has {monto} USDC covered and unspent.",

    "errores.registro.proveedor": "Choose a supplier that works with your NGO.",
    "errores.registro.categoria": "Choose the expense category.",
    "errores.registro.numeroFactura": "Enter the invoice number.",
    "errores.registro.facturaObligatoria": "The invoice is required: upload it as a PDF or an image.",
    "errores.registro.descripcion": "Write a short description of the progress (5 to 280 characters).",
    "errores.registro.fechaInvalida": "Enter a valid date.",
    "errores.registro.fechaFutura": "The date can't be in the future.",
    "errores.registro.firmaOng": "Sign with the NGO wallet registered in Proof of Wild.",
    "errores.registro.noCoincide": "The signed transaction doesn't match what you recorded. Start over.",
    "errores.registro.yaEnviado": "This record was already sent with a different transaction.",
    "errores.registro.noEncontrado": "We couldn't find that record.",
    "errores.registro.formulario": "The form isn't valid or the file is larger than 4 MB.",

    "errores.permiso.general": "You don't have permission to perform this operation.",
    "errores.permiso.soloOngDelCaso": "Only the case's NGO can record its expenses and milestones.",
    "errores.permiso.cuentaOng": "Sign in with your NGO's account.",
    "errores.permiso.ongNoAprobada": "Your NGO hasn't been approved to record expenses and milestones yet.",
    "errores.permiso.noEsLaOng": "That account isn't the account of the case's NGO.",

    "errores.red.noRespondio": "The Stellar network didn't respond. Try again in a few seconds.",
    "errores.red.cuentaNoExiste": "That account doesn't exist on testnet. Fund it with Friendbot and try again.",
    "errores.red.noAcepto": "The network didn't accept the operation. Check the details and try again.",
    "errores.red.firmaIncorrecta": "The signature doesn't match the expected account. Connect the correct wallet.",
    "errores.red.rechazada": "The network rejected the transaction ({codigo}).",
    "errores.red.fallo": "The transaction failed on the network.",
    "errores.red.envueltaAjena": "Wrapped transaction: it didn't come from this page.",
    "errores.red.envueltasNo": "Wrapped transactions aren't accepted.",
    "errores.red.firmadaInvalida": "The signed transaction isn't valid.",
    "errores.red.noEsDelContrato": "The transaction isn't a contract call.",
    "errores.red.otroContrato": "The transaction isn't for the Proof of Wild contract.",
    "errores.red.funcionNoAceptada": "The function “{funcion}” can't be called from the page.",

    "errores.identidad.cedula": "The ID card (cédula) number must have 6 to 10 digits.",
    "errores.identidad.pasaporte": "The passport number must have 6 to 9 letters or numbers.",
    "errores.identidad.pruebaDeVida": "The liveness check isn't finished: blink and turn your head.",
    "errores.identidad.rostroReal":
      "We couldn't confirm that the face is real. Use your camera with no photos or screens in front of it.",
    "errores.identidad.rostroNoCoincide": "Your face doesn't match the photo on the document. Try again with more light.",
    "errores.identidad.autorizacion": "To verify your identity, we need your permission to process sensitive data.",
    "errores.identidad.documentoEnUso": "This document has already verified another account.",
    "errores.identidad.noConfirmado": "The registry didn't confirm your document.",
    "errores.identidad.noApareceCedula":
      "The document doesn't appear in the Registraduría, Colombia's civil registry (simulated).",
    "errores.identidad.noAparecePasaporte": "The document doesn't appear in the passport registry (simulated).",

    "errores.archivo.tipo": "File type not allowed. Use JPG, PNG, WebP, or PDF.",
    "errores.archivo.vacio": "The file is empty.",
    "errores.archivo.tamano": "The file is larger than the 4 MB limit.",
    "errores.archivo.evidenciaNoEncontrada": "Evidence not found.",

    "errores.cuenta.correoEnUso": "An account with that email already exists. Sign in with your password.",
    "errores.cuenta.demasiadosIntentos": "Too many failed attempts. Try again in 15 minutes.",
    "errores.cuenta.correoInvalido": "The email isn't valid.",
    "errores.cuenta.datosAutenticacion": "Invalid authentication data.",

    "errores.voluntariado.noExiste": "That volunteering opportunity doesn't exist.",
    "errores.voluntariado.sinCupos": "This volunteer day has no spots left.",
    "errores.voluntariado.yaInscrito": "Someone has already signed up with that email for this volunteer day.",

    "errores.api.cuerpoJson": "The request body must be JSON.",
    "errores.api.datosInvalidos": "The data you sent isn't valid.",
    "errores.api.interno": "Something went wrong on our end. Try again.",
  } satisfies Record<keyof typeof es, string>,
  pt: {
    "errores.aporte.mayorQueCero": "A contribuição deve ser maior que zero.",
    "errores.aporte.superaLoQueFalta": "A contribuição ultrapassa o que falta para o tratamento.",
    "errores.aporte.billeteraInvalida": "A carteira não é uma conta Stellar válida.",
    "errores.aporte.noEsAporte": "A transação não é uma contribuição.",
    "errores.aporte.mismaBilletera": "A contribuição deve ser assinada pela mesma carteira que contribui.",
    "errores.aporte.hashInvalido": "O hash da transação não é válido.",
    "errores.aporte.noEncontrado": "Não encontramos essa contribuição.",
    "errores.aporte.noCoincide": "A transação na rede não corresponde à contribuição salva.",
    "errores.aporte.casoCerrado": "Este caso não recebe mais contribuições.",
    "errores.aporte.iniciarSesion": "Entre ou crie sua conta para apadrinhar.",
    "errores.aporte.cuentaPersona": "Para apadrinhar, entre com uma conta pessoal.",
    "errores.aporte.verificarIdentidad":
      "Para contribuições acima de {limite} USDC, verifique sua identidade. Leva uns dois minutos.",
    "errores.aporte.sinSaldo": "Sua carteira não tem USDC de teste suficiente para esta contribuição.",
    "errores.aporte.sinLineaConfianza": "Sua carteira não tem a linha de confiança (trustline) do USDC de teste.",

    "errores.monto.formato": "Digite um valor maior que zero, com até 7 casas decimais.",
    "errores.monto.mayorQueCero": "O valor deve ser maior que zero.",
    "errores.monto.invalido": 'Valor inválido: "{monto}". Use um decimal positivo com até 7 casas decimais.',
    "errores.monto.negativo": "Valores negativos não são válidos.",

    "errores.caso.noExiste": "Esse caso não existe.",
    "errores.caso.noEsDeTuOng": "Esse caso não é da sua ONG.",
    "errores.caso.noRegistrado": "Esse caso não está registrado no contrato.",
    "errores.etapa.elegir": "Escolha uma etapa do caso.",
    "errores.etapa.noExiste": "Essa etapa não existe no caso.",
    "errores.etapa.sinFondos": "A etapa não tem fundos cobertos e não gastos suficientes para essa despesa.",
    "errores.etapa.disponible": "A etapa {etapa} só tem {monto} USDC cobertos e não gastos.",

    "errores.registro.proveedor": "Escolha um fornecedor que trabalhe com a sua ONG.",
    "errores.registro.categoria": "Escolha a categoria da despesa.",
    "errores.registro.numeroFactura": "Digite o número da nota fiscal.",
    "errores.registro.facturaObligatoria": "A nota fiscal é obrigatória: envie-a em PDF ou imagem.",
    "errores.registro.descripcion": "Escreva uma descrição curta do avanço (de 5 a 280 caracteres).",
    "errores.registro.fechaInvalida": "Digite uma data válida.",
    "errores.registro.fechaFutura": "A data não pode ser futura.",
    "errores.registro.firmaOng": "Assine com a carteira da ONG registrada na Proof of Wild.",
    "errores.registro.noCoincide": "A transação assinada não corresponde ao que você registrou. Comece de novo.",
    "errores.registro.yaEnviado": "Este registro já foi enviado com outra transação.",
    "errores.registro.noEncontrado": "Não encontramos esse registro.",
    "errores.registro.formulario": "O formulário não é válido ou o arquivo ultrapassa 4 MB.",

    "errores.permiso.general": "Você não tem permissão para realizar esta operação.",
    "errores.permiso.soloOngDelCaso": "Só a ONG do caso pode registrar as despesas e os marcos dele.",
    "errores.permiso.cuentaOng": "Entre com a conta da sua ONG.",
    "errores.permiso.ongNoAprobada": "Sua ONG ainda não foi aprovada para registrar despesas e marcos.",
    "errores.permiso.noEsLaOng": "Essa conta não é a da ONG do caso.",

    "errores.red.noRespondio": "A rede Stellar não respondeu. Tente novamente em alguns segundos.",
    "errores.red.cuentaNoExiste": "Essa conta não existe na testnet. Financie-a com o Friendbot e tente novamente.",
    "errores.red.noAcepto": "A rede não aceitou a operação. Confira os dados e tente novamente.",
    "errores.red.firmaIncorrecta": "A assinatura não corresponde à conta esperada. Conecte a carteira correta.",
    "errores.red.rechazada": "A rede rejeitou a transação ({codigo}).",
    "errores.red.fallo": "A transação falhou na rede.",
    "errores.red.envueltaAjena": "Transação encapsulada: não veio desta página.",
    "errores.red.envueltasNo": "Transações encapsuladas não são aceitas.",
    "errores.red.firmadaInvalida": "A transação assinada não é válida.",
    "errores.red.noEsDelContrato": "A transação não é uma chamada ao contrato.",
    "errores.red.otroContrato": "A transação não é para o contrato da Proof of Wild.",
    "errores.red.funcionNoAceptada": "A função “{funcion}” não pode ser chamada a partir da página.",

    "errores.identidad.cedula": "O número do documento (cédula) deve ter entre 6 e 10 dígitos.",
    "errores.identidad.pasaporte": "O número do passaporte deve ter entre 6 e 9 letras ou números.",
    "errores.identidad.pruebaDeVida": "Falta concluir a prova de vida: piscar e virar a cabeça.",
    "errores.identidad.rostroReal":
      "Não conseguimos confirmar que o rosto é real. Use sua câmera sem fotos nem telas na frente.",
    "errores.identidad.rostroNoCoincide": "Seu rosto não corresponde à foto do documento. Tente com mais luz.",
    "errores.identidad.autorizacion":
      "Para verificar sua identidade, precisamos da sua autorização para tratar dados sensíveis.",
    "errores.identidad.documentoEnUso": "Este documento já verificou outra conta.",
    "errores.identidad.noConfirmado": "O registro não confirmou seu documento.",
    "errores.identidad.noApareceCedula":
      "O documento não consta na Registraduría, o registro civil da Colômbia (simulado).",
    "errores.identidad.noAparecePasaporte": "O documento não consta no registro de passaportes (simulado).",

    "errores.archivo.tipo": "Tipo de arquivo não permitido. Use JPG, PNG, WebP ou PDF.",
    "errores.archivo.vacio": "O arquivo está vazio.",
    "errores.archivo.tamano": "O arquivo ultrapassa o tamanho máximo de 4 MB.",
    "errores.archivo.evidenciaNoEncontrada": "Evidência não encontrada.",

    "errores.cuenta.correoEnUso": "Já existe uma conta com esse e-mail. Entre com sua senha.",
    "errores.cuenta.demasiadosIntentos": "Muitas tentativas sem sucesso. Tente novamente em 15 minutos.",
    "errores.cuenta.correoInvalido": "O e-mail não é válido.",
    "errores.cuenta.datosAutenticacion": "Dados de autenticação inválidos.",

    "errores.voluntariado.noExiste": "Esse voluntariado não existe.",
    "errores.voluntariado.sinCupos": "Esta jornada não tem mais vagas.",
    "errores.voluntariado.yaInscrito": "Já existe uma inscrição com esse e-mail para esta jornada.",

    "errores.api.cuerpoJson": "O corpo da requisição deve ser JSON.",
    "errores.api.datosInvalidos": "Os dados enviados não são válidos.",
    "errores.api.interno": "Algo deu errado do nosso lado. Tente novamente.",
  } satisfies Record<keyof typeof es, string>,
};
