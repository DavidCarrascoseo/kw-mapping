/**
 * Enhanced Local Classifier - Rule-based keyword classification for Taxfix
 * Improved pattern matching with semantic understanding
 */

// ============ DISCARD PATTERNS ============

// Competitors to discard
const COMPETITORS = [
  /\banfix\b/i, /\bholded\b/i, /\bquipu\b/i, /\bsage\b/i, /\bcontasol\b/i,
  /\bfactorial\b/i, /\ba3\b.*software/i, /\bwolters/i, /\bgestoria.*online\b/i,
  /\btaxdown\b/i, /\bgetquipu\b/i, /\bbillin\b/i, /\bcontaplus\b/i,
  /\bcontasimple\b/i, /\bdebitoor\b/i, /\bfacturadirecta\b/i, /\bdeclara\b.*facil/i,
  /\brenta.*web\b/i, /\bdeclarar\b.*\.com/i, /\bgestionar\b.*facil/i
];

// Typos and malformed keywords
const TYPO_PATTERNS = [
  /(.)\1{4,}/, // 5+ repeated characters (more lenient)
  /[bcdfghjklmnpqrstvwxz]{7,}/i // 7+ consonants in a row
];

// Generic/irrelevant terms (exact matches only)
const GENERIC_EXACT = new Set([
  'telefono', 'contacto', 'email', 'direccion', 'horario', 'oficina',
  'opiniones', 'reviews', 'login', 'acceso', 'entrar', 'hoy', 'mañana',
  'ayer', 'siempre', 'nunca', 'todo', 'nada', 'cosa', 'cosas', 'año',
  'mes', 'dia', 'semana', 'google', 'facebook', 'twitter', 'instagram'
]);

// Full discard check
const shouldDiscard = (keyword) => {
  const kw = keyword.toLowerCase().trim();

  // Too short
  if (kw.length <= 2) return { discard: true, reason: 'Muy corto' };

  // Only numbers
  if (/^\d+$/.test(kw)) return { discard: true, reason: 'Solo números' };

  // No letters
  if (/^[^a-záéíóúüñ]+$/i.test(kw)) return { discard: true, reason: 'Sin letras' };

  // Exact generic match
  if (GENERIC_EXACT.has(kw)) return { discard: true, reason: 'Término genérico' };

  // Competitors
  for (const pattern of COMPETITORS) {
    if (pattern.test(kw)) return { discard: true, reason: 'Competidor' };
  }

  // Typos
  for (const pattern of TYPO_PATTERNS) {
    if (pattern.test(kw)) return { discard: true, reason: 'Posible typo' };
  }

  return { discard: false, reason: '' };
};

// ============ CATEGORY PATTERNS ============

