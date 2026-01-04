/**
 * Semantic Keyword Expansion Service
 * Finds semantically related keywords that can share the same URL/intent
 */

import { getRelatedKeywords } from './sistrix';

/**
 * Normalize text for comparison
 */
const normalize = (text) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Extract core semantic tokens from keyword
 */
const extractTokens = (keyword) => {
  const stopWords = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'al', 'en', 'con',
    'por', 'para', 'que', 'como', 'cuando', 'donde', 'cual', 'y', 'o', 'a',
    'es', 'son', 'se', 'su', 'sus', 'mi', 'tu', 'qué', 'cómo', 'cuándo'
  ]);

  return normalize(keyword)
    .split(' ')
    .filter(w => w.length > 2 && !stopWords.has(w));
};

/**
 * Calculate semantic similarity between two keywords
 * Returns a score from 0 to 1
 */
export const calculateSemanticSimilarity = (kw1, kw2) => {
  const tokens1 = extractTokens(kw1);
  const tokens2 = extractTokens(kw2);

  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  let matchScore = 0;

  for (const t1 of tokens1) {
    for (const t2 of tokens2) {
      if (t1 === t2) {
        matchScore += 1;
      } else if (t1.length > 4 && t2.length > 4) {
        // Stem matching
        const stem1 = t1.substring(0, Math.min(t1.length - 1, 5));
        const stem2 = t2.substring(0, Math.min(t2.length - 1, 5));
        if (stem1 === stem2) {
          matchScore += 0.8;
        } else if (t1.includes(t2) || t2.includes(t1)) {
          matchScore += 0.5;
        }
      }
    }
  }

  // Normalize by average length
  const avgLength = (tokens1.length + tokens2.length) / 2;
  return Math.min(matchScore / avgLength, 1);
};

/**
 * Check if two keywords share the same search intent
 * They should be able to be satisfied by the same page
 */
export const sharesSameIntent = (kw1, kw2) => {
  const tokens1 = extractTokens(kw1);
  const tokens2 = extractTokens(kw2);

  // Must share at least one core token
  const hasCommonToken = tokens1.some(t1 =>
    tokens2.some(t2 => t1 === t2 || (t1.length > 4 && t2.length > 4 && t1.substring(0, 5) === t2.substring(0, 5)))
  );

  if (!hasCommonToken) return false;

  // Check for intent modifiers that would change the page type
  const intentModifiers = {
    'how': ['como', 'cómo', 'hacer', 'calcular', 'rellenar', 'presentar'],
    'what': ['que', 'qué', 'significa', 'definicion', 'concepto'],
    'when': ['cuando', 'cuándo', 'plazo', 'fecha', 'calendario'],
    'cost': ['precio', 'coste', 'cuanto', 'cuánto', 'cuesta', 'gratis'],
    'compare': ['mejor', 'comparar', 'comparativa', 'vs', 'diferencia'],
    'buy': ['contratar', 'comprar', 'solicitar', 'descargar']
  };

  // Get intent types for each keyword
  const getIntentType = (tokens) => {
    for (const [intent, modifiers] of Object.entries(intentModifiers)) {
      if (tokens.some(t => modifiers.some(m => t.includes(m) || m.includes(t)))) {
        return intent;
      }
    }
    return 'informational';
  };

  const intent1 = getIntentType(tokens1);
  const intent2 = getIntentType(tokens2);

  // Compatible intents can share a page
  const compatibleIntents = {
    'how': ['what', 'when', 'informational'],
    'what': ['how', 'informational'],
    'when': ['how', 'informational'],
    'cost': ['compare', 'buy'],
    'compare': ['cost', 'buy'],
    'buy': ['cost', 'compare'],
    'informational': ['how', 'what', 'when']
  };

  return intent1 === intent2 ||
         compatibleIntents[intent1]?.includes(intent2) ||
         compatibleIntents[intent2]?.includes(intent1);
};

/**
 * Group keywords by semantic similarity
 * Keywords in the same group can potentially share a URL
 */
