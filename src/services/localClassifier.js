/**
 * Local Classifier - Rule-based keyword classification for Taxfix
 * Works without API key using pattern matching
 */

// Competitors to discard
const COMPETITORS = [
  /anfix/i, /holded/i, /quipu/i, /sage/i, /contasol/i,
  /factorial/i, /a3/i, /wolters/i, /asesor.*online/i,
  /gestoria.*online/i, /taxdown/i, /getquipu/i, /billin/i,
  /contaplus/i, /contasimple/i, /debitoor/i
];

// Typos and malformed keywords
const TYPO_PATTERNS = [
  /\d{2,}[a-z]/i, // Numbers mixed with letters incorrectly (agenci8a)
  /[a-z]\d{2,}[a-z]/i, // Letters-numbers-letters
  /(.)\1{3,}/, // 4+ repeated characters
  /[^aeiouáéíóúüñ]{6,}/i // Too many consonants in a row
];

// Generic/irrelevant terms
const GENERIC_PATTERNS = [
  /^telefono$/i, /^contacto$/i, /^email$/i, /^direccion$/i,
  /^horario$/i, /^oficina$/i, /^opiniones$/i, /^reviews$/i,
  /^año natural$/i, /^tiempo$/i, /^hoy$/i, /^mañana$/i,
  /^login$/i, /^acceso$/i, /^entrar$/i, /^registro$/i
];

// Full discard patterns
const DISCARD_PATTERNS = [
  /xxx/i, /porn/i, /casino/i, /apostar/i, /loteria/i,
  /^.{1,2}$/, // Too short (1-2 chars)
  /^\d+$/, // Only numbers
  /^[^a-záéíóúüñ]+$/i, // No letters
  ...COMPETITORS,
  ...TYPO_PATTERNS,
  ...GENERIC_PATTERNS
];

// Main categories with patterns
const CATEGORY_PATTERNS = {
  'Autónomos': [
    /\bautónom/i, /\bautonomo/i, /\bfreelance/i, /\bfreelancer/i,
    /cuota.*autónom/i, /alta.*autónom/i, /baja.*autónom/i,
    /\breta\b/i, /trabajador.*cuenta.*propia/i, /tarifa.*plana/i,
    /cotizacion.*autonomo/i, /\bautónomo\b/i, /seguridad.*social.*autonomo/i,
    /epígrafe/i, /epigrafe/i, /iae.*autonomo/i, /autonomo.*iae/i,
    /pluriactividad/i, /capitalización.*desempleo/i,
    /base.*cotización.*autonomo/i, /mutua.*autonomo/i
  ],
  'Renta': [
    /\brenta\b/i, /\birpf\b/i, /declaración.*renta/i, /declaracion.*renta/i,
    /\bhacienda\b/i, /deduccion/i, /deducción/i, /\bborrador\b/i,
    /casilla/i, /modelo.*100/i, /campaña.*renta/i, /devolucion.*renta/i,
    /devolución.*renta/i, /tributar/i, /contribuyente/i,
    /rendimiento.*trabajo/i, /base.*imponible/i, /tipo.*marginal/i,
    /tramo.*irpf/i, /mínimo.*personal/i, /declaración.*conjunta/i
  ],
  'Empresas': [
    /\bempresa/i, /\bsociedad/i, /\bpyme/i, /\bsl\b/i, /\bs\.l\./i,
    /\bs\.a\./i, /\bsa\b/i, /impuesto.*sociedad/i, /\bis\b.*empresa/i,
    /contabilidad.*empresa/i, /\bbalance/i, /cuenta.*resultado/i,
    /\bcorporativ/i, /sociedad.*limitada/i, /constituir.*empresa/i,
    /crear.*empresa/i, /administrador.*sociedad/i, /junta.*socios/i,
    /estatutos/i, /capital.*social/i, /registro.*mercantil/i
  ],
  'Trámites': [
    /\btramite/i, /\btrámite/i, /\bcertificado/i, /\bdocumento/i,
    /\bsolicitud/i, /\bformulario/i, /\bmodelo\b/i, /\baeat\b/i,
    /agencia.*tributaria/i, /\bnie\b/i, /\bnif\b/i, /\bcif\b/i,
    /registro.*hacienda/i, /alta.*censo/i, /baja.*censo/i,
    /modelo.*036/i, /modelo.*037/i, /modelo.*303/i, /modelo.*390/i,
    /modelo.*130/i, /modelo.*111/i, /modelo.*115/i
  ],
  'Facturación': [
    /\bfactura/i, /facturacion/i, /facturación/i, /\bticket\b/i,
    /\brecibo/i, /\balbarán/i, /\balbaran/i, /\bpresupuesto/i,
    /software.*factura/i, /programa.*factura/i, /emitir.*factura/i,
    /factura.*electrónica/i, /factura.*electronica/i, /rectificativa/i,
    /factura.*simplificada/i, /número.*factura/i, /serie.*factura/i
  ],
  'Inversiones': [
    /\binversion/i, /\binversión/i, /\btrading\b/i, /\bcripto/i,
    /\bbitcoin/i, /\bethereum/i, /\baccion/i, /\bacción/i,
    /\bbolsa\b/i, /\bdividendo/i, /\bplusvalía/i, /\bplusvalia/i,
    /\bminusvalia/i, /\bbroker/i, /\betf\b/i, /\bfondo/i,
    /\bcartera/i, /\bacciones\b/i, /rentabilidad.*inversion/i,
    /declarar.*cripto/i, /impuestos.*cripto/i, /ganancias.*patrimoniales/i
  ],
  'TaxScouts': [
    /\btaxscouts\b/i, /\btax.*scouts\b/i
  ]
};

