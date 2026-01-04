/**
 * Enhanced URL Matching System
 * Semantic matching with intelligent suggestions
 */

import { extractTopics } from '../services/localClassifier';

/**
 * Normalize text for comparison
 */
const normalize = (text) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Extract meaningful words from text
 */
const extractWords = (text) => {
  const stopWords = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al',
    'en', 'con', 'por', 'para', 'que', 'como', 'cuando', 'donde', 'cual',
    'y', 'o', 'a', 'ante', 'bajo', 'sobre', 'entre', 'sin', 'es', 'son',
    'se', 'su', 'sus', 'mi', 'tu', 'the', 'and', 'or', 'to', 'of', 'in'
  ]);

  return normalize(text)
    .split(' ')
    .filter(w => w.length > 2 && !stopWords.has(w));
};

/**
 * Calculate word-level similarity between keyword and URL
 */
export const calculateSimilarity = (keyword, url) => {
  const kwWords = extractWords(keyword);
  const urlWords = extractWords(url.replace(/https?:\/\//, '').replace(/www\./, ''));

  if (kwWords.length === 0) return 0;

  let exactMatches = 0;
  let partialMatches = 0;
  let stemMatches = 0;

  for (const kwWord of kwWords) {
    for (const urlWord of urlWords) {
      if (kwWord === urlWord) {
        exactMatches++;
      } else if (kwWord.length > 4 && urlWord.length > 4) {
        // Stem matching (first 4+ chars)
        const kwStem = kwWord.substring(0, Math.min(kwWord.length - 1, 5));
        const urlStem = urlWord.substring(0, Math.min(urlWord.length - 1, 5));
        if (kwStem === urlStem) {
          stemMatches += 0.7;
        } else if (kwWord.includes(urlWord) || urlWord.includes(kwWord)) {
          partialMatches += 0.5;
        }
      }
    }
  }

  const totalScore = exactMatches + stemMatches + partialMatches;
  return Math.min(totalScore / kwWords.length, 1);
};

/**
 * Calculate topic-based similarity
 */
const calculateTopicSimilarity = (keywordTopics, url) => {
  if (!keywordTopics || keywordTopics.length === 0) return 0;

  const urlLower = url.toLowerCase();
  let matches = 0;

  // Topic to URL path mapping
  const topicPaths = {
    'autonomos': ['autonomo', 'freelance', 'autónomo', 'autonomos'],
    'renta': ['renta', 'irpf', 'declaracion', 'hacienda'],
    'empresas': ['empresa', 'sociedad', 'pyme', 'empresas'],
    'iva': ['iva', 'impuesto'],
    'facturacion': ['factura', 'facturacion'],
    'nominas': ['nomina', 'salario', 'nominas'],
    'inversiones': ['inversion', 'cripto', 'bitcoin', 'acciones', 'inversiones'],
    'herencias': ['herencia', 'sucesion', 'donacion', 'herencias'],
    'alquiler': ['alquiler', 'arrendamiento'],
    'tramites': ['tramite', 'modelo', 'certificado', 'tramites']
  };

  for (const topic of keywordTopics) {
    const paths = topicPaths[topic] || [topic];
    for (const path of paths) {
      if (urlLower.includes(path)) {
        matches++;
        break;
      }
    }
  }

  return matches / keywordTopics.length;
};

/**
 * Analyze URL structure and extract metadata
 */
const analyzeURL = (url) => {
  const urlLower = url.toLowerCase();
  const parts = urlLower.replace(/https?:\/\//, '').split('/').filter(p => p && !p.includes('.'));

  return {
    isRoot: parts.length <= 1,
    depth: parts.length,
    hasCategory: /\/(autonomos?|renta|empresas?|iva|factura|nomina|inversion|herencia|alquiler|tramite)/i.test(urlLower),
    isBlog: /\/blog\//i.test(urlLower),
    isLanding: /\/(servicios?|productos?|landing)/i.test(urlLower),
    segments: parts
  };
};

/**
 * Score a URL match with detailed analysis
 */
const scoreURLMatch = (keyword, url, classification, sistrixData) => {
  const wordSim = calculateSimilarity(keyword, url);
  const topicSim = calculateTopicSimilarity(classification?.topics || extractTopics(keyword), url);
  const urlAnalysis = analyzeURL(url);

  // Base score from word similarity
  let score = wordSim * 0.5;

  // Bonus for topic match
  score += topicSim * 0.3;

  // Bonus for category match in URL
  if (urlAnalysis.hasCategory && classification?.mainCategory) {
    const categorySlug = classification.mainCategory.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z]/g, '');
    if (url.toLowerCase().includes(categorySlug.substring(0, 5))) {
      score += 0.15;
    }
  }

  // Prefer shallow URLs for main topics
  if (urlAnalysis.depth <= 3) {
    score += 0.05;
  }

  return {
    score: Math.min(score, 1),
    wordSimilarity: wordSim,
    topicSimilarity: topicSim,
    urlAnalysis
  };
};

/**
 * Generate suggested URL slug from keyword
 */
const generateSlug = (keyword) => {
  return normalize(keyword)
    .replace(/\s+/g, '-')
    .substring(0, 60);
};

/**
 * Suggest new URL path based on classification
 */
const suggestNewURL = (keyword, classification) => {
  const categoryPaths = {
    'Autónomos': 'autonomos',
    'Renta': 'renta',
    'Empresas': 'empresas',
    'IVA': 'iva',
    'Facturación': 'facturacion',
    'Nóminas': 'nominas',
    'Inversiones': 'inversiones',
    'Herencias': 'herencias',
    'Alquiler': 'alquiler',
    'Trámites': 'tramites',
    'Otros': 'blog'
  };

  const categoryPath = categoryPaths[classification?.mainCategory] || 'blog';
  const slug = generateSlug(keyword);

  // Add subcategory if available
  let subPath = '';
  if (classification?.subCategory) {
    subPath = '/' + normalize(classification.subCategory).replace(/\s+/g, '-').substring(0, 30);
  }

  return `/${categoryPath}${subPath}/${slug}`;
};

/**
 * Find best matching URL with intelligent recommendations
 */
export const findBestURL = (keyword, mainCategory, inventoryUrls, sitemapUrls, sistrixData, domain, classification = null) => {
  const allUrls = [...new Set([...inventoryUrls, ...sitemapUrls])];

  // Build classification if not provided
  if (!classification) {
    classification = {
      mainCategory,
      subCategory: '',
      topics: extractTopics(keyword)
    };
  }

  // Priority 1: SISTRIX ranking URL (already ranking - keep it!)
  if (sistrixData?.rankingUrl) {
    const normalizedUrl = sistrixData.rankingUrl.replace(/https?:\/\//, '').replace(/www\./, '');
    if (normalizedUrl.includes(domain.replace('www.', ''))) {
      return {
        url: sistrixData.rankingUrl,
        score: 1.0,
        exists: 'Yes',
        source: 'sistrix-ranking',
        recommendation: 'keep',
        message: `Ya posicionada en #${sistrixData.currentRanking || '?'}`,
        alternatives: []
      };
    }
  }

  // Score all URLs
  const scoredUrls = allUrls.map(url => {
    const scoreData = scoreURLMatch(keyword, url, classification, sistrixData);
    return {
      url,
      ...scoreData,
      inInventory: inventoryUrls.includes(url),
      inSitemap: sitemapUrls.includes(url)
    };
  }).sort((a, b) => b.score - a.score);

  const bestMatch = scoredUrls[0];
  const alternatives = scoredUrls.slice(1, 4).filter(u => u.score > 0.15);

  // Decision logic
  if (bestMatch && bestMatch.score >= 0.45) {
    // Strong match found
    return {
      url: bestMatch.url,
      score: bestMatch.score,
      exists: 'Yes',
      source: bestMatch.inInventory ? 'inventory' : 'sitemap',
      recommendation: 'use-existing',
      message: `Match ${Math.round(bestMatch.score * 100)}%`,
      alternatives: alternatives.map(a => ({
        url: a.url,
        score: a.score,
        reason: `Alternativa ${Math.round(a.score * 100)}%`
      }))
    };
  } else if (bestMatch && bestMatch.score >= 0.25) {
    // Moderate match - suggest but flag for review
    const suggestedNew = suggestNewURL(keyword, classification);
    return {
      url: bestMatch.url,
      score: bestMatch.score,
      exists: 'Yes',
      source: bestMatch.inInventory ? 'inventory' : 'sitemap',
      recommendation: 'review',
      message: `Revisar: Match ${Math.round(bestMatch.score * 100)}%`,
      suggestedNew,
      alternatives: [
        { url: suggestedNew, score: 0, reason: 'O crear nueva página' },
        ...alternatives.map(a => ({
          url: a.url,
          score: a.score,
          reason: `Alternativa ${Math.round(a.score * 100)}%`
        }))
      ]
    };
  } else {
    // No good match - suggest new URL
    const suggestedNew = suggestNewURL(keyword, classification);

    // Check if there's a category page that could be expanded
    const categoryPage = scoredUrls.find(u =>
      u.urlAnalysis?.hasCategory && u.urlAnalysis?.depth <= 2
    );

    const alts = [];
    if (categoryPage) {
      alts.push({
        url: categoryPage.url,
        score: categoryPage.score,
        reason: 'Ampliar página de categoría'
      });
    }
    alts.push(...alternatives.slice(0, 2).map(a => ({
      url: a.url,
      score: a.score,
      reason: `Match ${Math.round(a.score * 100)}%`
    })));

    return {
      url: suggestedNew,
      score: 0,
      exists: 'No',
      source: 'suggested',
      recommendation: 'create-new',
      message: 'Crear nueva página',
      alternatives: alts
    };
  }
};

/**
 * Group keywords by their target URLs
 */
export const groupKeywordsByURL = (results) => {
  const groups = {};

  for (const result of results) {
    const url = result['Target-URL'] || 'Sin URL';
    if (!groups[url]) {
      groups[url] = {
        url,
        keywords: [],
        totalVolume: 0,
        source: result._source,
        recommendation: result._recommendation,
        exists: result['URL exists'],
        alternatives: result._alternatives || []
      };
    }
    groups[url].keywords.push(result);
    groups[url].totalVolume += parseInt(result['SV'] || 0);
  }

  // Sort keywords within each group by volume
  for (const group of Object.values(groups)) {
    group.keywords.sort((a, b) => parseInt(b['SV'] || 0) - parseInt(a['SV'] || 0));
    // Primary keyword is the one with highest volume
    group.primaryKeyword = group.keywords[0]?.['Keyword'] || '';
  }

  return groups;
};

/**
 * Analyze URL coverage and suggest content gaps
 */
export const analyzeContentGaps = (results, existingUrls) => {
  const gaps = {
    newPagesNeeded: [],
    underutilizedPages: [],
    overloadedPages: []
  };

  const urlGroups = groupKeywordsByURL(results);

  for (const [url, group] of Object.entries(urlGroups)) {
    if (group.exists === 'No') {
      gaps.newPagesNeeded.push({
        suggestedUrl: url,
        keywords: group.keywords.map(k => k['Keyword']),
        totalVolume: group.totalVolume,
        category: group.keywords[0]?.['Main Category']
      });
    } else if (group.keywords.length > 10) {
      gaps.overloadedPages.push({
        url,
        keywordCount: group.keywords.length,
        totalVolume: group.totalVolume,
        suggestion: 'Considerar dividir en múltiples páginas'
      });
    }
  }

  // Find existing URLs with no keywords assigned
  const assignedUrls = new Set(Object.keys(urlGroups).filter(u => u !== 'Sin URL'));
  for (const url of existingUrls) {
    if (!assignedUrls.has(url)) {
      gaps.underutilizedPages.push({
        url,
        suggestion: 'Sin keywords asignadas - revisar contenido'
      });
    }
  }

  return gaps;
};
