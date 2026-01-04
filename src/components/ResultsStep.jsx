import React, { useMemo, useState } from 'react';
import { Download, Search, Trash2, AlertTriangle, Edit2, Check, X, ChevronDown, ChevronRight, Sparkles, Link2 } from 'lucide-react';

const ResultsStep = ({
  processedData,
  discardedData,
  onCellEdit,
  onRemoveKeyword,
  onExport,
  useSistrix,
  historicalDataCount,
  urlOrder = []
}) => {
  const [filterText, setFilterText] = useState('');
  const [showDiscarded, setShowDiscarded] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [expandedUrls, setExpandedUrls] = useState(new Set());
  const [expandAll, setExpandAll] = useState(false);

  // Statistics
  const stats = useMemo(() => {
    const uniqueUrls = new Set(processedData.map(r => r['Target-URL'])).size;
    const totalKeywords = processedData.length;
    const totalVolume = processedData.reduce((sum, r) => sum + parseInt(r['SV'] || 0), 0);
    const expansions = processedData.filter(r => r._isExpansion).length;
    const highConfidence = processedData.filter(r => r._confidence === 'high').length;
    const categories = {};
    processedData.forEach(r => {
      const cat = r['Categoría'] || 'Otros';
      categories[cat] = (categories[cat] || 0) + 1;
    });

    return { uniqueUrls, totalKeywords, totalVolume, expansions, highConfidence, categories };
  }, [processedData]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!filterText) return processedData;

    const search = filterText.toLowerCase();
    return processedData.filter(row =>
      Object.values(row).some(val =>
        String(val).toLowerCase().includes(search)
      )
    );
  }, [processedData, filterText]);

  // Group by URL maintaining original order
  const groupedByURL = useMemo(() => {
    const groups = new Map();

    // Initialize groups in URL order
    for (const url of urlOrder) {
      groups.set(url, {
        keywords: [],
        totalVolume: 0,
        expansionCount: 0
      });
    }

    // Fill groups
    for (const row of filteredData) {
      const url = row['Target-URL'];
      if (!groups.has(url)) {
        groups.set(url, {
          keywords: [],
          totalVolume: 0,
          expansionCount: 0
        });
      }
      const group = groups.get(url);
      group.keywords.push(row);
      group.totalVolume += parseInt(row['SV'] || 0);
      if (row._isExpansion) group.expansionCount++;
    }

    // Convert to array maintaining order
    const result = [];
    for (const url of urlOrder) {
      if (groups.has(url) && groups.get(url).keywords.length > 0) {
        result.push([url, groups.get(url)]);
      }
    }

    // Add any URLs not in urlOrder (shouldn't happen but just in case)
    for (const [url, group] of groups.entries()) {
      if (!urlOrder.includes(url) && group.keywords.length > 0) {
        result.push([url, group]);
      }
    }

    return result;
  }, [filteredData, urlOrder]);

  const toggleExpand = (url) => {
    const newExpanded = new Set(expandedUrls);
    if (newExpanded.has(url)) {
      newExpanded.delete(url);
    } else {
      newExpanded.add(url);
    }
    setExpandedUrls(newExpanded);
  };

  const toggleExpandAll = () => {
    if (expandAll) {
      setExpandedUrls(new Set());
    } else {
      setExpandedUrls(new Set(groupedByURL.map(([url]) => url)));
    }
    setExpandAll(!expandAll);
  };

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

  const getConfidenceBadge = (confidence) => {
    switch (confidence) {
      case 'high': return <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Alta</span>;
      case 'medium': return <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Media</span>;
      default: return <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Baja</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="text-2xl font-bold text-blue-600">{stats.uniqueUrls}</div>
          <div className="text-sm text-gray-600">URLs únicas</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="text-2xl font-bold text-purple-600">{stats.totalKeywords}</div>
          <div className="text-sm text-gray-600">Keywords totales</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="text-2xl font-bold text-green-600">{stats.totalVolume.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Volumen total</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-amber-500">
          <div className="text-2xl font-bold text-amber-600">{stats.expansions}</div>
          <div className="text-sm text-gray-600">Expansiones</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="text-2xl font-bold text-red-600">{discardedData.length}</div>
          <div className="text-sm text-gray-600">Descartadas</div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Distribución por Categoría</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.categories)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, count]) => (
              <span
                key={cat}
                className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
              >
                {cat}: {count}
              </span>
            ))
          }
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-xl p-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Resultados por URL</h2>
            <p className="text-sm text-gray-500 mt-1">
              {stats.totalKeywords} keywords en {stats.uniqueUrls} URLs (orden original)
            </p>
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
              Descartadas ({discardedData.length})
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
            <div className="grid gap-2">
              {discardedData.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm bg-white p-3 rounded-lg shadow-sm">
                  <div>
                    <span className="font-medium">{item.keyword}</span>
                    {item.url && (
                      <span className="text-gray-400 ml-2 text-xs truncate max-w-xs inline-block align-middle">
                        ({item.url})
                      </span>
                    )}
                  </div>
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
          <button
            onClick={toggleExpandAll}
            className="px-4 py-2 border-2 rounded-lg hover:bg-gray-50 transition"
          >
            {expandAll ? 'Colapsar todo' : 'Expandir todo'}
          </button>
        </div>

        {/* URL Groups */}
        <div className="space-y-3">
          {groupedByURL.map(([url, group], urlIndex) => {
            const isExpanded = expandedUrls.has(url);

            return (
              <div key={url} className="border-2 rounded-lg overflow-hidden">
                {/* URL Header */}
                <div
                  className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white cursor-pointer"
                  onClick={() => toggleExpand(url)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Link2 size={16} />
                        <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded">
                          #{urlIndex + 1}
                        </span>
                        {/* Show URL classification */}
                        {group.keywords[0] && (
                          <>
                            <span className="text-xs bg-white/30 px-2 py-0.5 rounded font-semibold">
                              {group.keywords[0]['Categoría']}
                            </span>
                            {group.keywords[0]['Subcategoría 1'] && (
                              <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                                {group.keywords[0]['Subcategoría 1']}
                              </span>
                            )}
                          </>
                        )}
                        {group.expansionCount > 0 && (
                          <span className="text-xs bg-amber-400/30 px-2 py-0.5 rounded flex items-center gap-1">
                            <Sparkles size={12} />
                            +{group.expansionCount}
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-sm break-all">{url}</div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <div className="text-right">
                        <div className="font-bold">{group.keywords.length} kws</div>
                        <div className="text-xs opacity-80">
                          {group.totalVolume.toLocaleString()} vol
                        </div>
                      </div>
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="bg-gray-50">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-2 p-3 bg-gray-100 border-b text-xs font-semibold text-gray-600 uppercase">
                      <div className="col-span-1"></div>
                      <div className="col-span-3">Keyword</div>
                      <div className="col-span-2">Categoría</div>
                      <div className="col-span-2">Subcategoría</div>
                      <div className="col-span-1 text-center">Vol</div>
                      <div className="col-span-1 text-center">Intent</div>
                      <div className="col-span-2 text-center">Info</div>
                    </div>

                    {/* Keywords */}
                    <div className="divide-y">
                      {group.keywords.map((row) => (
                        <div
                          key={row.id}
                          className={`grid grid-cols-12 gap-2 p-3 items-center hover:bg-white transition text-sm ${
                            row._isExpansion ? 'bg-amber-50/50' : ''
                          }`}
                        >
                          {/* Delete */}
                          <div className="col-span-1">
                            <button
                              onClick={() => onRemoveKeyword(row.id)}
                              className="text-red-400 hover:text-red-600 transition p-1"
                              title="Eliminar keyword"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          {/* Keyword */}
                          <div className="col-span-3 font-medium text-gray-800 truncate flex items-center gap-1" title={row['Keyword']}>
                            {row._isExpansion && (
                              <Sparkles size={14} className="text-amber-500 flex-shrink-0" title={`Expansión de: ${row._expansionSource}`} />
                            )}
                            <span className="truncate">{row['Keyword']}</span>
                          </div>

                          {/* Category */}
                          <div className="col-span-2">
                            {editingCell?.id === row.id && editingCell?.field === 'Categoría' ? (
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
                                className="cursor-pointer hover:bg-indigo-50 rounded px-1 flex items-center gap-1 group"
                                onClick={() => startEdit(row.id, 'Categoría', row['Categoría'])}
                              >
                                <span className="text-xs font-medium text-indigo-700 bg-indigo-100 px-2 py-1 rounded truncate">
                                  {row['Categoría']}
                                </span>
                                <Edit2 size={10} className="text-gray-400 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                              </div>
                            )}
                          </div>

                          {/* SubCategory */}
                          <div className="col-span-2">
                            <span className="text-xs text-gray-500 truncate block" title={row['Subcategoría 1']}>
                              {row['Subcategoría 1'] || '—'}
                            </span>
                          </div>

                          {/* Volume */}
                          <div className="col-span-1 text-center font-mono text-gray-600">
                            {parseInt(row['SV'] || 0).toLocaleString()}
                          </div>

                          {/* Intent */}
                          <div className="col-span-1 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              row['KW Intent'] === 'Transactional'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-sky-100 text-sky-700'
                            }`}>
                              {row['KW Intent']?.charAt(0) || 'I'}
                            </span>
                          </div>

                          {/* Confidence & Source */}
                          <div className="col-span-2 flex items-center justify-center gap-1">
                            {getConfidenceBadge(row._confidence)}
                            {row._sistrixEnriched && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded" title="Datos de SISTRIX">
                                S
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {groupedByURL.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron resultados con los filtros actuales
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsStep;
