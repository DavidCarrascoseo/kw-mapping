import React from 'react';
import { Play, ArrowLeft } from 'lucide-react';

const MappingStep = ({
  availableColumns,
  columnMapping,
  onMappingChange,
  onBack,
  onProcess,
  useSistrix,
  isValid
}) => {
  const handleChange = (field) => (e) => {
    onMappingChange({ ...columnMapping, [field]: e.target.value });
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Mapeo de Columnas</h2>

      <p className="text-gray-600 mb-6">
        Selecciona qué columnas de tu CSV contienen las keywords y el volumen de búsqueda.
      </p>

      <div className="space-y-6 mb-8">
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            Columna de Keywords <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full p-3 border-2 rounded-lg bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
            value={columnMapping.keyword}
            onChange={handleChange('keyword')}
          >
            <option value="">Seleccionar columna...</option>
            {availableColumns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            Columna de Volumen <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full p-3 border-2 rounded-lg bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
            value={columnMapping.volume}
            onChange={handleChange('volume')}
          >
            <option value="">Seleccionar columna...</option>
            {availableColumns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Preview of selected columns */}
      {columnMapping.keyword && columnMapping.volume && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Resumen</h3>
          <p className="text-sm text-gray-600">
            Keywords: <span className="font-mono bg-white px-2 py-1 rounded">{columnMapping.keyword}</span>
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Volumen: <span className="font-mono bg-white px-2 py-1 rounded">{columnMapping.volume}</span>
          </p>
        </div>
      )}

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
          {useSistrix ? 'Procesar con IA + SISTRIX' : 'Procesar con IA'}
        </button>
      </div>
    </div>
  );
};

export default MappingStep;