const CATEGORY_RULES = {
  'Autónomos': {
    strong: [ // High confidence patterns
      /\bautónom[oa]s?\b/i, /\bautonomo[s]?\b/i, /\bfreelance[rs]?\b/i,
      /\breta\b/i, /cuota.*autónom/i, /autónom.*cuota/i,
      /tarifa.*plana.*autónom/i, /alta.*autónom/i, /baja.*autónom/i,
      /cotizaci[oó]n.*autónom/i, /seguridad.*social.*autónom/i,
      /pluriactividad/i, /capitaliza.*desempleo/i, /mutua.*autónom/i,
      /trabajador.*cuenta.*propia/i, /por.*cuenta.*propia/i,
      /aut[oó]nomo.*societario/i, /falso.*aut[oó]nomo/i
    ],
    medium: [ // Medium confidence
      /ep[ií]grafe/i, /iae\b/i, /actividad.*econ[oó]mica/i,
      /m[oó]dulos/i, /estimaci[oó]n.*directa/i, /estimaci[oó]n.*objetiva/i,
      /rendimiento.*actividad/i, /gastos.*deducibles.*actividad/i
    ],
    keywords: ['autónomo', 'autonomo', 'freelance', 'reta', 'cuota', 'tarifa plana']
  },

  'Renta': {
    strong: [
      /declaraci[oó]n.*renta/i, /renta\s+\d{4}/i, /campa[ñn]a.*renta/i,
      /\birpf\b/i, /borrador.*renta/i, /renta.*borrador/i,
      /casilla.*\d+/i, /modelo.*100\b/i, /devoluci[oó]n.*renta/i,
      /renta.*devoluci[oó]n/i, /hacienda.*renta/i, /renta.*hacienda/i,
      /declarar.*renta/i, /hacer.*renta/i, /presentar.*renta/i
    ],
    medium: [
      /\brenta\b/i, /deducci[oó]n/i, /desgravar/i, /base.*imponible/i,
      /tipo.*marginal/i, /tramo.*irpf/i, /m[ií]nimo.*personal/i,
      /rendimiento.*trabajo/i, /rendimiento.*capital/i,
      /declaraci[oó]n.*conjunta/i, /declaraci[oó]n.*individual/i,
      /complementaria/i, /rectificativa/i, /paralela/i
    ],
    keywords: ['renta', 'irpf', 'declaración', 'hacienda', 'borrador', 'casilla']
  },

  'Empresas': {
    strong: [
      /sociedad.*limitada/i, /\bs\.?l\.?\b/i, /\bs\.?a\.?\b/i,
      /impuesto.*sociedades/i, /constituir.*empresa/i, /crear.*empresa/i,
      /montar.*empresa/i, /abrir.*empresa/i, /registro.*mercantil/i,
      /capital.*social/i, /junta.*socios/i, /estatutos.*sociedad/i,
      /administrador.*[uú]nico/i, /consejo.*administraci[oó]n/i
    ],
    medium: [
      /\bempresa[s]?\b/i, /\bsociedad\b/i, /\bpyme[s]?\b/i,
      /contabilidad.*empresa/i, /balance/i, /cuenta.*resultado/i,
      /\bcorporativ/i, /iva.*empresa/i, /n[oó]mina.*empresa/i
    ],
    keywords: ['empresa', 'sociedad', 'sl', 'sa', 'pyme', 'mercantil']
  },

  'Trámites': {
    strong: [
      /modelo.*\d{3}/i, /\baeat\b/i, /agencia.*tributaria/i,
      /\bnie\b/i, /\bnif\b/i, /\bcif\b/i, /alta.*censo/i, /baja.*censo/i,
      /certificado.*digital/i, /certificado.*hacienda/i,
      /presentar.*modelo/i, /rellenar.*modelo/i
    ],
    medium: [
      /tr[aá]mite/i, /certificado/i, /documento/i, /solicitud/i,
      /formulario/i, /\bmodelo\b/i, /instancia/i, /registro/i
    ],
    keywords: ['modelo', 'certificado', 'aeat', 'trámite', 'nie', 'nif']
  },

  'Facturación': {
    strong: [
      /factura.*electr[oó]nica/i, /factura.*simplificada/i,
      /factura.*rectificativa/i, /emitir.*factura/i, /hacer.*factura/i,
      /programa.*factura/i, /software.*factura/i, /plantilla.*factura/i,
      /n[uú]mero.*factura/i, /serie.*factura/i
    ],
    medium: [
      /\bfactura[s]?\b/i, /facturaci[oó]n/i, /\bticket\b/i,
      /\brecibo[s]?\b/i, /\balbar[aá]n/i, /\bpresupuesto[s]?\b/i,
      /cobrar/i, /pagar/i
    ],
    keywords: ['factura', 'facturación', 'recibo', 'albarán', 'presupuesto']
  },

  'Inversiones': {
    strong: [
      /declarar.*cripto/i, /impuesto.*cripto/i, /cripto.*impuesto/i,
      /\bbitcoin\b/i, /\bethereum\b/i, /criptomoneda[s]?/i,
      /ganancia.*patrimonial/i, /p[eé]rdida.*patrimonial/i,
      /plusval[ií]a/i, /minusval[ií]a/i, /venta.*acciones/i,
      /dividendo.*declarar/i, /declarar.*dividendo/i
    ],
    medium: [
      /\binversi[oó]n/i, /\btrading\b/i, /\bcripto\b/i,
      /\bacci[oó]n/i, /\bacciones\b/i, /\bbolsa\b/i, /\bdividendo/i,
      /\bbroker\b/i, /\betf\b/i, /\bfondo[s]?\b/i, /\bcartera\b/i,
      /rentabilidad/i, /\bnft\b/i, /\btoken\b/i, /\bwallet\b/i
    ],
    keywords: ['inversión', 'cripto', 'bitcoin', 'acciones', 'bolsa', 'dividendo']
  },

  'IVA': {
    strong: [
      /\biva\b.*\d+/i, /tipo.*iva/i, /iva.*tipo/i, /exento.*iva/i,
      /iva.*exento/i, /modelo.*303/i, /modelo.*390/i,
      /declaraci[oó]n.*iva/i, /iva.*trimestral/i, /iva.*anual/i,
      /repercutir.*iva/i, /soportado.*iva/i, /deducir.*iva/i
    ],
    medium: [
      /\biva\b/i, /impuesto.*valor/i, /base.*imponible.*iva/i
    ],
    keywords: ['iva', 'impuesto', 'repercutido', 'soportado']
  },

  'Nóminas': {
    strong: [
      /n[oó]mina.*empleado/i, /calcular.*n[oó]mina/i, /hacer.*n[oó]mina/i,
      /retenci[oó]n.*n[oó]mina/i, /irpf.*n[oó]mina/i, /n[oó]mina.*irpf/i,
      /seguridad.*social.*empleado/i, /contrato.*trabajo/i
    ],
    medium: [
      /\bn[oó]mina[s]?\b/i, /\bsalario\b/i, /\bsueldo\b/i,
      /paga.*extra/i, /finiquito/i, /despido/i, /indemnizaci[oó]n/i
    ],
    keywords: ['nómina', 'salario', 'sueldo', 'contrato', 'empleado']
  },

  'Herencias': {
    strong: [
      /impuesto.*sucesiones/i, /impuesto.*herencia/i, /heredar.*impuesto/i,
      /declarar.*herencia/i, /aceptar.*herencia/i, /renunciar.*herencia/i,
      /donaci[oó]n.*impuesto/i, /impuesto.*donaci[oó]n/i
    ],
    medium: [
      /\bherencia[s]?\b/i, /\bheredar\b/i, /\bheredero[s]?\b/i,
      /\bdonaci[oó]n/i, /\bdonar\b/i, /\btestamento\b/i,
      /sucesi[oó]n/i, /legado/i
    ],
    keywords: ['herencia', 'heredar', 'donación', 'sucesiones', 'testamento']
  },

  'Alquiler': {
    strong: [
      /declarar.*alquiler/i, /alquiler.*declarar/i, /alquiler.*renta/i,
      /renta.*alquiler/i, /ingreso.*alquiler/i, /alquiler.*ingreso/i,
      /arrendador/i, /arrendatario/i, /contrato.*alquiler/i,
      /fianza.*alquiler/i, /iva.*alquiler/i, /alquiler.*iva/i
    ],
    medium: [
      /\balquiler\b/i, /\barrendamiento\b/i, /\binquilino\b/i,
      /\bpiso\b.*alquil/i, /alquil.*\bpiso\b/i, /\brenta\b.*piso/i
    ],
    keywords: ['alquiler', 'arrendamiento', 'inquilino', 'arrendador']
  }
};

