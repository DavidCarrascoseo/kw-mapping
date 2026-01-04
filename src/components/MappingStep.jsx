import React, { useMemo } from 'react';
import { Play, ArrowLeft, Link, FileText, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

const MappingStep = ({
  availableColumns,
  columnMapping,
  onMappingChange,
  onBack,
  onProcess,
  useSistrix,
  isValid,
  previewData = []
}) => {
  const handleChange = (field) => (e) => {
    onMappingChange({ ...columnMapping, [field]: e.target.value });
  };

  // Get preview values for selected columns
  const preview = useMemo(() => {
    if (!previewData || previewData.length === 0) return null;

    const sampleRows = previewData.slice(0, 3);
    return {
      url: columnMapping.url ? sampleRows.map(r => r[columnMapping.url]).filter(Boolean) : [],
      keyword: columnMapping.keyword ? sampleRows.map(r => r[columnMapping.keyword]).filter(Boolean) : [],
      volume: columnMapping.volume ? sampleRows.map(r => r[columnMapping.volume]).filter(Boolean) : []
    };
  }, [previewData, columnMapping]);

  const mappingComplete = columnMapping.url && columnMapping.keyword && columnMapping.volume;

  return (
    <div className="bg-white rounded-lg shadow-xl p-8">
      <h2 className="text-2xl font-bold mb-2 text-gray-800">Mapeo de Columnas</h2>
      <p className="text-gray-600 mb-6">
        Selecciona qué columnas de tu CSV corresponden a cada campo.
      </p>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* URL Column */}
        <div className="p-4 border-2 rounded-lg bg-blue-50 border-blue-200">
          <label className="flex items-center gap-2 text-sm font-semibold mb-3 text-blue-800">
            <Link size={18} />
            Columna de URL <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full p-3 border-2 rounded-lg bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
            value={columnMapping.url}
            onChange={handleChange('url')}
          >
            <option value="">Seleccionar...</option>
            {availableColumns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
          {preview?.url?.length > 0 && (
            <div className="mt-2 text-xs text-blue-600">
              <div className="font-medium mb-1">Vista previa:</div>
              {preview.url.slice(0, 2).map((v, i) => (
                <div key={i} className="truncate bg-white px-2 py-1 rounded mb-1 font-mono">
                  {v}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Keyword Column */}
        <div className="p-4 border-2 rounded-lg bg-purple-50 border-purple-200">
          <label className="flex items-center gap-2 text-sm font-semibold mb-3 text-purple-800">
            <FileText size={18} />
            Columna de Keyword <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full p-3 border-2 rounded-lg bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
            value={columnMapping.keyword}
            onChange={handleChange('keyword')}
          >
            <option value="">Seleccionar...</option>
            {availableColumns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
          {preview?.keyword?.length > 0 && (
            <div className="mt-2 text-xs text-purple-600">
              <div className="font-medium mb-1">Vista previa:</div>
              {preview.keyword.slice(0, 2).map((v, i) => (
                <div key={i} className="truncate bg-white px-2 py-1 rounded mb-1">
                  {v}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Volume Column */}
        <div className="p-4 border-2 rounded-lg bg-green-50 border-green-200">
          <label className="flex items-center gap-2 text-sm font-semibold mb-3 text-green-800">
            <TrendingUp size={18} />
            Columna de Volumen <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full p-3 border-2 rounded-lg bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition"
            value={columnMapping.volume}
            onChange={handleChange('volume')}
          >
            <option value="">Seleccionar...</option>
            {availableColumns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
          {preview?.volume?.length > 0 && (
            <div className="mt-2 text-xs text-green-600">
              <div className="font-medium mb-1">Vista previa:</div>
              {preview.volume.slice(0, 2).map((v, i) => (
                <div key={i} className="truncate bg-white px-2 py-1 rounded mb-1 font-mono">
                  {v}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Validation summary */}
      <div className={`mb-6 p-4 rounded-lg ${mappingComplete ? 'bg-green-50 border-2 border-green-200' : 'bg-amber-50 border-2 border-amber-200'}`}>
        <div className="flex items-start gap-3">
          {mappingComplete ? (
            <CheckCircle className="text-green-600 mt-0.5" size={20} />
          ) : (
            <AlertCircle className="text-amber-600 mt-0.5" size={20} />
          )}
          <div>
            <h4 className={`font-semibold ${mappingComplete ? 'text-green-800' : 'text-amber-800'}`}>
              {mappingComplete ? 'Mapeo completo' : 'Mapeo incompleto'}
            </h4>
            <div className="text-sm mt-2 space-y-1">
              <div className={columnMapping.url ? 'text-green-600' : 'text-gray-500'}>
                {columnMapping.url ? '✓' : '○'} URL: {columnMapping.url || 'No seleccionada'}
              </div>
              <div className={columnMapping.keyword ? 'text-green-600' : 'text-gray-500'}>
                {columnMapping.keyword ? '✓' : '○'} Keyword: {columnMapping.keyword || 'No seleccionada'}
              </div>
              <div className={columnMapping.volume ? 'text-green-600' : 'text-gray-500'}>
                {columnMapping.volume ? '✓' : '○'} Volumen: {columnMapping.volume || 'No seleccionada'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Process description */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-800 mb-2">El proceso hará:</h4>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Agrupar keywords por su URL asociada</li>
          <li>Clasificar cada keyword por categoría e intención</li>
          {useSistrix && (
            <>
              <li>Buscar volumen en SISTRIX si no hay datos en el CSV</li>
              <li>Para keywords con +20 búsquedas, buscar términos relacionados</li>
            </>
          )}
          <li>Mantener el orden original de las URLs</li>
        </ol>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
        >
          <ArrowLeft size={20} />
          Volver
        </button>
        <button
          onClick={onProcess}
          disabled={!isValid}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          <Play size={20} />
          {useSistrix ? 'Procesar con SISTRIX' : 'Procesar Keywords'}
        </button>
      </div>
    </div>
  );
};

export default MappingStep;
