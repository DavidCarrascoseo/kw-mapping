import React, { useMemo, useState } from 'react';
import { Download, Search, Trash2, AlertTriangle, Edit2, Check, X } from 'lucide-react';

const ResultsStep = ({
  processedData,
  discardedData,
  onCellEdit,
  onRemoveKeyword,
  onExport,
  useSistrix,
  historicalDataCount
}) => {
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState('url');
  const [showDiscarded, setShowDiscarded] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  const enrichedCount = processedData.filter(r => r._sistrixEnriched).length;

  const sortedData = useMemo(() => {
    let data = [...processedData];

    if (filterText) {
      const search = filterText.toLowerCase();
      data = data.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(search)
        )
      );
    }

    if (sortBy === 'url') {
      data.sort((a, b) => (a['Target-URL'] || '').localeCompare(b['Target-URL'] || ''));
    } else if (sortBy === 'ranking') {
      data.sort((a, b) => (a._currentRanking || 999) - (b._currentRanking || 999));
    } else if (sortBy === 'volume') {
      data.sort((a, b) => parseInt(b['SV'] || 0) - parseInt(a['SV'] || 0));
    } else if (sortBy === 'category') {
      data.sort((a, b) => (a['Main Category'] || '').localeCompare(b['Main Category'] || ''));
    }

    return data;
  }, [processedData, filterText, sortBy]);

  const groupedByURL = useMemo(() => {
    const groups = {};
    sortedData.forEach(row => {
      const url = row['Target-URL'] || 'Sin URL';
      if (!groups[url]) groups[url] = [];
      groups[url].push(row);
    });
    return groups;
  }, [sortedData]);

  const startEdit = (id, field, currentValue) => {
    setEditingCell({ id, field });
    setEditValue(currentValue || '');
  };

  const saveEdit = () => {
    if (editingCell) {
      onCellEdit(editingCell.id, editingCell.field, editValue);
      setEditingCell(null);
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const getSourceColor = (source) => {
    switch (source) {
      case 'sistrix-ranking': return 'bg-blue-700';
      case 'suggested': return 'bg-amber-600';
      case 'sitemap': return 'bg-cyan-600';
      case 'inventory': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  const getSourceLabel = (source) => {
    switch (source) {
      case 'sistrix-ranking': return 'SISTRIX';
      case 'suggested': return 'Nueva';
      case 'sitemap': return 'Sitemap';
      case 'inventory': return 'Inventario';
      default: return 'Otro';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-xl p-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Resultados</h2>
            <div className="flex flex-wrap gap-4 mt-2 text-sm">
              <span className="text-green-600 font-semibold">
                ✓ {processedData.length} keywords procesadas
              </span>
              <span className="text-red-600 font-semibold">
                ✗ {discardedData.length} descartadas
              </span>
              {useSistrix && (
                <span className="text-blue-600 font-semibold">
                  📊 {enrichedCount} con datos SISTRIX
                </span>
              )}
              {historicalDataCount > 0 && (
                <span className="text-purple-600 font-semibold">
                  📚 {historicalDataCount} ejemplos históricos usados
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowDiscarded(!showDiscarded)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                showDiscarded
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
            >
              <AlertTriangle size={18} />
              Descartadas
            </button>
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Download size={18} />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Discarded Panel */}
        {showDiscarded && discardedData.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg max-h-60 overflow-y-auto">
            <h3 className="font-bold text-red-800 mb-3">Keywords Descartadas:</h3>
            <div className="space-y-2">
              {discardedData.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm bg-white p-3 rounded-lg shadow-sm">
                  <span className="font-medium">{item.keyword}</span>
                  <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                    {item.reason}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Filtrar por keyword, categoría, URL..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border-2 rounded-lg bg-white focus:border-indigo-500"
          >
            <option value="url">Agrupar por URL</option>
            <option value="ranking">Ordenar por Ranking</option>
            <option value="volume">Ordenar por Volumen</option>
            <option value="category">Ordenar por Categoría</option>
          </select>
        </div>

        {/* Results */}
        {sortBy === 'url' ? (
          <div className="space-y-4">
            {Object.entries(groupedByURL).map(([url, keywords]) => (
              <div key={url} className="border-2 rounded-lg overflow-hidden">
                <div className={`p-4 text-white ${getSourceColor(keywords[0]?._source)}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-white/20 px-2 py-1 rounded">
                        {getSourceLabel(keywords[0]?._source)}
                      </span>
                      <span className="font-mono text-sm truncate max-w-xl">{url}</span>
                    </div>
                    <span className="bg-white/20 px-3 py-1 rounded font-semibold">
                      {keywords.length} keywords
                    </span>
                  </div>
                </div>
                <div className="divide-y">
                  {keywords.map((row) => (
                    <div key={row.id} className="p-3 flex items-center gap-3 hover:bg-gray-50">
                      <button
                        onClick={() => onRemoveKeyword(row.id)}
                        className="text-red-400 hover:text-red-600 transition"
                        title="Eliminar keyword"
                      >
                        <Trash2 size={16} />
                      </button>

                      <div className="flex-1 grid grid-cols-6 gap-2 text-sm items-center">
                        {/* Category - Editable */}
                        <div className="relative">
                          {editingCell?.id === row.id && editingCell?.field === 'Main Category' ? (
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-full p-1 border rounded text-xs"
                                autoFocus
                              />
                              <button onClick={saveEdit} className="text-green-600"><Check size={14} /></button>
                              <button onClick={cancelEdit} className="text-red-600"><X size={14} /></button>
                            </div>
                          ) : (
                            <div
                              className="p-1 rounded cursor-pointer hover:bg-indigo-50 flex items-center gap-1 group"
                              onClick={() => startEdit(row.id, 'Main Category', row['Main Category'])}
                            >
                              <span className="text-xs font-medium text-indigo-700 bg-indigo-100 px-2 py-1 rounded">
                                {row['Main Category']}
                              </span>
                              <Edit2 size={12} className="text-gray-400 opacity-0 group-hover:opacity-100" />
                            </div>
                          )}
                        </div>

                        {/* SubCategory */}
                        <span className="text-xs text-gray-500 truncate" title={row['Sub Category 1']}>
                          {row['Sub Category 1'] || '-'}
                        </span>

                        {/* Keyword */}
                        <span className="font-medium text-gray-800 truncate" title={row['Keyword']}>
                          {row['Keyword']}
                        </span>

                        {/* Volume */}
                        <span className="text-center font-mono">
                          {parseInt(row['SV'] || 0).toLocaleString()}
                        </span>

                        {/* Ranking */}
                        <span className="text-center">
                          {row._currentRanking ? (
                            <span className={`font-bold ${
                              row._currentRanking <= 3 ? 'text-green-600' :
                              row._currentRanking <= 10 ? 'text-blue-600' :
                              row._currentRanking <= 20 ? 'text-amber-600' : 'text-gray-500'
                            }`}>
                              #{row._currentRanking}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </span>

                        {/* Intent */}
                        <span className={`text-xs px-2 py-1 rounded text-center ${
                          row['KW Intent'] === 'Transactional'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-sky-100 text-sky-700'
                        }`}>
                          {row['KW Intent']}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-indigo-50">
                <tr>
                  <th className="p-3 w-10"></th>
                  <th className="p-3 text-left">Categoría</th>
                  <th className="p-3 text-left">Keyword</th>
                  <th className="p-3 text-right">Volumen</th>
                  <th className="p-3 text-center">Ranking</th>
                  <th className="p-3 text-center">Intent</th>
                  <th className="p-3 text-left">URL</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedData.slice(0, 500).map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <button
                        onClick={() => onRemoveKeyword(row.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                    <td className="p-3">
                      <span className="text-xs font-medium text-indigo-700 bg-indigo-100 px-2 py-1 rounded">
                        {row['Main Category']}
                      </span>
                    </td>
                    <td className="p-3 font-medium">{row['Keyword']}</td>
                    <td className="p-3 text-right font-mono">
                      {parseInt(row['SV'] || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      {row._currentRanking ? (
                        <span className="text-blue-600 font-bold">#{row._currentRanking}</span>
                      ) : '—'}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded ${
                        row['KW Intent'] === 'Transactional'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-sky-100 text-sky-700'
                      }`}>
                        {row['KW Intent']}
                      </span>
                    </td>
                    <td className="p-3 text-xs font-mono text-gray-500 max-w-xs truncate">
                      {row['Target-URL']}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedData.length > 500 && (
              <p className="text-center text-sm text-gray-500 py-4">
                Mostrando 500 de {sortedData.length} resultados. Exporta el CSV para ver todos.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsStep;