// Subcategories with patterns
const SUBCATEGORY_RULES = {
  'Autónomos': {
    'Alta y Registro': /alta|registro|darse.*alta|empezar|comenzar|iniciar.*actividad|nuevo.*aut[oó]nomo/i,
    'Cuotas y Cotización': /cuota|cotiza|reta|pagar|mensual|seguridad.*social/i,
    'Tarifa Plana': /tarifa.*plana|bonifica|reducci[oó]n.*cuota/i,
    'Impuestos Trimestrales': /trimestral|modelo.*130|modelo.*303|pago.*fraccionado/i,
    'Gastos Deducibles': /gasto|deducible|deducci[oó]n|desgravar|desgrava/i,
    'Baja': /baja|cese|cerrar|dejar.*actividad|abandonar/i,
    'Epígrafes IAE': /ep[ií]grafe|iae|actividad.*econ[oó]mica|c[oó]digo.*actividad/i,
    'Autónomo Societario': /societario|socio.*aut[oó]nomo|aut[oó]nomo.*socio/i,
    'Pluriactividad': /pluriactividad|trabajar.*empresa.*aut[oó]nomo|compatib/i
  },
  'Renta': {
    'Cómo Declarar': /c[oó]mo|hacer|presentar|declarar|paso|tutorial|gu[ií]a/i,
    'Deducciones': /deducci[oó]n|deducir|desgravar|reducir|reducci[oó]n/i,
    'Plazos y Fechas': /plazo|fecha|cu[aá]ndo|calendario|l[ií]mite|[uú]ltimo.*d[ií]a/i,
    'Borrador': /borrador|confirmar|modificar.*borrador|errores.*borrador/i,
    'Casillas': /casilla|\d{3}|rellenar|campo/i,
    'Alquiler Vivienda': /alquiler|vivienda|piso|arrendamiento|inquilino/i,
    'Hipoteca': /hipoteca|vivienda.*habitual|pr[eé]stamo.*vivienda/i,
    'Familia': /familia|hijo|maternidad|paternidad|discapacidad|dependiente/i,
    'Devolución': /devoluci[oó]n|devolver|cobrar|resultado.*renta|a.*devolver/i,
    'Rectificación': /rectific|complementaria|error|corregir|modificar.*declaraci/i
  },
  'Empresas': {
    'Crear Empresa': /crear|constituir|montar|abrir|fundar|nueva.*empresa/i,
    'Impuesto Sociedades': /impuesto.*sociedad|is\b|modelo.*200|beneficio.*empresa/i,
    'Contabilidad': /contabilidad|balance|cuenta.*resultado|asiento|libro.*contable/i,
    'IVA Empresas': /iva|repercutir|soportado|liquidaci[oó]n.*iva/i,
    'Socios y Dividendos': /socio|dividendo|reparto|participaci[oó]n|junta/i,
    'Trámites': /tr[aá]mite|registro|mercantil|escritura|notario/i
  },
  'Inversiones': {
    'Criptomonedas': /cripto|bitcoin|ethereum|token|blockchain|wallet|exchange|binance|coinbase/i,
    'Acciones y Bolsa': /acci[oó]n|bolsa|broker|comprar.*vender|orden|mercado.*valores/i,
    'Fondos de Inversión': /fondo|etf|indexado|gesti[oó]n.*pasiva|cartera/i,
    'Dividendos': /dividendo|reparto|cobrar.*dividendo/i,
    'Plusvalías': /plusval[ií]a|ganancia|beneficio.*venta|p[eé]rdida.*patrimonial/i
  },
  'Trámites': {
    'Modelos Tributarios': /modelo.*\d{3}|presentar.*modelo|rellenar/i,
    'Certificados': /certificado|solicitar.*certificado|obtener.*certificado/i,
    'NIE/NIF': /nie|nif|n[uú]mero.*identificaci[oó]n|extranjero/i,
    'AEAT': /aeat|agencia.*tributaria|sede.*electr[oó]nica|clave.*pin/i
  }
};

