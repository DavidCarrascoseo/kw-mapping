import React from 'react';
import { TrendingUp, Brain, Loader2 } from 'lucide-react';

const ProcessingStep = ({
  processedCount,
  totalCount,
  useSistrix,
  currentPhase
}) => {
  const percentage = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow-xl p-12 text-center">
      <div className="flex justify-center gap-4 mb-6">
        <div className="relative">
          <Loader2 className="animate-spin text-indigo-600" size={64} />
          <Brain className="absolute inset-0 m-auto text-indigo-400" size={32} />
        </div>
        {useSistrix && (
          <TrendingUp className="text-green-500 animate-pulse" size={48} />
        )}
      </div>

      <h2 className="text-2xl font-bold mb-2 text-gray-800">
        {currentPhase === 'classifying' && 'Clasificando con IA...'}
        {currentPhase === 'enriching' && 'Enriqueciendo con SISTRIX...'}
        {currentPhase === 'mapping' && 'Mapeando URLs...'}
        {!currentPhase && (useSistrix ? 'Procesando con IA + SISTRIX...' : 'Clasificando con IA...')}
      </h2>

      <p className="text-gray-600 mb-6">
        {currentPhase === 'classifying' && 'Claude está analizando y categorizando las keywords'}
        {currentPhase === 'enriching' && 'Obteniendo datos de ranking y volumen de SISTRIX'}
        {currentPhase === 'mapping' && 'Buscando las mejores URLs para cada keyword'}
        {!currentPhase && 'Este proceso puede tomar unos minutos...'}
      </p>

      {totalCount > 0 && (
        <div className="max-w-md mx-auto">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{processedCount} de {totalCount}</span>
            <span>{percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-600 to-green-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6">
        No cierres esta ventana durante el procesamiento
      </p>
    </div>
  );
};

export default ProcessingStep;
