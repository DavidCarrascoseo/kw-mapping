import React from 'react';
import { TrendingUp, Brain, Loader2, Link, Sparkles, FolderOpen } from 'lucide-react';

const ProcessingStep = ({
  processedCount,
  totalCount,
  useSistrix,
  currentPhase
}) => {
  const percentage = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  const phases = {
    loading: { label: 'Cargando datos...', desc: 'Leyendo el archivo CSV' },
    grouping: { label: 'Agrupando por URL...', desc: 'Organizando keywords por su URL asociada' },
    classifying: { label: 'Clasificando keywords...', desc: 'Analizando y categorizando cada keyword' },
    processing: { label: 'Procesando resultados...', desc: 'Construyendo el mapeo final' },
    enriching: { label: 'Consultando SISTRIX...', desc: 'Buscando volumen de búsqueda' },
    expanding: { label: 'Buscando relacionadas...', desc: 'Encontrando keywords semánticamente relacionadas' }
  };

  const current = phases[currentPhase] || { label: 'Procesando...', desc: 'Este proceso puede tomar unos minutos' };

  return (
    <div className="bg-white rounded-lg shadow-xl p-12 text-center">
      <div className="flex justify-center gap-4 mb-6">
        <div className="relative">
          <Loader2 className="animate-spin text-indigo-600" size={64} />
          {currentPhase === 'classifying' && <Brain className="absolute inset-0 m-auto text-indigo-400" size={28} />}
          {currentPhase === 'grouping' && <FolderOpen className="absolute inset-0 m-auto text-indigo-400" size={28} />}
          {currentPhase === 'processing' && <Link className="absolute inset-0 m-auto text-indigo-400" size={28} />}
          {currentPhase === 'expanding' && <Sparkles className="absolute inset-0 m-auto text-amber-400" size={28} />}
          {(currentPhase === 'enriching' || !currentPhase) && <TrendingUp className="absolute inset-0 m-auto text-green-400" size={28} />}
        </div>
        {useSistrix && currentPhase === 'enriching' && (
          <TrendingUp className="text-green-500 animate-pulse" size={48} />
        )}
        {currentPhase === 'expanding' && (
          <Sparkles className="text-amber-500 animate-pulse" size={48} />
        )}
      </div>

      <h2 className="text-2xl font-bold mb-2 text-gray-800">
        {current.label}
      </h2>

      <p className="text-gray-600 mb-6">
        {current.desc}
      </p>

      {totalCount > 0 && (
        <div className="max-w-md mx-auto">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{processedCount} de {totalCount}</span>
            <span>{percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-600 to-purple-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Phase indicator */}
      <div className="mt-8 flex justify-center gap-2">
        {Object.keys(phases).map((phase, idx) => (
          <div
            key={phase}
            className={`w-2 h-2 rounded-full transition-all ${
              phase === currentPhase
                ? 'bg-indigo-600 scale-125'
                : Object.keys(phases).indexOf(currentPhase) > idx
                  ? 'bg-green-500'
                  : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-6">
        No cierres esta ventana durante el procesamiento
      </p>
    </div>
  );
};

export default ProcessingStep;
