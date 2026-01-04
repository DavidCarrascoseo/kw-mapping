import React, { useState, useCallback } from 'react';
import { Sparkles, TrendingUp, RotateCcw } from 'lucide-react';
import ConfigStep from './ConfigStep';
import MappingStep from './MappingStep';
import ProcessingStep from './ProcessingStep';
import ResultsStep from './ResultsStep';
import { parseCSV, downloadCSV } from '../utils/csv';
import { findBestURL } from '../utils/similarity';
import { classifyKeywords } from '../services/classifier';
import { classifyKeywordsLocally } from '../services/localClassifier';
import { getSistrixData } from '../services/sistrix';

const EXPORT_HEADERS = [
  'Main Category', 'Sub Category 1', 'Sub Category 2', 'Sub Category 3',
  'Keyword', 'SV', 'KW Intent', 'Page Type', 'URL exists', 'Target-URL',
  'Client', 'Ranking-URL'
];

const SEOAutomator = () => {
  // Configuration state
  const [config, setConfig] = useState({
    sitemap: '',
    urlInventory: '',
    domain: 'taxfix.es',
    country: 'es',
    useSistrix: false,
    sistrixApiKey: '',
    anthropicApiKey: '',
    useAI: false // Use local classifier by default
  });

  // File state
  const [keywordsFile, setKeywordsFile] = useState(null);
  const [historicalFile, setHistoricalFile] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [columnMapping, setColumnMapping] = useState({ keyword: '', volume: '' });

  // Processing state
  const [step, setStep] = useState('config');
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');

  // Results state
  const [processedData, setProcessedData] = useState([]);
  const [discardedData, setDiscardedData] = useState([]);

  // Handle keywords file upload
  const handleKeywordsUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const { headers } = parseCSV(event.target.result);
        setAvailableColumns(headers);
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
    if (!keywordsFile || !columnMapping.keyword || !columnMapping.volume) {
      alert('Completa el mapeo de columnas');
      return;
    }

    // Check if AI is enabled but no API key
    if (config.useAI && !config.anthropicApiKey) {
      alert('Ingresa tu API Key de Anthropic para usar clasificación con IA');
      setStep('config');
      return;
    }

    setProcessing(true);
    setStep('processing');
    setProcessedCount(0);
    setCurrentPhase('classifying');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const { rows } = parseCSV(event.target.result);
        const inventoryUrls = config.urlInventory.split('\n').filter(u => u.trim());
        const sitemapUrls = config.sitemap.split('\n').filter(u => u.trim());

        const keywordsToProcess = rows.map(row => row[columnMapping.keyword] || '').filter(k => k);
        setTotalCount(keywordsToProcess.length);

        // Phase 1: Classification (AI or Local)
        setCurrentPhase('classifying');
        let classifications;

        if (config.useAI && config.anthropicApiKey) {
          // Use Claude AI for classification
          classifications = await classifyKeywords(
            keywordsToProcess,
            config.anthropicApiKey,
            historicalData,
            (current, total) => setProcessedCount(current)
          );
        } else {
          // Use local rule-based classification
          classifications = await classifyKeywordsLocally(
            keywordsToProcess,
            historicalData,
            (current, total) => setProcessedCount(current)
          );
        }

        // Build results
        const results = [];
        const discarded = [];

        for (let idx = 0; idx < rows.length; idx++) {
          const row = rows[idx];
          const keyword = row[columnMapping.keyword] || '';
          const volume = row[columnMapping.volume] || '0';
          const classification = classifications[idx];

          if (!keyword) continue;

          // Check if should be discarded
          if (classification?.shouldDiscard) {
            discarded.push({
              id: idx,
              keyword,
              volume,
              reason: classification.discardReason || 'Descartada por IA'
            });
            continue;
          }

          // Get SISTRIX data if enabled
          let sistrixData = null;
          if (config.useSistrix && config.sistrixApiKey) {
            setCurrentPhase('enriching');
            sistrixData = await getSistrixData(
              keyword,
              config.sistrixApiKey,
              config.country,
              config.domain
            );
            // Rate limiting
            if (idx % 5 === 0) {
              await new Promise(r => setTimeout(r, 500));
            }
          }

          // Find best URL
          setCurrentPhase('mapping');
          const mainCategory = classification?.mainCategory || 'Otros';
          const subCategory = classification?.subCategory || '';
          const intent = classification?.intent || 'Informational';
          const confidence = classification?.confidence || 'low';

          const urlMatch = findBestURL(
            keyword,
            mainCategory,
            inventoryUrls,
            sitemapUrls,
            sistrixData,
            config.domain,
            classification // Pass full classification for better matching
          );

          results.push({
            id: idx,
            'Main Category': mainCategory,
            'Sub Category 1': subCategory,
            'Sub Category 2': '',
            'Sub Category 3': '',
            'Keyword': keyword,
            'SV': sistrixData?.searchVolume || volume,
            'KW Intent': intent,
            'Page Type': intent === 'Transactional' ? 'Landing Page' : 'Blog Post',
            'URL exists': urlMatch.exists,
            'Target-URL': urlMatch.url,
            'Client': '',
            'Ranking-URL': sistrixData?.rankingUrl || '',
            _source: urlMatch.source,
            _currentRanking: sistrixData?.currentRanking || null,
            _sistrixEnriched: !!sistrixData,
            _recommendation: urlMatch.recommendation,
            _message: urlMatch.message,
            _alternatives: urlMatch.alternatives || [],
            _confidence: confidence,
            _matchScore: urlMatch.score
          });

          setProcessedCount(idx + 1);
        }

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
        reason: 'Eliminada manualmente'
      }]);
    }
    setProcessedData(prev => prev.filter(r => r.id !== id));
  }, [processedData]);

  // Export to CSV
  const handleExport = useCallback(() => {
    const filename = `Keyword-Strategy-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(processedData, EXPORT_HEADERS, filename);
  }, [processedData]);

  // Reset to start
  const handleReset = useCallback(() => {
    setStep('config');
    setKeywordsFile(null);
    setAvailableColumns([]);
    setColumnMapping({ keyword: '', volume: '' });
    setProcessedData([]);
    setDiscardedData([]);
    setProcessedCount(0);
    setTotalCount(0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-2 flex items-center justify-center gap-3">
            <Sparkles className="text-amber-500" size={32} />
            SEO Keyword Automator
            <TrendingUp className="text-green-500" size={32} />
          </h1>
          <p className="text-gray-600">
            Clasificación automática con Claude AI + Enriquecimiento SISTRIX
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
            isValid={columnMapping.keyword && columnMapping.volume}
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
          />
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-400">
          <p>Powered by Claude AI + SISTRIX API</p>
        </footer>
      </div>
    </div>
  );
};

export default SEOAutomator;
