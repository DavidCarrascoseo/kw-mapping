/**
 * URL Keyword Generator
 * Generates relevant keywords from URL slugs while preserving search intent
 */

// Intent/action words that define the search intent - must be preserved
const INTENT_WORDS = [
  'alta', 'baja', 'solicitar', 'pedir', 'conseguir', 'obtener', 'tramitar',
  'como', 'que es', 'donde', 'cuando', 'por que', 'cual', 'cuales',
  'presentar', 'rellenar', 'cumplimentar', 'descargar', 'imprimir',
  'calcular', 'consultar', 'verificar', 'comprobar', 'validar',
  'renovar', 'modificar', 'cambiar', 'anular', 'cancelar',
  'requisitos', 'documentos', 'plazo', 'precio', 'coste'
];

// Words to filter out (articles, prepositions, etc.)
const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'al', 'a', 'en', 'con', 'por', 'para', 'sin',
  'sobre', 'entre', 'desde', 'hasta', 'durante', 'mediante',
  'es', 'son', 'ser', 'estar', 'hay', 'tiene', 'tienen',
  'se', 'su', 'sus', 'mi', 'mis', 'tu', 'tus', 'y', 'o', 'e', 'u',
  'mas', 'pero', 'si', 'no', 'como' // 'como' as conjunction, not as 'how to'
]);

// Specific topics that are valid standalone keywords (contain numbers, codes, etc.)
const isSpecificTopic = (words) => {
  const text = words.join(' ');
  // Contains numbers (like "modelo 036", "irpf 2024")
  if (/\d+/.test(text)) return true;
  // Contains known specific terms
  if (/modelo|formulario|certificado|dni|nie|nif|cif|iban|sepe|inem|tgss|aeat/i.test(text)) return true;
  // Short specific codes
  if (words.length === 1 && words[0].length <= 4 && /^[a-z0-9]+$/i.test(words[0])) return true;
  return false;
};

/**
 * Extract intent word(s) from the beginning of a slug
 */
const extractIntent = (words) => {
  // Check for multi-word intents first (like "que es", "por que")
  if (words.length >= 2) {
    const twoWords = words.slice(0, 2).join(' ');
    if (INTENT_WORDS.includes(twoWords)) {
      return { intent: twoWords, remaining: words.slice(2) };
    }
  }

  // Check single word intent
  if (words.length >= 1 && INTENT_WORDS.includes(words[0])) {
    return { intent: words[0], remaining: words.slice(1) };
  }

  return { intent: null, remaining: words };
};

/**
 * Generate keywords from a URL
 * @param {string} url - The URL to extract keywords from
 * @returns {string[]} - Array of generated keywords
 */
export const generateKeywordsFromURL = (url) => {
  if (!url) return [];

  try {
    // Extract the slug (last path segment)
    const path = url.replace(/https?:\/\/[^\/]+/, '').replace(/\/$/, '');
    const segments = path.split('/').filter(s => s && s.length > 2);

    if (segments.length === 0) return [];

    const slug = segments[segments.length - 1];

    // Convert slug to words
    const allWords = slug
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 0);

    if (allWords.length === 0) return [];

    // Extract intent
    const { intent, remaining } = extractIntent(allWords);

    // Filter stop words from remaining (but keep them for full phrase)
    const meaningfulWords = remaining.filter(w => !STOP_WORDS.has(w) && w.length > 1);

    const keywords = [];

    // 1. Full phrase with intent (always include if there's an intent)
    if (intent && meaningfulWords.length > 0) {
      keywords.push(`${intent} ${meaningfulWords.join(' ')}`);
    }

    // 2. If we have specific topic words (numbers, codes), generate base keyword
    if (meaningfulWords.length > 0 && isSpecificTopic(meaningfulWords)) {
      // Just the specific topic (without the action verb if present)
      const actionVerbs = ['presentar', 'solicitar', 'tramitar', 'rellenar', 'descargar', 'calcular', 'obtener', 'conseguir', 'pedir', 'renovar', 'modificar', 'anular'];

      // If first word is an action verb, the base topic is everything after it
      if (actionVerbs.includes(meaningfulWords[0]) && meaningfulWords.length > 1) {
        const baseTopic = meaningfulWords.slice(1).join(' ');
        if (isSpecificTopic(meaningfulWords.slice(1))) {
          keywords.push(baseTopic);
        }
      } else {
        // No action verb, use full meaningful words as topic
        keywords.push(meaningfulWords.join(' '));
      }
    }

    // 3. For longer phrases with action verbs, create verb + topic combinations
    // Only if the intent is a question word (como, que es, etc.) and there's an action verb
    if (intent && meaningfulWords.length >= 2) {
      const questionIntents = ['como', 'que es', 'donde', 'cuando', 'por que', 'cual'];
      if (questionIntents.includes(intent)) {
        // Check if first meaningful word is an action verb
        const actionVerbs = ['presentar', 'solicitar', 'tramitar', 'rellenar', 'descargar', 'calcular', 'obtener', 'conseguir', 'pedir', 'renovar'];
        if (actionVerbs.includes(meaningfulWords[0])) {
          // Create: action verb + topic (e.g., "presentar modelo 036")
          const verbPlusTopic = meaningfulWords.join(' ');
          if (!keywords.includes(verbPlusTopic)) {
            keywords.push(verbPlusTopic);
          }
        }
      }
    }

    // 4. If no intent but specific topic, just use the topic
    if (!intent && meaningfulWords.length > 0 && isSpecificTopic(meaningfulWords)) {
      keywords.push(meaningfulWords.join(' '));
    }

    // Remove duplicates and empty strings
    return [...new Set(keywords.filter(k => k && k.trim().length > 2))];

  } catch (error) {
    console.error('Error generating keywords from URL:', url, error);
    return [];
  }
};

/**
 * Generate keywords for multiple URLs
 * @param {string[]} urls - Array of URLs
 * @returns {Map<string, string[]>} - Map of URL to generated keywords
 */
export const generateKeywordsForURLs = (urls) => {
  const result = new Map();

  for (const url of urls) {
    const keywords = generateKeywordsFromURL(url);
    if (keywords.length > 0) {
      result.set(url, keywords);
    }
  }

  return result;
};

export default {
  generateKeywordsFromURL,
  generateKeywordsForURLs
};
