import React from 'react';
import { Upload, FileText, TrendingUp, Key } from 'lucide-react';

const ConfigStep = ({
  config,
  onConfigChange,
  onKeywordsUpload,
  onHistoricalUpload,
  keywordsFile,
  historicalFile,
  historicalDataCount
}) => {
  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    onConfigChange({ ...config, [field]: value });
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Configuración</h2>

      {/* API Keys Section */}
      <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
        <h3 className="font-bold text-amber-800 mb-4 flex items-center gap-2">
          <Key size={20} />
          API Keys
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Anthropic API Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={config.anthropicApiKey}
              onChange={handleChange('anthropicApiKey')}
              className="w-full p-3 border-2 rounded-lg font-mono text-sm"
              placeholder="sk-ant-..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Obtén tu API key en console.anthropic.com
            </p>
          </div>
        </div>
      </div>

      {/* SISTRIX Section */}
      <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
        <label className="flex items-start gap-3 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={config.useSistrix}
            onChange={handleChange('useSistrix')}
            className="w-5 h-5 mt-1 accent-green-600"
          />
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="text-green-600" size={20} />
              <span className="font-bold text-gray-800">Enriquecer con SISTRIX</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Obtén ranking actual, volumen de búsqueda real y competencia
            </p>
          </div>
        </label>

        {config.useSistrix && (
          <div className="space-y-4 mt-4 pt-4 border-t border-green-200">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                SISTRIX API Key
              </label>
              <input
                type="password"
                value={config.sistrixApiKey}
                onChange={handleChange('sistrixApiKey')}
                className="w-full p-2 border-2 rounded-lg font-mono text-sm"
                placeholder="Tu API key de SISTRIX"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Dominio</label>
                <input
                  type="text"
                  value={config.domain}
                  onChange={handleChange('domain')}
                  className="w-full p-2 border-2 rounded-lg"
                  placeholder="ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">País</label>
                <select
                  value={config.country}
                  onChange={handleChange('country')}
                  className="w-full p-2 border-2 rounded-lg bg-white"
                >
                  <option value="es">España</option>
                  <option value="de">Alemania</option>
                  <option value="fr">Francia</option>
                  <option value="it">Italia</option>
                  <option value="uk">Reino Unido</option>
                  <option value="us">Estados Unidos</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* URLs Section */}
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            Sitemap URLs (una por línea)
          </label>
          <textarea
            className="w-full h-32 p-3 border-2 rounded-lg font-mono text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
            value={config.sitemap}
            onChange={handleChange('sitemap')}
            placeholder="https://ejemplo.com/pagina-1&#10;https://ejemplo.com/pagina-2&#10;..."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            Inventario de URLs (una por línea)
          </label>
          <textarea
            className="w-full h-40 p-3 border-2 rounded-lg font-mono text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
            value={config.urlInventory}
            onChange={handleChange('urlInventory')}
            placeholder="https://ejemplo.com/blog/articulo-1&#10;https://ejemplo.com/servicios/servicio-1&#10;..."
          />
        </div>

        {/* Historical File */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            Archivo Histórico (opcional)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Sube un CSV con clasificaciones anteriores para que la IA aprenda de tus patrones
          </p>
          <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 hover:border-indigo-300 transition">
            <Upload size={20} className="text-gray-400" />
            <span className="text-sm text-gray-600">
              {historicalFile ? historicalFile.name : 'Subir CSV histórico'}
            </span>
            <input
              type="file"
              accept=".csv"
              onChange={onHistoricalUpload}
              className="hidden"
            />
          </label>
          {historicalDataCount > 0 && (
            <p className="text-sm text-green-600 mt-2 font-semibold">
              ✓ {historicalDataCount} registros cargados
            </p>
          )}
        </div>

        {/* Keywords File */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            Keywords CSV <span className="text-red-500">*</span>
          </label>
          <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-400 transition">
            <FileText size={24} className="text-indigo-500" />
            <span className="text-indigo-700 font-medium">
              {keywordsFile ? keywordsFile.name : 'Seleccionar archivo CSV'}
            </span>
            <input
              type="file"
              accept=".csv"
              onChange={onKeywordsUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default ConfigStep;
