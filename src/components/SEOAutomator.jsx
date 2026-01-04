import React, { useState, useCallback } from 'react';
import { Sparkles, TrendingUp, RotateCcw } from 'lucide-react';
import ConfigStep from './ConfigStep';
import MappingStep from './MappingStep';
import ProcessingStep from './ProcessingStep';
import ResultsStep from './ResultsStep';
import { parseCSV, downloadCSV } from '../utils/csv';
import { classifyKeywords } from '../services/classifier';
import { classifyKeywordsLocally, classifyURLGroup } from '../services/localClassifier';
import { getSistrixData, getSearchVolume } from '../services/sistrix';
import { analyzeForExpansion, calculateSemanticSimilarity } from '../services/semanticExpansion';

const EXPORT_HEADERS = [
  'Target-URL', 'Keyword', 'SV', 'Main Category', 'Sub Category 1', 'Sub Category 2',
  'KW Intent', 'Confidence', 'Source', 'Is Expansion'
];

const SEOAutomator = () => {
  // Configuration state
  const [config, setConfig] = useState({
    sitemap: '',
    urlInventory: '',
    domain: '',
    country: 'es',
    useSistrix: false,
    sistrixApiKey: '',
    anthropicApiKey: '',
    useAI: false
  });

  // File state
  const [keywordsFile, setKeywordsFile] = useState(null);
  const [historicalFile, setHistoricalFile] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({ url: '', keyword: '', volume: '' });

  // Processing state
  const [step, setStep] = useState('config');
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');

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

        // Step 2: Classify each URL group
        // All keywords in a URL get the same category (from URL) and subcategories (voted from keywords)
        setCurrentPhase('classifying');
        const results = [];
        const discarded = [];
        let processedIdx = 0;
        let urlIdx = 0;

        for (const url of urlOrderList) {
          const urlKeywords = urlGroups.get(url);

          // Classify the entire URL group - all keywords share the same classification
          const groupClassification = classifyURLGroup(url, urlKeywords, historicalData);

          for (const kwData of urlKeywords) {
            // Check if individual keyword should be discarded
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

            // All keywords in URL share the same Main Category and Sub Categories
            results.push({
              id: processedIdx,
              'Target-URL': url,
              'Keyword': kwData.keyword,
              'SV': finalVolume,
              'Main Category': groupClassification.mainCategory,
              'Sub Category 1': groupClassification.subCategory1 || '',
              'Sub Category 2': groupClassification.subCategory2 || '',
              'KW Intent': groupClassification.intent,
              '_confidence': groupClassification.subCategory1 ? 'high' : 'medium',
              '_isExpansion': false,
              '_sistrixEnriched': sistrixEnriched,
              '_urlOrder': urlIdx
            });

            processedIdx++;
          }

          // Step 3: Find related keywords for high-volume terms (>20 searches)
          if (config.useSistrix && config.sistrixApiKey) {
            setCurrentPhase('expanding');
            const expansions = await analyzeForExpansion(
              urlKeywords,
              config.sistrixApiKey,
              config.country
            );

            for (const exp of expansions) {
              for (const related of exp.expansions) {
                const exists = results.some(r =>
                  r['Keyword'].toLowerCase() === related.keyword.toLowerCase() ||
                  calculateSemanticSimilarity(r['Keyword'], related.keyword) > 0.85
                );

                if (!exists) {
                  // Expansion keywords inherit the URL's classification
                  results.push({
                    id: processedIdx++,
                    'Target-URL': url,
                    'Keyword': related.keyword,
                    'SV': related.searchVolume || 0,
                    'Main Category': groupClassification.mainCategory,
                    'Sub Category 1': groupClassification.subCategory1 || '',
                    'Sub Category 2': groupClassification.subCategory2 || '',
                    'KW Intent': groupClassification.intent,
                    '_confidence': 'medium',
                    '_isExpansion': true,
                    '_expansionSource': exp.seedKeyword,
                    '_sistrixEnriched': true,
                    '_urlOrder': urlIdx
                  });
                }
              }
            }
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

        {/* Reset button when in results */}
        {step === 'results' && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
            >
              <RotateCcw size={18} />
              Nuevo análisis
            </button>
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
