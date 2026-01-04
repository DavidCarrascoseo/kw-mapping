/**
 * Enhanced Local Classifier
 * Main Category from URL, Subcategories from keyword content
 * All keywords in same URL share the same classification
 */

// ============ URL TO MAIN CATEGORY MAPPING ============

const URL_CATEGORY_MAP = [
  { pattern: /\/diccionario\//i, category: 'Diccionario' },
  { pattern: /\/blog\//i, category: 'Blog' },
  { pattern: /\/calculadora/i, category: 'Calculadoras' },
  { pattern: /\/servicios\//i, category: 'Servicios' },
  { pattern: /\/autonomos\//i, category: 'Guías' },
  { pattern: /\/empresas\//i, category: 'Guías' },
  { pattern: /\/renta\//i, category: 'Guías' },
  { pattern: /\/guia/i, category: 'Guías' }
];

/**
 * Extract main category from URL
 */
export const getCategoryFromURL = (url) => {
  if (!url) return 'Otros';

  for (const { pattern, category } of URL_CATEGORY_MAP) {
    if (pattern.test(url)) {
      return category;
    }
  }

  return 'Otros';
};

// ============ DISCARD PATTERNS ============

const COMPETITORS = [
  /\btaxdown\b/i, /\banfix\b/i, /\bholded\b/i, /\bquipu\b/i, /\bsage\b/i,
  /\bcontasol\b/i, /\bfactorial\b/i, /\ba3\b.*software/i, /\bwolters/i,
  /\bgetquipu\b/i, /\bbillin\b/i, /\bcontaplus\b/i, /\bcontasimple\b/i,
  /\bdebitoor\b/i, /\bfacturadirecta\b/i
];

// Years to discard (past and future years)
const YEAR_PATTERN = /\b(19\d{2}|20[0-3]\d)\b/;

const shouldDiscard = (keyword) => {
  const kw = keyword.toLowerCase().trim();

  if (kw.length <= 2) return { discard: true, reason: 'Muy corto' };
  if (/^\d+$/.test(kw)) return { discard: true, reason: 'Solo números' };

  // Discard keywords with years
  if (YEAR_PATTERN.test(kw)) return { discard: true, reason: 'Contiene año' };

  for (const pattern of COMPETITORS) {
    if (pattern.test(kw)) return { discard: true, reason: 'Competidor' };
  }

  return { discard: false, reason: '' };
};

// ============ SUBCATEGORY 1 (TOPIC) PATTERNS ============

const SUBCATEGORY1_RULES = {
  'Autónomos': [
    /\bautónom[oa]s?\b/i, /\bautonomo[s]?\b/i, /\bfreelance/i,
    /\breta\b/i, /cuota.*autónom/i, /tarifa.*plana/i,
    /pluriactividad/i, /aut[oó]nomo.*societario/i
  ],
  'Renta': [
    /declaraci[oó]n.*renta/i, /renta\s+\d{4}/i, /\birpf\b/i,
    /borrador/i, /casilla/i, /devoluci[oó]n.*renta/i,
    /declarar.*renta/i, /hacer.*renta/i
  ],
  'Empresas': [
    /sociedad.*limitada/i, /\bs\.?l\.?\b/i, /\bs\.?a\.?\b/i,
    /impuesto.*sociedades/i, /crear.*empresa/i, /montar.*empresa/i,
    /registro.*mercantil/i, /\bempresa[s]?\b/i, /\bpyme/i
  ],
  'Trámites': [
    /modelo.*\d{3}/i, /\baeat\b/i, /agencia.*tributaria/i,
    /\bnie\b/i, /\bnif\b/i, /\bcif\b/i, /certificado/i,
    /tr[aá]mite/i, /\bmodelo\b/i
  ],
  'Facturación': [
    /factura/i, /facturaci[oó]n/i, /emitir.*factura/i,
    /\brecibo/i, /\balbar[aá]n/i
  ],
  'Inversiones': [
    /cripto/i, /bitcoin/i, /ethereum/i, /inversi[oó]n/i,
    /acciones/i, /bolsa/i, /dividendo/i, /plusval[ií]a/i
  ],
  'TaxScouts': [
    /taxscouts/i, /tax\s*scouts/i
  ]
};

// ============ SUBCATEGORY 2 (SPECIFIC) PATTERNS ============

const SUBCATEGORY2_RULES = {
  'Autónomos': {
    'Ayudas y Beneficios': /ayuda|beneficio|subvenci[oó]n|bonificaci[oó]n|capitaliza/i,
    'Declaraciones de Impuestos': /declaraci[oó]n|impuesto|trimestral|modelo.*\d/i,
    'Epígrafes IAE': /ep[ií]grafe|iae|actividad.*econ[oó]mica/i,
    'Ingresos y Gastos Deducibles': /ingreso|gasto|deducible|deducci[oó]n/i,
    'Nuevos Autónomos': /nuevo|alta|empezar|comenzar|iniciar|primer/i,
    'Profesiones': /profesi[oó]n|abogado|m[eé]dico|arquitecto|ingeniero/i,
    'Trámites y Documentos': /tr[aá]mite|documento|formulario|solicitud/i
  },
  'Renta': {
    '(General / Landing Principal)': /^declaraci[oó]n.*renta$|^renta\s*\d{4}$/i,
    'Casos Excepcionales': /excepcional|especial|extranjero|herencia|premio/i,
    'Casos Frecuentes': /frecuente|com[uú]n|normal|b[aá]sico/i,
    'Deducciones': /deducci[oó]n|deducir|desgravar/i,
    'Trámites y Plazos': /plazo|fecha|calendario|presentar|l[ií]mite/i
  },
  'Empresas': {
    '(General / Landing Principal)': /^crear.*empresa$|^montar.*empresa$/i,
    'Crear una Sociedad Limitada': /crear|constituir|montar|sl\b|sociedad.*limitada/i,
    'Impuestos': /impuesto|tributo|fiscal|sociedades/i,
    'Socios': /socio|participaci[oó]n|dividendo|junta/i,
    'Trámites y Documentos Empresas': /tr[aá]mite|documento|registro|mercantil/i
  },
  'Trámites': {
    '(General)': /tr[aá]mite|certificado|documento/i,
    'Modelos': /modelo.*\d{3}|formulario/i,
    'Otros Trámites': /nie|nif|cif|solicitud/i
  }
};

/**
 * Find subcategory 1 (topic) from keyword
 */
const findSubcategory1 = (keyword) => {
  const kw = keyword.toLowerCase();

  for (const [category, patterns] of Object.entries(SUBCATEGORY1_RULES)) {
    for (const pattern of patterns) {
      if (pattern.test(kw)) {
        return category;
      }
    }
  }

  return null;
};

/**
 * Find subcategory 2 from keyword
 */
const findSubcategory2 = (keyword, subcat1) => {
  if (!subcat1 || !SUBCATEGORY2_RULES[subcat1]) return '';

  const kw = keyword.toLowerCase();
  const rules = SUBCATEGORY2_RULES[subcat1];

  for (const [subcat, pattern] of Object.entries(rules)) {
    if (pattern.test(kw)) {
      return subcat;
    }
  }

  return '';
};

/**
 * Determine intent
 */
const determineIntent = (keyword) => {
  const kw = keyword.toLowerCase();

  const transactional = [
    /contratar/i, /solicitar/i, /comprar/i, /precio/i,
    /programa/i, /software/i, /\bonline\b/i, /mejor/i
  ];

  for (const pattern of transactional) {
    if (pattern.test(kw)) return 'Transactional';
  }

  return 'Informational';
};

/**
 * Extract topics for semantic matching
 */
export const extractTopics = (keyword) => {
  const kw = keyword.toLowerCase();
  const topics = [];

  const patterns = {
    'autonomos': /aut[oó]nomo|freelance|reta\b/i,
    'renta': /renta|irpf|declaraci[oó]n/i,
    'empresas': /empresa|sociedad|pyme/i,
    'facturacion': /factura/i,
    'inversiones': /inversi[oó]n|cripto|bitcoin|acciones/i,
    'tramites': /tr[aá]mite|modelo|certificado/i
  };

  for (const [topic, pattern] of Object.entries(patterns)) {
    if (pattern.test(kw)) topics.push(topic);
  }

  return topics;
};

/**
 * Classify a single keyword (without URL context)
 */
const classifyKeyword = (keyword, historicalData = []) => {
  const kw = keyword.toLowerCase().trim();

  const discardCheck = shouldDiscard(kw);
  if (discardCheck.discard) {
    return {
      keyword,
      subCategory1: null,
      subCategory2: '',
      intent: 'Informational',
      shouldDiscard: true,
      discardReason: discardCheck.reason,
      topics: []
    };
  }

  const subCategory1 = findSubcategory1(kw);
  const subCategory2 = findSubcategory2(kw, subCategory1);
  const intent = determineIntent(kw);
  const topics = extractTopics(kw);

  return {
    keyword,
    subCategory1,
    subCategory2,
    intent,
    shouldDiscard: false,
    discardReason: '',
    topics
  };
};

/**
 * Determine the best subcategories for a URL group
 * All keywords in a URL should share the same classification
 */
export const classifyURLGroup = (url, keywords, historicalData = []) => {
  // Main category from URL
  const mainCategory = getCategoryFromURL(url);

  // Count subcategory votes from all keywords
  const subcat1Votes = {};
  const subcat2Votes = {};
  const intents = { Informational: 0, Transactional: 0 };

  const keywordResults = [];

  for (const kw of keywords) {
    const result = classifyKeyword(kw.keyword || kw, historicalData);
    keywordResults.push(result);

    if (!result.shouldDiscard) {
      if (result.subCategory1) {
        subcat1Votes[result.subCategory1] = (subcat1Votes[result.subCategory1] || 0) + 1;
      }
      if (result.subCategory2) {
        subcat2Votes[result.subCategory2] = (subcat2Votes[result.subCategory2] || 0) + 1;
      }
      intents[result.intent]++;
    }
  }

  // Get winning subcategories
  const subCategory1 = Object.entries(subcat1Votes)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  const subCategory2 = Object.entries(subcat2Votes)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  const intent = intents.Transactional > intents.Informational ? 'Transactional' : 'Informational';

  return {
    mainCategory,
    subCategory1,
    subCategory2,
    intent,
    keywordResults
  };
};

/**
 * Classify keywords in batches (legacy support)
 */
export const classifyKeywordsLocally = async (keywords, historicalData = [], onProgress) => {
  const results = [];
  const batchSize = 100;

  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);

    for (const keyword of batch) {
      if (keyword && keyword.trim()) {
        const result = classifyKeyword(keyword, historicalData);
        results.push({
          keyword,
          mainCategory: result.subCategory1 || 'Otros',
          subCategory: result.subCategory2 || '',
          intent: result.intent,
          shouldDiscard: result.shouldDiscard,
          discardReason: result.discardReason,
          confidence: result.subCategory1 ? 'high' : 'low',
          topics: result.topics
        });
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, keywords.length), keywords.length);
    }

    await new Promise(r => setTimeout(r, 10));
  }

  return results;
};

export default classifyKeywordsLocally;
