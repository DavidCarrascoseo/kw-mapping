/**
 * Enhanced Local Classifier
 * Main Category from URL, Subcategories from URL + keyword content
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

// URL patterns for Subcategory 1
const URL_SUBCAT1_MAP = [
  { pattern: /\/autonomos\//i, subcat: 'Autónomos' },
  { pattern: /\/empresas\//i, subcat: 'Empresas' },
  { pattern: /\/renta\//i, subcat: 'Renta' },
  { pattern: /\/factura/i, subcat: 'Facturación' },
  { pattern: /\/iva\//i, subcat: 'Trámites' },
  { pattern: /\/modelo/i, subcat: 'Trámites' },
  { pattern: /\/inversion/i, subcat: 'Inversiones' },
  { pattern: /\/cripto/i, subcat: 'Inversiones' }
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

/**
 * Extract subcategory 1 from URL
 */
const getSubcat1FromURL = (url) => {
  if (!url) return null;

  for (const { pattern, subcat } of URL_SUBCAT1_MAP) {
    if (pattern.test(url)) {
      return subcat;
    }
  }

  return null;
};

/**
 * Extract topic words from URL slug
 */
const extractURLSlugTopics = (url) => {
  if (!url) return [];

  const path = url.replace(/https?:\/\/[^\/]+/, '').replace(/\/$/, '');
  const segments = path.split('/').filter(s => s && s.length > 2);

  if (segments.length === 0) return [];

  const slug = segments[segments.length - 1];
  return slug
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .filter(w => w.length > 2);
};

// ============ DISCARD PATTERNS ============

const COMPETITORS = [
  /\btaxdown\b/i, /\banfix\b/i, /\bholded\b/i, /\bquipu\b/i, /\bsage\b/i,
  /\bcontasol\b/i, /\bfactorial\b/i, /\ba3\b.*software/i, /\bwolters/i,
  /\bgetquipu\b/i, /\bbillin\b/i, /\bcontaplus\b/i, /\bcontasimple\b/i,
  /\bdebitoor\b/i, /\bfacturadirecta\b/i
];

const YEAR_PATTERN = /\b(19\d{2}|20[0-3]\d)\b/;

const shouldDiscard = (keyword) => {
  const kw = keyword.toLowerCase().trim();

  if (kw.length <= 2) return { discard: true, reason: 'Muy corto' };
  if (/^\d+$/.test(kw)) return { discard: true, reason: 'Solo números' };
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
    /pluriactividad/i, /aut[oó]nomo.*societario/i,
    /cuenta.*propia/i, /trabajador.*independiente/i
  ],
  'Renta': [
    /declaraci[oó]n.*renta/i, /renta\b/i, /\birpf\b/i,
    /borrador/i, /casilla/i, /devoluci[oó]n/i,
    /declarar/i, /hacienda/i, /agencia.*tributaria/i
  ],
  'Empresas': [
    /sociedad/i, /\bs\.?l\.?\b/i, /\bs\.?a\.?\b/i,
    /impuesto.*sociedades/i, /crear.*empresa/i, /montar.*empresa/i,
    /registro.*mercantil/i, /\bempresa[s]?\b/i, /\bpyme/i,
    /\bcorporat/i, /mercantil/i
  ],
  'Trámites': [
    /modelo.*\d{3}/i, /\baeat\b/i,
    /\bnie\b/i, /\bnif\b/i, /\bcif\b/i, /certificado/i,
    /tr[aá]mite/i, /\bmodelo\b/i, /formulario/i
  ],
  'Facturación': [
    /factura/i, /facturaci[oó]n/i,
    /\brecibo/i, /\balbar[aá]n/i, /presupuesto/i
  ],
  'Inversiones': [
    /cripto/i, /bitcoin/i, /ethereum/i, /inversi[oó]n/i,
    /acciones/i, /bolsa/i, /dividendo/i, /plusval[ií]a/i,
    /trading/i, /broker/i
  ],
  'TaxScouts': [
    /taxscouts/i, /tax\s*scouts/i
  ]
};

// ============ SUBCATEGORY 2 (SPECIFIC) PATTERNS ============