// Subcategories mapping
const SUBCATEGORY_PATTERNS = {
  'Autónomos': {
    'Ayudas y Beneficios': /ayuda|beneficio|bonificación|bonificacion|subvención|subvencion|prestación|prestacion/i,
    'Declaraciones de Impuestos': /declaración|declaracion|trimestral|anual|modelo.*\d{3}/i,
    'Epígrafes IAE': /epígrafe|epigrafe|iae|actividad.*económica/i,
    'Ingresos y Gastos Deducibles': /ingreso|gasto|deducible|deducción|desgravar/i,
    'Nuevos Autónomos': /nuevo.*autónomo|alta.*autónomo|empezar.*autónomo|hacerse.*autónomo|darse.*alta/i,
    'Profesiones': /profesión|profesion|abogado|médico|arquitecto|ingeniero|consultor|freelance/i,
    'Trámites y Documentos': /trámite|tramite|documento|certificado|solicitud/i
  },
  'Renta': {
    'Casos Excepcionales': /herencia|donación|donacion|extranjero|expatriado|no.*residente/i,
    'Casos Frecuentes': /alquiler|vivienda|hipoteca|familia.*numerosa|discapacidad/i,
    'Deducciones': /deducción|deduccion|desgravar|reducción|reduccion/i,
    'Trámites y Plazos': /plazo|fecha|calendario|presentar|rectificar|complementaria/i
  },
  'Empresas': {
    'Crear una Sociedad Limitada': /crear|constituir|montar|abrir.*empresa|sociedad.*limitada/i,
    'Impuestos': /impuesto|is\b|iva|retención|retencion/i,
    'Socios': /socio|accionista|participación|participacion|dividendo/i,
    'Trámites y Documentos Empresas': /trámite|tramite|documento|registro|escritura/i
  },
  'Trámites': {
    'Modelos': /modelo.*\d{3}/i,
    'Otros Trámites': /certificado|solicitud|instancia/i
  },
  'Inversiones': {
    'Criptomonedas': /cripto|bitcoin|ethereum|token|blockchain|wallet/i,
    'Acciones y Bolsa': /acción|accion|bolsa|dividendo|broker/i,
    'Fondos': /fondo|etf|indexado/i
  }
};

// Intent patterns
const INTENT_PATTERNS = {
  transactional: [
    /comprar/i, /contratar/i, /solicitar/i, /descargar/i,
    /crear/i, /hacer/i, /generar/i, /calcular/i, /simulador/i,
    /herramienta/i, /programa/i, /software/i, /\bapp\b/i, /aplicación/i,
    /precio/i, /coste/i, /cuanto.*cuesta/i, /gratis/i, /\bonline\b/i,
    /gestoría/i, /gestoria/i, /asesor/i, /experto/i, /contratar/i
  ],
  informational: [
    /qué.*es/i, /que.*es/i, /cómo/i, /como/i, /cuándo/i, /cuando/i,
    /requisitos/i, /guía/i, /guia/i, /tutorial/i, /explicación/i,
    /diferencia/i, /ejemplo/i, /significado/i
  ]
};

