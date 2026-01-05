import React, { useState, useCallback, useEffect } from 'react';
import { Sparkles, TrendingUp, RotateCcw, Save, FolderOpen } from 'lucide-react';
import ConfigStep from './ConfigStep';
import MappingStep from './MappingStep';
import ProcessingStep from './ProcessingStep';
import ResultsStep from './ResultsStep';
import { parseCSV, downloadCSV } from '../utils/csv';
import { classifyKeywords } from '../services/classifier';
import { classifyKeywordsLocally, classifyURLGroup, extractTopics } from '../services/localClassifier';
import { getSistrixData, getSearchVolume, getRelatedKeywords } from '../services/sistrix';
import { analyzeForExpansion, calculateSemanticSimilarity } from '../services/semanticExpansion';
import { cleanKeywordsForURL, findSeedKeyword, extractURLTopic, areSameKeyword } from '../services/keywordCleaner';

const EXPORT_HEADERS = [
  'Target-URL', 'Keyword', 'SV', 'Categoría', 'Subcategoría 1', 'Subcategoría 2', 'KW Intent'
];

const STORAGE_KEYS = {
  CONFIG: 'seo-mapper-config',
  HISTORICAL: 'seo-mapper-historical',
  LAST_RESULTS: 'seo-mapper-results',
  LAST_SESSION: 'seo-mapper-session'
};

// Load from localStorage
const loadFromStorage = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
};

// Save to localStorage
const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Error saving to localStorage:', e);
  }
};