// Intent patterns - more comprehensive
const INTENT_ANALYSIS = {
  transactional: {
    patterns: [
      /contratar/i, /solicitar/i, /descargar/i, /comprar/i,
      /\bapp\b/i, /aplicaci[oó]n/i, /programa/i, /software/i, /herramienta/i,
      /gestor[ií]a/i, /asesor/i, /servicio/i, /ayuda.*profesional/i,
      /precio/i, /coste/i, /cu[aá]nto.*cuesta/i, /gratis/i, /barato/i,
      /mejor/i, /comparar/i, /comparativa/i, /alternativa/i, /opci[oó]n/i,
      /\bonline\b/i, /f[aá]cil/i, /r[aá]pido/i, /autom[aá]tico/i
    ],
    weight: 2
  },
  navigational: {
    patterns: [
      /sede.*electr[oó]nica/i, /p[aá]gina.*oficial/i, /web.*oficial/i,
      /entrar/i, /acceder/i, /iniciar.*sesi[oó]n/i, /\blogin\b/i,
      /descargar.*borrador/i, /ver.*borrador/i
    ],
    weight: 1.5
  },
  informational: {
    patterns: [
      /qu[eé].*es/i, /c[oó]mo/i, /cu[aá]ndo/i, /d[oó]nde/i, /por.*qu[eé]/i,
      /qu[eé].*significa/i, /diferencia/i, /tipos.*de/i, /clases.*de/i,
      /requisitos/i, /gu[ií]a/i, /tutorial/i, /explicar/i, /ejemplo/i,
      /significa/i, /definici[oó]n/i, /concepto/i
    ],
    weight: 1
  }
};