const SUBCATEGORY2_RULES = {
  'Autónomos': {
    'Ayudas y Beneficios': /ayuda|beneficio|subvenci[oó]n|bonificaci[oó]n|capitaliza|paro/i,
    'Declaraciones de Impuestos': /declaraci[oó]n|impuesto|trimestral|modelo.*\d|irpf|iva/i,
    'Epígrafes IAE': /ep[ií]grafe|iae|actividad.*econ[oó]mica|cnae/i,
    'Ingresos y Gastos Deducibles': /ingreso|gasto|deducible|deducci[oó]n|desgravar/i,
    'Nuevos Autónomos': /nuevo|alta|empezar|comenzar|iniciar|primer|darse.*alta/i,
    'Profesiones': /profesi[oó]n|abogado|m[eé]dico|arquitecto|ingeniero|consultor|coach/i,
    'Trámites y Documentos': /tr[aá]mite|documento|formulario|solicitud|baja|cese/i,
    '(General / Landing Principal)': /^aut[oó]nomo[s]?$|^freelance$/i
  },
  'Renta': {
    'Deducciones': /deducci[oó]n|deducir|desgravar|reducci[oó]n/i,
    'Trámites y Plazos': /plazo|fecha|calendario|presentar|l[ií]mite|cu[aá]ndo/i,
    'Casos Excepcionales': /excepcional|especial|extranjero|herencia|premio|loteria/i,
    'Casos Frecuentes': /frecuente|com[uú]n|normal|b[aá]sico|general/i,
    '(General / Landing Principal)': /^declaraci[oó]n.*renta$|^renta$|^irpf$/i
  },
  'Empresas': {
    'Crear una Sociedad Limitada': /crear|constituir|montar|abrir|nueva|sl\b|sociedad.*limitada/i,
    'Impuestos': /impuesto|tributo|fiscal|sociedades|is\b/i,
    'Socios': /socio|participaci[oó]n|dividendo|junta|accionista/i,
    'Trámites y Documentos Empresas': /tr[aá]mite|documento|registro|mercantil|escritura/i,
    '(General / Landing Principal)': /^empresa[s]?$|^pyme[s]?$|^sociedad$/i
  },
  'Trámites': {
    'Modelos': /modelo.*\d{3}|modelo.*tributario/i,
    'Otros Trámites': /nie|nif|cif|dni|certificado|solicitud/i,
    '(General)': /^tr[aá]mite[s]?$|^certificado$/i
  },
  'Facturación': {
    'Facturas': /factura|emitir|crear.*factura/i,
    'Software': /programa|software|app|aplicaci[oó]n/i,
    '(General)': /^facturaci[oó]n$/i
  },
  'Inversiones': {
    'Criptomonedas': /cripto|bitcoin|ethereum|blockchain|token/i,
    'Acciones y Bolsa': /acci[oó]n|bolsa|broker|trading/i,
    'Impuestos Inversiones': /impuesto|declarar|plusval[ií]a|ganancia/i,
    '(General)': /^inversi[oó]n|^inversiones$/i
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
 * Find subcategory 2 from keyword and subcategory 1
 */
const findSubcategory2 = (keyword, subcat1) => {
  if (!subcat1 || !SUBCATEGORY2_RULES[subcat1]) return '(General)';

  const kw = keyword.toLowerCase();
  const rules = SUBCATEGORY2_RULES[subcat1];

  for (const [subcat, pattern] of Object.entries(rules)) {
    if (pattern.test(kw)) {
      return subcat;
    }
  }

  return '(General)';
};

/**
 * Infer subcategory from URL slug words
 */
const inferSubcategoryFromSlug = (slugWords) => {
  const text = slugWords.join(' ');

  // Try to match subcategory 1
  for (const [category, patterns] of Object.entries(SUBCATEGORY1_RULES)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return { subcat1: category, subcat2: findSubcategory2(text, category) };
      }
    }
  }

  return { subcat1: null, subcat2: null };
};

/**
 * Determine intent
 */
const determineIntent = (keyword) => {
  const kw = keyword.toLowerCase();

  const transactional = [
    /contratar/i, /solicitar/i, /comprar/i, /precio/i,
    /programa/i, /software/i, /\bonline\b/i, /mejor/i,
    /descargar/i, /gratis/i, /barato/i
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
 * Classify a single keyword
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

  // Try to get subcategory 1 from URL first
  let urlSubcat1 = getSubcat1FromURL(url);

  // Also try to infer from URL slug
  const slugTopics = extractURLSlugTopics(url);
  const slugInferred = inferSubcategoryFromSlug(slugTopics);

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

  // Determine final subcategory 1 (priority: URL > slug > keywords)
  let subCategory1 = urlSubcat1 || slugInferred.subcat1;
  if (!subCategory1) {
    const votedSubcat1 = Object.entries(subcat1Votes).sort((a, b) => b[1] - a[1])[0];
    subCategory1 = votedSubcat1?.[0] || 'Otros';
  }

  // Determine final subcategory 2
  let subCategory2 = slugInferred.subcat2;
  if (!subCategory2 || subCategory2 === '(General)') {
    const votedSubcat2 = Object.entries(subcat2Votes).sort((a, b) => b[1] - a[1])[0];
    subCategory2 = votedSubcat2?.[0] || '(General)';
  }

  // Ensure we have valid subcategories
  if (!subCategory1 || subCategory1 === 'null') subCategory1 = 'Otros';
  if (!subCategory2) subCategory2 = '(General)';

  const intent = intents.Transactional > intents.Informational ? 'Transactional' : 'Informational';

  return {
    mainCategory,
    subCategory1,
    subCategory2,
    intent,
    keywordResults,
    urlTopics: slugTopics
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
          subCategory: result.subCategory2 || '(General)',
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