const SEOAutomator = () => {
  // Configuration state - load from localStorage
  const [config, setConfig] = useState(() => loadFromStorage(STORAGE_KEYS.CONFIG, {
    sitemap: '',
    urlInventory: '',
    domain: '',
    country: 'es',
    useSistrix: false,
    sistrixApiKey: '',
    anthropicApiKey: '',
    useAI: false
  }));

  // File state
  const [keywordsFile, setKeywordsFile] = useState(null);
  const [historicalFile, setHistoricalFile] = useState(null);
  const [historicalData, setHistoricalData] = useState(() => loadFromStorage(STORAGE_KEYS.HISTORICAL, []));
  const [availableColumns, setAvailableColumns] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({ url: '', keyword: '', volume: '' });

  // Processing state
  const [step, setStep] = useState('config');
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');

  // Session management
  const [hasSavedSession, setHasSavedSession] = useState(() => !!localStorage.getItem(STORAGE_KEYS.LAST_RESULTS));

  // Auto-save config when it changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CONFIG, config);
  }, [config]);

  // Auto-save historical data when it changes
  useEffect(() => {
    if (historicalData.length > 0) {
      saveToStorage(STORAGE_KEYS.HISTORICAL, historicalData);
    }
  }, [historicalData]);

  // Results state
  const [processedData, setProcessedData] = useState([]);
  const [discardedData, setDiscardedData] = useState([]);
  const [urlOrder, setUrlOrder] = useState([]);

  // Handle keywords file upload
  const handleKeywordsUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const { headers, rows } = parseCSV(event.target.result);
        setAvailableColumns(headers);
        setPreviewData(rows.slice(0, 5)); // Store preview data
        setKeywordsFile(file);
        setStep('mapping');
      } catch (error) {
        alert('Error al leer el archivo CSV: ' + error.message);
      }
    };
    reader.readAsText(file);
  }, []);

  // Handle historical file upload
  const handleHistoricalUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const { rows } = parseCSV(event.target.result);
        const processed = rows.map(row => ({
          keyword: row['Keyword'] || row['keyword'] || '',
          mainCategory: row['Main Category'] || row['Main_Category'] || row['mainCategory'] || '',
          subCategory: row['Sub Category 1'] || row['Sub_Category_1'] || row['subCategory'] || ''
        })).filter(r => r.keyword && r.mainCategory);

        setHistoricalData(processed);
        setHistoricalFile(file);
      } catch (error) {
        alert('Error al leer el archivo histórico: ' + error.message);
      }
    };
    reader.readAsText(file);
  }, []);

  // Main processing function
  const processKeywords = useCallback(async () => {
    if (!keywordsFile || !columnMapping.url || !columnMapping.keyword || !columnMapping.volume) {
      alert('Completa el mapeo de columnas');
      return;
    }

    if (config.useAI && !config.anthropicApiKey) {
      alert('Ingresa tu API Key de Anthropic para usar clasificación con IA');
      setStep('config');
      return;
    }

    setProcessing(true);
    setStep('processing');
    setProcessedCount(0);
    setCurrentPhase('loading');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const { rows } = parseCSV(event.target.result);

        // Step 1: Group keywords by URL (maintaining original order)
        setCurrentPhase('grouping');
        const urlGroups = new Map();
        const urlOrderList = [];

        for (const row of rows) {
          const url = (row[columnMapping.url] || '').trim();
          const keyword = (row[columnMapping.keyword] || '').trim();
          const volume = row[columnMapping.volume] || '0';

          if (!url || !keyword) continue;

          if (!urlGroups.has(url)) {
            urlGroups.set(url, []);
            urlOrderList.push(url); // Track order
          }

          urlGroups.get(url).push({
            keyword,
            volume: parseInt(volume) || 0,
            originalVolume: volume
          });
        }

        setUrlOrder(urlOrderList);
        setTotalCount(urlOrderList.length);

        // Step 2: Clean and classify each URL group
        setCurrentPhase('cleaning');
        const results = [];
        const discarded = [];
        let processedIdx = 0;
        let urlIdx = 0;

        for (const url of urlOrderList) {
          const urlKeywords = urlGroups.get(url);

          // Extract URL topics for cleaning and classification
          const urlTopics = extractURLTopic(url);

          // Clean keywords: remove typos, duplicates, off-topic
          const { cleaned: cleanedKeywords, discarded: discardedFromCleaning } = cleanKeywordsForURL(
            url,
            urlKeywords,
            urlTopics
          );

          // Add cleaned discards to the discard list
          for (const d of discardedFromCleaning) {
            discarded.push({
              id: processedIdx++,
              keyword: d.keyword,
              volume: d.volume || 0,
              url,
              reason: d.reason
            });
          }

          // Classify the entire URL group - all keywords share the same classification
          setCurrentPhase('classifying');
          const groupClassification = classifyURLGroup(url, cleanedKeywords, historicalData);

          // Find the best seed keyword for potential expansion
          const seedKeyword = findSeedKeyword(cleanedKeywords, urlTopics);

          for (const kwData of cleanedKeywords) {
            // Check if individual keyword should be discarded by classifier
            const kwResult = groupClassification.keywordResults.find(
              r => (r.keyword || '').toLowerCase() === kwData.keyword.toLowerCase()
            );

            if (kwResult?.shouldDiscard) {
              discarded.push({
                id: processedIdx,
                keyword: kwData.keyword,
                volume: kwData.volume,
                url,
                reason: kwResult.discardReason || 'Descartada'
              });
              processedIdx++;
              continue;
            }

            // Get volume from SISTRIX if not in CSV and SISTRIX is enabled
            let finalVolume = kwData.volume;
            let sistrixEnriched = false;

            if (config.useSistrix && config.sistrixApiKey && (!kwData.volume || kwData.volume === 0)) {
              setCurrentPhase('enriching');
              const sistrixVolume = await getSearchVolume(
                kwData.keyword,
                config.sistrixApiKey,
                config.country
              );
              if (sistrixVolume) {
                finalVolume = sistrixVolume;
                sistrixEnriched = true;
              }
              await new Promise(r => setTimeout(r, 150));
            }

            // All keywords in URL share the same categories
            results.push({
              id: processedIdx,
              'Target-URL': url,
              'Keyword': kwData.keyword,
              'SV': finalVolume,
              'Categoría': groupClassification.mainCategory,
              'Subcategoría 1': groupClassification.subCategory1 || 'Otros',
              'Subcategoría 2': groupClassification.subCategory2 || '(General)',
              'KW Intent': groupClassification.intent,
              '_confidence': groupClassification.subCategory1 ? 'high' : 'medium',
              '_isExpansion': false,
              '_sistrixEnriched': sistrixEnriched,
              '_urlOrder': urlIdx
            });

            processedIdx++;
          }

          // Step 3: Expand keywords using seed keyword
          if (config.useSistrix && config.sistrixApiKey && seedKeyword) {
            setCurrentPhase('expanding');

            // Use the seed keyword for semantic expansion
            try {
              const relatedKeywords = await getRelatedKeywords(
                seedKeyword.keyword,
                config.sistrixApiKey,
                config.country
              );

              for (const related of relatedKeywords) {
                // Check if keyword already exists (exact or similar)
                const exists = results.some(r =>
                  r['Target-URL'] === url && (
                    areSameKeyword(r['Keyword'], related.keyword) ||
                    calculateSemanticSimilarity(r['Keyword'], related.keyword) > 0.85
                  )
                );

                if (!exists && related.searchVolume > 0) {
                  // Verify it's topically relevant
                  const kwTopics = extractTopics(related.keyword);
                  const isRelevant = kwTopics.length > 0 ||
                    urlTopics.some(t => related.keyword.toLowerCase().includes(t.toLowerCase()));

                  if (isRelevant || related.searchVolume > 50) {
                    // Expansion keywords inherit the URL's classification
                    results.push({
                      id: processedIdx++,
                      'Target-URL': url,
                      'Keyword': related.keyword,
                      'SV': related.searchVolume || 0,
                      'Categoría': groupClassification.mainCategory,
                      'Subcategoría 1': groupClassification.subCategory1 || 'Otros',
                      'Subcategoría 2': groupClassification.subCategory2 || '(General)',
                      'KW Intent': groupClassification.intent,
                      '_confidence': 'medium',
                      '_isExpansion': true,
                      '_expansionSource': seedKeyword.keyword,
                      '_sistrixEnriched': true,
                      '_urlOrder': urlIdx
                    });
                  }
                }
              }
            } catch (e) {
              console.warn('Expansion error for', seedKeyword.keyword, e);
            }

            await new Promise(r => setTimeout(r, 200)); // Rate limiting
          }

          urlIdx++;
          setProcessedCount(urlIdx);
        }

        // Sort results by URL order
        results.sort((a, b) => a._urlOrder - b._urlOrder);

        setProcessedData(results);
        setDiscardedData(discarded);
        setProcessing(false);
        setStep('results');

      } catch (error) {
        console.error('Processing error:', error);
        alert('Error durante el procesamiento: ' + error.message);
        setProcessing(false);
        setStep('mapping');
      }
    };

    reader.readAsText(keywordsFile);
  }, [keywordsFile, columnMapping, config, historicalData]);

  // Handle cell edit
  const handleCellEdit = useCallback((id, field, value) => {
    setProcessedData(prev =>
      prev.map(row => row.id === id ? { ...row, [field]: value } : row)
    );
  }, []);

  // Handle keyword removal
  const handleRemoveKeyword = useCallback((id) => {
    const row = processedData.find(r => r.id === id);
    if (row) {
      setDiscardedData(prev => [...prev, {
        id,
        keyword: row['Keyword'],
        volume: row['SV'],
        url: row['Target-URL'],
        reason: 'Eliminada manualmente'
      }]);
    }
    setProcessedData(prev => prev.filter(r => r.id !== id));
  }, [processedData]);

  // Export to CSV
  const handleExport = useCallback(() => {
    const exportData = processedData.map(row => ({
      ...row,
      'Confidence': row._confidence,
      'Source': row._isExpansion ? 'Expansión' : 'Original',
      'Is Expansion': row._isExpansion ? 'Sí' : 'No'
    }));
    const filename = `Keyword-Mapping-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(exportData, EXPORT_HEADERS, filename);
  }, [processedData]);

  // Reset to start
  const handleReset = useCallback(() => {
    setStep('config');
    setKeywordsFile(null);
    setAvailableColumns([]);
    setPreviewData([]);
    setColumnMapping({ url: '', keyword: '', volume: '' });
    setProcessedData([]);
    setDiscardedData([]);
    setProcessedCount(0);
    setTotalCount(0);
    setUrlOrder([]);
  }, []);

  // Save current session
  const handleSaveSession = useCallback(() => {
    const session = {
      processedData,
      discardedData,
      urlOrder,
      timestamp: new Date().toISOString(),
      config: {
        domain: config.domain,
        country: config.country,
        useSistrix: config.useSistrix
      }
    };
    saveToStorage(STORAGE_KEYS.LAST_RESULTS, session);
    setHasSavedSession(true);
    alert('Sesión guardada correctamente');
  }, [processedData, discardedData, urlOrder, config]);

  // Load saved session
  const handleLoadSession = useCallback(() => {
    const session = loadFromStorage(STORAGE_KEYS.LAST_RESULTS, null);
    if (session) {
      setProcessedData(session.processedData || []);
      setDiscardedData(session.discardedData || []);
      setUrlOrder(session.urlOrder || []);
      setStep('results');
    }
  }, []);

  // Clear saved data
  const handleClearSaved = useCallback(() => {
    if (confirm('¿Eliminar todos los datos guardados? (Configuración, histórico y resultados)')) {
      localStorage.removeItem(STORAGE_KEYS.CONFIG);
      localStorage.removeItem(STORAGE_KEYS.HISTORICAL);
      localStorage.removeItem(STORAGE_KEYS.LAST_RESULTS);
      setHasSavedSession(false);
      setHistoricalData([]);
      setConfig({
        sitemap: '',
        urlInventory: '',
        domain: '',
        country: 'es',
        useSistrix: false,
        sistrixApiKey: '',
        anthropicApiKey: '',
        useAI: false
      });
      alert('Datos eliminados');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-2 flex items-center justify-center gap-3">
            <Sparkles className="text-amber-500" size={32} />
            SEO Keyword Mapper
            <TrendingUp className="text-green-500" size={32} />
          </h1>
          <p className="text-gray-600">
            Mapea keywords a URLs con clasificación inteligente
          </p>

          {/* Step indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {['config', 'mapping', 'processing', 'results'].map((s, i) => (
              <div
                key={s}
                className={`flex items-center ${i > 0 ? 'ml-2' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step === s
                    ? 'bg-indigo-600 text-white'
                    : ['config', 'mapping', 'processing', 'results'].indexOf(step) > i
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  {i + 1}
                </div>
                {i < 3 && (
                  <div className={`w-8 h-1 ${
                    ['config', 'mapping', 'processing', 'results'].indexOf(step) > i
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </header>

        {/* Session buttons */}
        {step === 'config' && (
          <div className="mb-4 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {historicalData.length > 0 && (
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                  {historicalData.length} registros históricos cargados
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {hasSavedSession && (
                <button
                  onClick={handleLoadSession}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition"
                >
                  <FolderOpen size={18} />
                  Cargar última sesión
                </button>
              )}
              <button
                onClick={handleClearSaved}
                className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition text-sm"
              >
                Limpiar datos
              </button>
            </div>
          </div>
        )}

        {/* Results toolbar */}
        {step === 'results' && (
          <div className="mb-4 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Configuración y datos guardados automáticamente
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveSession}
                className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition"
              >
                <Save size={18} />
                Guardar sesión
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
              >
                <RotateCcw size={18} />
                Nuevo análisis
              </button>
            </div>
          </div>
        )}

        {/* Steps */}
        {step === 'config' && (
          <ConfigStep
            config={config}
            onConfigChange={setConfig}
            onKeywordsUpload={handleKeywordsUpload}
            onHistoricalUpload={handleHistoricalUpload}
            keywordsFile={keywordsFile}
            historicalFile={historicalFile}
            historicalDataCount={historicalData.length}
          />
        )}

        {step === 'mapping' && (
          <MappingStep
            availableColumns={availableColumns}
            columnMapping={columnMapping}
            onMappingChange={setColumnMapping}
            onBack={() => setStep('config')}
            onProcess={processKeywords}
            useSistrix={config.useSistrix}
            isValid={columnMapping.url && columnMapping.keyword && columnMapping.volume}
            previewData={previewData}
          />
        )}

        {step === 'processing' && (
          <ProcessingStep
            processedCount={processedCount}
            totalCount={totalCount}
            useSistrix={config.useSistrix}
            currentPhase={currentPhase}
          />
        )}

        {step === 'results' && (
          <ResultsStep
            processedData={processedData}
            discardedData={discardedData}
            onCellEdit={handleCellEdit}
            onRemoveKeyword={handleRemoveKeyword}
            onExport={handleExport}
            useSistrix={config.useSistrix}
            historicalDataCount={historicalData.length}
            urlOrder={urlOrder}
          />
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-400">
          <p>SEO Keyword Mapper v2.0</p>
        </footer>
      </div>
    </div>
  );
};

export default SEOAutomator;