/**
 * Check if keyword should be discarded
 */
const shouldDiscard = (keyword) => {
  const kw = keyword.toLowerCase().trim();

  // Check all discard patterns
  for (const pattern of DISCARD_PATTERNS) {
    if (pattern.test(kw)) {
      // Determine reason
      if (COMPETITORS.some(p => p.test(kw))) {
        return { discard: true, reason: 'Competidor' };
      }
      if (TYPO_PATTERNS.some(p => p.test(kw))) {
        return { discard: true, reason: 'Posible typo' };
      }
      if (GENERIC_PATTERNS.some(p => p.test(kw))) {
        return { discard: true, reason: 'Término genérico' };
      }
      if (/^.{1,2}$/.test(kw)) {
        return { discard: true, reason: 'Muy corto' };
      }
      if (/^\d+$/.test(kw)) {
        return { discard: true, reason: 'Solo números' };
      }
      return { discard: true, reason: 'No relevante' };
    }
  }

  return { discard: false, reason: '' };
};

/**
 * Find main category for keyword
 */
const findCategory = (keyword) => {
  const kw = keyword.toLowerCase();
  let bestMatch = { category: 'Otros', score: 0 };

  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(kw)) {
        // Score based on pattern specificity
        const score = pattern.source.length + (pattern.source.includes('\\b') ? 5 : 0);
        if (score > bestMatch.score) {
          bestMatch = { category, score };
        }
      }
    }
  }

  return bestMatch.category;
};

/**
 * Find subcategory for keyword
 */
const findSubCategory = (keyword, mainCategory) => {
  const kw = keyword.toLowerCase();
  const patterns = SUBCATEGORY_PATTERNS[mainCategory];

  if (!patterns) return '';

  for (const [subCategory, pattern] of Object.entries(patterns)) {
    if (pattern.test(kw)) {
      return subCategory;
    }
  }

  return '';
};

/**
 * Determine intent
 */
const determineIntent = (keyword) => {
  const kw = keyword.toLowerCase();

  // Check transactional first (more specific)
  for (const pattern of INTENT_PATTERNS.transactional) {
    if (pattern.test(kw)) {
      return 'Transactional';
    }
  }

  return 'Informational';
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
      discardReason: discardCheck.reason
    };
  }

  // Check historical data for exact match
  if (historicalData.length > 0) {
    const exactMatch = historicalData.find(h =>
      h.keyword.toLowerCase().trim() === kw
    );
    if (exactMatch) {
      return {
        keyword,
        mainCategory: exactMatch.mainCategory,
        subCategory: exactMatch.subCategory || '',
        intent: determineIntent(kw),
        shouldDiscard: false,
        discardReason: ''
      };
    }

    // Check for similar matches (2+ common significant words)
    for (const hist of historicalData) {
      const histWords = hist.keyword.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const kwWords = kw.split(/\s+/).filter(w => w.length > 3);
      const commonWords = histWords.filter(w => kwWords.includes(w));

      if (commonWords.length >= 2 || (commonWords.length === 1 && histWords.length === 1)) {
        return {
          keyword,
          mainCategory: hist.mainCategory,
          subCategory: hist.subCategory || '',
          intent: determineIntent(kw),
          shouldDiscard: false,
          discardReason: ''
        };
      }
    }
  }

  // Pattern-based classification
  const mainCategory = findCategory(kw);
  const subCategory = findSubCategory(kw, mainCategory);
  const intent = determineIntent(kw);

  return {
    keyword,
    mainCategory,
    subCategory,
    intent,
    shouldDiscard: false,
    discardReason: ''
  };
};

/**
 * Classify keywords in batches
 */
export const classifyKeywordsLocally = async (keywords, historicalData = [], onProgress) => {
  const results = [];
  const batchSize = 50;

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
    await new Promise(r => setTimeout(r, 30));
  }

  return results;
};

export default classifyKeywordsLocally;
