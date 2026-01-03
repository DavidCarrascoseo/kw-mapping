/**
 * AI Classifier Service
 * Uses Claude API for keyword classification
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Build classification prompt
 * @param {string[]} keywords - Keywords to classify
 * @param {Object[]} historicalData - Historical examples for learning
 * @returns {string}
 */
const buildPrompt = (keywords, historicalData = []) => {
  let historicalContext = '';

  if (historicalData.length > 0) {
    const examples = historicalData.slice(0, 10).map(h =>
      `"${h.keyword}" -> ${h.mainCategory}${h.subCategory ? ' / ' + h.subCategory : ''}`
    ).join('\n');
    historicalContext = `\n\nEjemplos históricos para aprender:\n${examples}`;
  }

  return `Eres un experto en SEO clasificando keywords para una empresa de servicios fiscales.

Categorías disponibles:
- Autónomos: Todo relacionado con trabajadores autónomos, freelance, cuotas, altas/bajas
- Renta: Declaración de la renta, IRPF, deducciones fiscales personales
- Empresas: Impuestos empresariales, sociedades, contabilidad corporativa
- Trámites: Gestiones administrativas, certificados, documentación
- Facturación: Facturas, facturación electrónica, programas de facturación
- Inversiones: Trading, criptomonedas, acciones, plusvalías
- Otros: Keywords que no encajan claramente en ninguna categoría
${historicalContext}

Clasifica las siguientes keywords. Para cada una indica:
- mainCategory: Una de las categorías arriba
- subCategory: Subcategoría más específica (opcional)
- intent: "Informational" (busca información) o "Transactional" (quiere realizar una acción)
- shouldDiscard: true si la keyword es irrelevante, spam, o no tiene valor SEO
- discardReason: Razón del descarte si aplica

Keywords a clasificar:
${keywords.map((kw, idx) => `${idx + 1}. "${kw}"`).join('\n')}

Responde ÚNICAMENTE con JSON válido en este formato:
{"keywords": [{"keyword": "keyword original", "mainCategory": "categoria", "subCategory": "sub", "intent": "Informational", "shouldDiscard": false, "discardReason": ""}]}`;
};

/**
 * Classify keywords using Claude AI
 * @param {string[]} keywords - Keywords to classify
 * @param {string} apiKey - Anthropic API key
 * @param {Object[]} historicalData - Historical examples
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object[]>}
 */
export const classifyKeywords = async (keywords, apiKey, historicalData = [], onProgress) => {
  if (!apiKey) {
    throw new Error('API key de Anthropic requerida');
  }

  const batchSize = 15;
  const results = [];

  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);
    const prompt = buildPrompt(batch, historicalData);

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API error ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const textContent = data.content.find(c => c.type === 'text')?.text || '';

      // Extract JSON from response
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        results.push(...parsed.keywords);
      } else {
        // Fallback for batch if parsing fails
        batch.forEach(kw => {
          results.push({
            keyword: kw,
            mainCategory: 'Otros',
            subCategory: '',
            intent: 'Informational',
            shouldDiscard: false,
            discardReason: ''
          });
        });
      }

      if (onProgress) {
        onProgress(Math.min(i + batchSize, keywords.length), keywords.length);
      }

      // Rate limiting between batches
      if (i + batchSize < keywords.length) {
        await new Promise(r => setTimeout(r, 1000));
      }

    } catch (error) {
      console.error(`Classification error for batch ${i}:`, error);

      // Add fallback results for failed batch
      batch.forEach(kw => {
        results.push({
          keyword: kw,
          mainCategory: 'Otros',
          subCategory: '',
          intent: 'Informational',
          shouldDiscard: false,
          discardReason: ''
        });
      });
    }
  }

  return results;
};