export const groupBySemantic = (keywords) => {
  const groups = [];
  const assigned = new Set();

  // Sort by length (longer keywords first as they're more specific)
  const sorted = [...keywords].sort((a, b) => b.length - a.length);

  for (const kw of sorted) {
    if (assigned.has(kw)) continue;

    const group = {
      primary: kw,
      related: []
    };

    for (const other of sorted) {
      if (other === kw || assigned.has(other)) continue;

      const similarity = calculateSemanticSimilarity(kw, other);
      const sameIntent = sharesSameIntent(kw, other);

      if (similarity >= 0.5 && sameIntent) {
        group.related.push({
          keyword: other,
          similarity
        });
        assigned.add(other);
      }
    }

    assigned.add(kw);
    groups.push(group);
  }

  return groups;
};

/**
 * Find related keywords for expansion (using SISTRIX if available)
 * Only for keywords with >20 searches
 */
export const expandKeywords = async (keyword, volume, existingKeywords, sistrixApiKey, country) => {
  const suggestions = [];

  // Only expand if volume > 20
  if (volume <= 20) {
    return suggestions;
  }

  // Try SISTRIX first
  if (sistrixApiKey) {
    const related = await getRelatedKeywords(keyword, sistrixApiKey, country, 15);
    if (related && related.length > 0) {
      for (const r of related) {
        // Check if not already in our list
        const normalized = normalize(r.keyword);
        const alreadyExists = existingKeywords.some(k =>
          normalize(k) === normalized || calculateSemanticSimilarity(k, r.keyword) > 0.8
        );

        if (!alreadyExists && sharesSameIntent(keyword, r.keyword)) {
          suggestions.push({
            keyword: r.keyword,
            searchVolume: r.searchVolume,
            source: 'sistrix',
            similarity: calculateSemanticSimilarity(keyword, r.keyword),
            reason: 'Relacionada semánticamente'
          });
        }
      }
    }
  }

  // Also check local semantic expansion
  const tokens = extractTokens(keyword);

  // Generate variations
  const variations = generateVariations(keyword, tokens);
  for (const v of variations) {
    const alreadyExists = existingKeywords.some(k =>
      normalize(k) === normalize(v) || calculateSemanticSimilarity(k, v) > 0.8
    );

    if (!alreadyExists && !suggestions.some(s => normalize(s.keyword) === normalize(v))) {
      suggestions.push({
        keyword: v,
        searchVolume: null, // Would need to lookup
        source: 'local',
        similarity: 0.7,
        reason: 'Variación semántica'
      });
    }
  }

  return suggestions.slice(0, 10); // Limit to 10 suggestions
};

/**
 * Generate keyword variations based on common patterns
 */
const generateVariations = (keyword, tokens) => {
  const variations = [];
  const normalized = normalize(keyword);

  // Question variations
  const questionPrefixes = ['como', 'que es', 'cuando', 'donde', 'por que', 'cual'];
  const hasQuestion = questionPrefixes.some(q => normalized.startsWith(q));

  if (!hasQuestion && tokens.length > 0) {
    // Add question forms
    variations.push(`como ${normalized}`);
    variations.push(`que es ${normalized}`);
  }

  // Year variations
  const currentYear = new Date().getFullYear();
  if (!normalized.includes(String(currentYear))) {
    variations.push(`${normalized} ${currentYear}`);
  }

  // Action variations
  const actionWords = ['calcular', 'hacer', 'presentar', 'rellenar'];
  const hasAction = actionWords.some(a => normalized.includes(a));

  if (!hasAction && tokens.length <= 3) {
    variations.push(`como hacer ${normalized}`);
    variations.push(`calcular ${normalized}`);
  }

  return variations.filter(v => v !== normalized && v.length > 5);
};

/**
 * Analyze URL keywords group for potential expansions
 */
export const analyzeForExpansion = async (urlKeywords, sistrixApiKey, country) => {
  const allExpansions = [];
  const existingKeywords = urlKeywords.map(k => k.keyword);

  // Find high-volume keywords to expand
  const highVolumeKws = urlKeywords
    .filter(k => parseInt(k.volume || 0) > 20)
    .sort((a, b) => parseInt(b.volume || 0) - parseInt(a.volume || 0))
    .slice(0, 3); // Top 3 by volume

  for (const kw of highVolumeKws) {
    const expansions = await expandKeywords(
      kw.keyword,
      parseInt(kw.volume || 0),
      existingKeywords,
      sistrixApiKey,
      country
    );

    if (expansions.length > 0) {
      allExpansions.push({
        seedKeyword: kw.keyword,
        seedVolume: kw.volume,
        expansions
      });
    }
  }

  return allExpansions;
};