/**
 * Find best matching category
 */
const findCategory = (keyword) => {
  const kw = keyword.toLowerCase();
  let bestMatch = { category: 'Otros', score: 0, confidence: 'low' };

  for (const [category, rules] of Object.entries(CATEGORY_RULES)) {
    // Check strong patterns first (high confidence)
    for (const pattern of rules.strong) {
      if (pattern.test(kw)) {
        const score = 100 + pattern.source.length;
        if (score > bestMatch.score) {
          bestMatch = { category, score, confidence: 'high' };
        }
      }
    }

    // Check medium patterns
    for (const pattern of rules.medium) {
      if (pattern.test(kw)) {
        const score = 50 + pattern.source.length;
        if (score > bestMatch.score) {
          bestMatch = { category, score, confidence: 'medium' };
        }
      }
    }

    // Check keyword presence
    for (const word of rules.keywords) {
      if (kw.includes(word)) {
        const score = 30 + word.length;
        if (score > bestMatch.score) {
          bestMatch = { category, score, confidence: 'low' };
        }
      }
    }
  }

  return bestMatch;
};

/**
 * Find subcategory
 */
const findSubCategory = (keyword, mainCategory) => {
  const kw = keyword.toLowerCase();
  const rules = SUBCATEGORY_RULES[mainCategory];

  if (!rules) return '';

  for (const [subCategory, pattern] of Object.entries(rules)) {
    if (pattern.test(kw)) {
      return subCategory;
    }
  }

  return '';
};

/**
 * Determine intent with confidence
 */
const determineIntent = (keyword) => {
  const kw = keyword.toLowerCase();
  let scores = { transactional: 0, navigational: 0, informational: 0 };

  for (const [intent, config] of Object.entries(INTENT_ANALYSIS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(kw)) {
        scores[intent] += config.weight;
      }
    }
  }

  // Default bias toward informational
  scores.informational += 0.5;

  const maxIntent = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b);

  return maxIntent[0] === 'transactional' ? 'Transactional' : 'Informational';
};

/**
 * Extract semantic topics from keyword for URL matching
 */
