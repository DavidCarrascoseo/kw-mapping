/**
 * Calculate similarity between a keyword and a URL
 * @param {string} keyword - The keyword to match
 * @param {string} url - The URL to compare against
 * @returns {number} - Similarity score between 0 and 1
 */
export const calculateSimilarity = (keyword, url) => {
  const kw = keyword.toLowerCase();
  const urlClean = url.toLowerCase()
    .replace(/https?:\/\//, '')
    .replace(/www\./, '')
    .replace(/\.(com|es|de|org|net|io).*$/, '');

  const kwWords = kw.split(/\s+/).filter(w => w.length > 2);
  const urlWords = urlClean.split(/[\s\-\/\_]+/).filter(w => w.length > 2);

  if (kwWords.length === 0) return 0;

  let matches = 0;
  let partialMatches = 0;

  kwWords.forEach(kwWord => {
    urlWords.forEach(urlWord => {
      if (kwWord === urlWord) {
        matches++;
      } else if (kwWord.includes(urlWord) || urlWord.includes(kwWord)) {
        partialMatches += 0.5;
      }
    });
  });

  return Math.min((matches + partialMatches) / kwWords.length, 1);
};

/**
 * Find the best matching URL for a keyword
 * @param {string} keyword - The keyword to match
 * @param {string} mainCategory - Category for URL suggestion
 * @param {string[]} inventoryUrls - URLs from inventory
 * @param {string[]} sitemapUrls - URLs from sitemap
 * @param {Object|null} sistrixData - SISTRIX ranking data
 * @param {string} domain - Target domain
 * @returns {Object} - Best match info
 */
export const findBestURL = (keyword, mainCategory, inventoryUrls, sitemapUrls, sistrixData, domain) => {
  let bestMatch = { url: '', score: 0, exists: 'No', source: '' };

  // Priority 1: SISTRIX ranking URL (already ranking)
  if (sistrixData?.rankingUrl) {
    const normalizedUrl = sistrixData.rankingUrl.replace(/https?:\/\//, '').replace(/www\./, '');
    if (normalizedUrl.includes(domain.replace('www.', ''))) {
      return {
        url: sistrixData.rankingUrl,
        score: 1.0,
        exists: 'Yes',
        source: 'sistrix-ranking'
      };
    }
  }

  // Priority 2: Inventory URLs
  inventoryUrls.forEach(url => {
    const score = calculateSimilarity(keyword, url);
    if (score > bestMatch.score) {
      bestMatch = { url, score, exists: 'Yes', source: 'inventory' };
    }
  });

  // Priority 3: Sitemap URLs (only if inventory match is weak)
  if (bestMatch.score < 0.4) {
    sitemapUrls.forEach(url => {
      const score = calculateSimilarity(keyword, url);
      if (score > bestMatch.score) {
        bestMatch = { url, score, exists: 'Yes', source: 'sitemap' };
      }
    });
  }

  // Priority 4: Suggest new URL
  if (bestMatch.score < 0.3) {
    const slug = keyword.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 60);

    const categoryPaths = {
      'Autónomos': 'autonomos',
      'Renta': 'renta',
      'Empresas': 'empresas',
      'Trámites': 'tramites',
      'Facturación': 'facturacion',
      'Inversiones': 'inversiones'
    };

    const categoryPath = categoryPaths[mainCategory] || 'blog';
    bestMatch = {
      url: `/${categoryPath}/${slug}`,
      score: 0,
      exists: 'No',
      source: 'suggested'
    };
  }

  return bestMatch;
};
