/**
 * SISTRIX API Service
 * Provides keyword ranking and search volume data
 */

const SISTRIX_BASE_URL = 'https://api.sistrix.com';

/**
 * Get SISTRIX data for a keyword
 * @param {string} keyword - The keyword to lookup
 * @param {string} apiKey - SISTRIX API key
 * @param {string} country - Country code (es, de, etc.)
 * @param {string} domain - Target domain to check rankings for
 * @returns {Promise<Object|null>}
 */
export const getSistrixData = async (keyword, apiKey, country, domain) => {
  if (!apiKey) return null;

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      keyword: keyword,
      country: country,
      format: 'json'
    });

    const response = await fetch(`${SISTRIX_BASE_URL}/keyword.ranking?${params}`);

    if (!response.ok) {
      console.warn(`SISTRIX API error for "${keyword}": ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data?.answer?.[0]?.ranking) {
      const rankings = data.answer[0].ranking;
      const cleanDomain = domain.replace('www.', '');
      const domainRanking = rankings.find(r =>
        r.domain && r.domain.includes(cleanDomain)
      );

      return {
        currentRanking: domainRanking?.position || null,
        rankingUrl: domainRanking?.url || null,
        searchVolume: data.answer[0].searchvolume || null,
        cpc: data.answer[0].cpc || null,
        competition: data.answer[0].cpc ? 'High' : 'Medium'
      };
    }

    return null;
  } catch (error) {
    console.warn(`SISTRIX fetch error for "${keyword}":`, error.message);
    return null;
  }
};

/**
 * Batch process keywords with SISTRIX (with rate limiting)
 * @param {string[]} keywords - Keywords to process
 * @param {string} apiKey - SISTRIX API key
 * @param {string} country - Country code
 * @param {string} domain - Target domain
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Map<string, Object>>}
 */
export const batchGetSistrixData = async (keywords, apiKey, country, domain, onProgress) => {
  const results = new Map();

  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i];
    const data = await getSistrixData(keyword, apiKey, country, domain);
    results.set(keyword, data);

    if (onProgress) {
      onProgress(i + 1, keywords.length);
    }

    // Rate limiting: 1 request per 200ms to avoid API limits
    if (i < keywords.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return results;
};