export const extractTopics = (keyword) => {
  const kw = keyword.toLowerCase();
  const topics = [];

  // Main topic indicators
  const topicPatterns = {
    'autonomos': /aut[oó]nomo|freelance|cuenta.*propia|reta\b/i,
    'renta': /renta|irpf|declaraci[oó]n|hacienda/i,
    'empresas': /empresa|sociedad|pyme|sl\b|sa\b|mercantil/i,
    'iva': /\biva\b|impuesto.*valor/i,
    'facturacion': /factura|facturaci[oó]n/i,
    'nominas': /n[oó]mina|salario|sueldo/i,
    'inversiones': /inversi[oó]n|cripto|bitcoin|acciones|bolsa/i,
    'herencias': /herencia|donaci[oó]n|sucesi[oó]n/i,
    'alquiler': /alquiler|arrendamiento|inquilino/i,
    'tramites': /tr[aá]mite|modelo|certificado|aeat/i
  };

  for (const [topic, pattern] of Object.entries(topicPatterns)) {
    if (pattern.test(kw)) {
      topics.push(topic);
    }
  }

  // Action indicators
  const actionPatterns = {
    'como-hacer': /c[oó]mo|hacer|presentar|calcular|rellenar/i,
    'que-es': /qu[eé].*es|significa|definici[oó]n/i,
    'requisitos': /requisito|necesario|obligatorio/i,
    'plazos': /plazo|fecha|cu[aá]ndo|calendario/i,
    'deducciones': /deducci[oó]n|desgravar|deducir/i,
    'alta-baja': /alta|baja|registro|cese/i
  };

  for (const [action, pattern] of Object.entries(actionPatterns)) {
    if (pattern.test(kw)) {
      topics.push(action);
    }
  }

  return topics;
};

/**
 * Classify a single keyword
 */
const classifyKeyword = (keyword, historicalData = []) => {
  const kw = keyword.toLowerCase().trim();

  // Check if should be discarded
  const discardCheck = shouldDiscard(kw);
  if (discardCheck.discard) {
    return {
      keyword,
      mainCategory: 'Otros',
      subCategory: '',
      intent: 'Informational',
      shouldDiscard: true,
      discardReason: discardCheck.reason,
      confidence: 'high',
      topics: []
    };
  }

  // Extract semantic topics
  const topics = extractTopics(kw);

  // Check historical data for exact match
  if (historicalData.length > 0) {
    const exactMatch = historicalData.find(h =>
      h.keyword.toLowerCase().trim() === kw
    );
    if (exactMatch) {
      return {
        keyword,
        mainCategory: exactMatch.mainCategory,
        subCategory: exactMatch.subCategory || findSubCategory(kw, exactMatch.mainCategory),
        intent: determineIntent(kw),
        shouldDiscard: false,
        discardReason: '',
        confidence: 'high',
        topics
      };
    }

    // Check for similar matches
    for (const hist of historicalData) {
      const histWords = hist.keyword.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const kwWords = kw.split(/\s+/).filter(w => w.length > 3);
      const commonWords = histWords.filter(w => kwWords.includes(w));

      if (commonWords.length >= 2 || (commonWords.length === 1 && histWords.length === 1 && kwWords.length <= 3)) {
        return {
          keyword,
          mainCategory: hist.mainCategory,
          subCategory: hist.subCategory || findSubCategory(kw, hist.mainCategory),
          intent: determineIntent(kw),
          shouldDiscard: false,
          discardReason: '',
          confidence: 'medium',
          topics
        };
      }
    }
  }

  // Pattern-based classification
  const categoryMatch = findCategory(kw);
  const subCategory = findSubCategory(kw, categoryMatch.category);
  const intent = determineIntent(kw);

  return {
    keyword,
    mainCategory: categoryMatch.category,
    subCategory,
    intent,
    shouldDiscard: false,
    discardReason: '',
    confidence: categoryMatch.confidence,
    topics
  };
};

/**
 * Classify keywords in batches
 */
export const classifyKeywordsLocally = async (keywords, historicalData = [], onProgress) => {
  const results = [];
  const batchSize = 100;

  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);

    for (const keyword of batch) {
      if (keyword && keyword.trim()) {
        results.push(classifyKeyword(keyword, historicalData));
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, keywords.length), keywords.length);
    }

    // Small delay to show progress
    await new Promise(r => setTimeout(r, 20));
  }

  return results;
};

export default classifyKeywordsLocally;
