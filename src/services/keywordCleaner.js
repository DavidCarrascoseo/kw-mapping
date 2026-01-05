/**
 * Keyword Cleaning and Deduplication Service
 * Cleans, deduplicates, and filters keywords for quality
 */

/**
 * Normalize text removing accents for comparison
 */
const normalizeAccents = (text) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

/**
 * Normalize text fully for comparison
 */
const normalize = (text) => {
  return normalizeAccents(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Check if two keywords are essentially the same
 * (differ only by accents, minor spelling, or word order)
 */
export const areSameKeyword = (kw1, kw2) => {
  const n1 = normalize(kw1);
  const n2 = normalize(kw2);

  // Exact match after normalization
  if (n1 === n2) return true;

  // Check if only differ by accents
  if (normalizeAccents(kw1) === normalizeAccents(kw2)) return true;

  // Check same words different order
  const words1 = n1.split(' ').sort().join(' ');
  const words2 = n2.split(' ').sort().join(' ');
  if (words1 === words2) return true;

  return false;
};

/**
 * Calculate similarity between two keywords (0-1)
 */
const calculateSimilarity = (kw1, kw2) => {
  const n1 = normalize(kw1);
  const n2 = normalize(kw2);

  if (n1 === n2) return 1;

  const words1 = new Set(n1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(n2.split(' ').filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;

  return intersection / union;
};

/**
 * Check if keyword looks like a typo
 */
const isTypo = (keyword) => {
  const kw = keyword.toLowerCase();

  // Too many consecutive consonants
  if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(kw)) return true;

  // Repeated characters (4+)
  if (/(.)\1{3,}/.test(kw)) return true;

  // Too short words mixed with long (likely typo)
  const words = kw.split(' ');
  if (words.length > 1) {
    const hasVeryShort = words.some(w => w.length === 1 && !/^[yaou]$/i.test(w));
    if (hasVeryShort) return true;
  }

  return false;
};

/**
 * Check if keyword contains spam patterns
 */
const isSpam = (keyword) => {
  const kw = keyword.toLowerCase();

  // Phone numbers
  if (/\d{9,}/.test(kw)) return true;

  // Email patterns
  if (/@|\.com|\.es|\.org/.test(kw)) return true;

  // URLs
  if (/https?:|www\.|\.html/.test(kw)) return true;

  return false;
};

/**
 * Check if keyword contains a year (1900-2039)
 */
const containsYear = (keyword) => {
  return /\b(19\d{2}|20[0-3]\d)\b/.test(keyword);
};

/**
 * Deduplicate keywords keeping the one with highest volume
 * Groups similar keywords and keeps the best one
 */
export const deduplicateKeywords = (keywords) => {
  // Sort by volume descending
  const sorted = [...keywords].sort((a, b) => (b.volume || 0) - (a.volume || 0));

  const kept = [];
  const removed = [];

  for (const kw of sorted) {
    // Check if we already have a similar keyword
    const similar = kept.find(k =>
      areSameKeyword(k.keyword, kw.keyword) ||
      calculateSimilarity(k.keyword, kw.keyword) > 0.85
    );

    if (similar) {
      removed.push({
        ...kw,
        reason: `Duplicado de "${similar.keyword}"`
      });
    } else {
      kept.push(kw);
    }
  }

  return { kept, removed };
};

/**
 * Clean keywords for a URL group
 * - Remove typos
 * - Remove spam
 * - Remove off-topic
 * - Remove duplicates (keep highest volume)
 * - Remove accent-only variants
 */
export const cleanKeywordsForURL = (url, keywords, urlTopics = []) => {
  const cleaned = [];
  const discarded = [];

  // First pass: remove obvious bad keywords
  for (const kw of keywords) {
    const keyword = kw.keyword || kw;
    const volume = kw.volume || 0;

    // Check for years (1900-2039)
    if (containsYear(keyword)) {
      discarded.push({ keyword, volume, reason: 'Contiene año' });
      continue;
    }

    // Check for typos
    if (isTypo(keyword)) {
      discarded.push({ keyword, volume, reason: 'Posible typo' });
      continue;
    }

    // Check for spam
    if (isSpam(keyword)) {
      discarded.push({ keyword, volume, reason: 'Spam' });
      continue;
    }

    // Check minimum length
    if (keyword.length < 3) {
      discarded.push({ keyword, volume, reason: 'Muy corto' });
      continue;
    }

    cleaned.push({ keyword, volume });
  }

  // Second pass: deduplicate
  const { kept, removed } = deduplicateKeywords(cleaned);
  discarded.push(...removed);

  // Third pass: check topic relevance if we have URL topics
  const final = [];
  if (urlTopics.length > 0) {
    for (const kw of kept) {
      const kwNorm = normalize(kw.keyword);
      const isRelevant = urlTopics.some(topic =>
        kwNorm.includes(normalize(topic)) ||
        normalize(topic).includes(kwNorm.split(' ')[0])
      );

      // Keep if relevant OR if high volume (might be important)
      if (isRelevant || kw.volume > 100) {
        final.push(kw);
      } else {
        // Check if at least some words overlap
        const kwWords = new Set(kwNorm.split(' ').filter(w => w.length > 3));
        const topicWords = new Set(urlTopics.flatMap(t => normalize(t).split(' ')).filter(w => w.length > 3));
        const overlap = [...kwWords].some(w => topicWords.has(w));

        if (overlap || kw.volume > 50) {
          final.push(kw);
        } else {
          discarded.push({ ...kw, reason: 'Fuera de temática' });
        }
      }
    }
  } else {
    final.push(...kept);
  }

  return { cleaned: final, discarded };
};

/**
 * Extract main topic/seed keyword from URL
 */
export const extractURLTopic = (url) => {
  if (!url) return [];

  // Get the last meaningful path segment
  const path = url.replace(/https?:\/\/[^\/]+/, '').replace(/\/$/, '');
  const segments = path.split('/').filter(s => s && s.length > 2);

  if (segments.length === 0) return [];

  // Get the last segment (usually the article slug)
  const slug = segments[segments.length - 1];

  // Convert slug to words
  const words = slug
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .filter(w => w.length > 2)
    .map(w => w.toLowerCase());

  // Also include parent categories
  const categories = segments.slice(0, -1).map(s =>
    s.replace(/-/g, ' ').replace(/_/g, ' ').toLowerCase()
  );

  return [...new Set([...words, ...categories])];
};

/**
 * Find the best seed keyword for expansion
 * (the most representative keyword with good volume)
 */
export const findSeedKeyword = (keywords, urlTopics = []) => {
  if (keywords.length === 0) return null;

  // Score each keyword
  const scored = keywords.map(kw => {
    let score = 0;
    const kwNorm = normalize(kw.keyword);

    // Volume score (normalized)
    const maxVol = Math.max(...keywords.map(k => k.volume || 0));
    if (maxVol > 0) {
      score += (kw.volume / maxVol) * 30;
    }

    // Length score (prefer medium length)
    const words = kwNorm.split(' ').length;
    if (words >= 2 && words <= 4) score += 20;
    else if (words === 1 || words === 5) score += 10;

    // Topic relevance score
    if (urlTopics.length > 0) {
      const matches = urlTopics.filter(t => kwNorm.includes(normalize(t)));
      score += matches.length * 15;
    }

    // Prefer informational intent (better for expansion)
    if (/que es|como|cuando|donde|por que|cual/i.test(kw.keyword)) {
      score += 10;
    }

    return { ...kw, score };
  });

  // Return the highest scored
  scored.sort((a, b) => b.score - a.score);
  return scored[0];
};

export default {
  cleanKeywordsForURL,
  deduplicateKeywords,
  extractURLTopic,
  findSeedKeyword,
  areSameKeyword,
  calculateSimilarity
};
