import React, { useMemo, useState } from 'react';
import { Download, Search, Trash2, AlertTriangle, Edit2, Check, X, ChevronDown, ChevronRight, Plus, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';

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
  const [expandedUrls, setExpandedUrls] = useState(new Set());
  const [showAlternatives, setShowAlternatives] = useState(null);

  // Statistics
  const stats = useMemo(() => {
    const newPages = processedData.filter(r => r['URL exists'] === 'No').length;
    const existingPages = processedData.filter(r => r['URL exists'] === 'Yes').length;
    const needsReview = processedData.filter(r => r._recommendation === 'review').length;
    const enriched = processedData.filter(r => r._sistrixEnriched).length;
    const highConfidence = processedData.filter(r => r._confidence === 'high').length;

    return { newPages, existingPages, needsReview, enriched, highConfidence };
  }, [processedData]);

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
    } else if (sortBy === 'recommendation') {
      const order = { 'review': 0, 'create-new': 1, 'use-existing': 2, 'keep': 3 };
      data.sort((a, b) => (order[a._recommendation] || 99) - (order[b._recommendation] || 99));
    }

    return data;
  }, [processedData, filterText, sortBy]);

  const groupedByURL = useMemo(() => {
    const groups = {};
    sortedData.forEach(row => {
      const url = row['Target-URL'] || 'Sin URL';
      if (!groups[url]) {
        groups[url] = {
          keywords: [],
          totalVolume: 0,
          source: row._source,
          recommendation: row._recommendation,
          message: row._message,
          alternatives: row._alternatives || [],
          exists: row['URL exists']
        };
      }
      groups[url].keywords.push(row);
      groups[url].totalVolume += parseInt(row['SV'] || 0);
    });

    // Sort groups: review first, then new, then existing
    return Object.entries(groups).sort((a, b) => {
      const order = { 'review': 0, 'create-new': 1, 'use-existing': 2, 'keep': 3 };
      return (order[a[1].recommendation] || 99) - (order[b[1].recommendation] || 99);
    });
  }, [sortedData]);

  const toggleExpand = (url) => {
    const newExpanded = new Set(expandedUrls);
    if (newExpanded.has(url)) {
      newExpanded.delete(url);
    } else {
      newExpanded.add(url);
    }
    setExpandedUrls(newExpanded);
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

  const getRecommendationStyle = (rec) => {
    switch (rec) {
      case 'keep': return { bg: 'bg-blue-600', text: 'Mantener (SISTRIX)', icon: CheckCircle };
      case 'use-existing': return { bg: 'bg-green-600', text: 'URL existente', icon: CheckCircle };
      case 'review': return { bg: 'bg-amber-500', text: 'Revisar', icon: AlertCircle };
      case 'create-new': return { bg: 'bg-purple-600', text: 'Crear nueva', icon: Plus };
      default: return { bg: 'bg-gray-600', text: 'Pendiente', icon: AlertCircle };
    }
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
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="text-2xl font-bold text-green-600">{stats.existingPages}</div>
          <div className="text-sm text-gray-600">URLs existentes</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="text-2xl font-bold text-purple-600">{stats.newPages}</div>
          <div className="text-sm text-gray-600">Páginas nuevas</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-amber-500">
          <div className="text-2xl font-bold text-amber-600">{stats.needsReview}</div>
          <div className="text-sm text-gray-600">Requieren revisión</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="text-2xl font-bold text-red-600">{discardedData.length}</div>
          <div className="text-sm text-gray-600">Descartadas</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
          <div className="text-2xl font-bold text-indigo-600">{stats.highConfidence}</div>
          <div className="text-sm text-gray-600">Alta confianza</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-xl p-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Resultados del Análisis</h2>
            <p className="text-sm text-gray-500 mt-1">
              {processedData.length} keywords procesadas · {Object.keys(groupedByURL).length} URLs únicas
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
            <option value="recommendation">Por Recomendación</option>
            <option value="volume">Por Volumen</option>
            <option value="category">Por Categoría</option>
            <option value="ranking">Por Ranking</option>
          </select>
        </div>

        {/* URL Groups */}
        <div className="space-y-3">
          {groupedByURL.map(([url, group]) => {
            const recStyle = getRecommendationStyle(group.recommendation);
            const RecIcon = recStyle.icon;
            const isExpanded = expandedUrls.has(url);
            const primaryKw = group.keywords[0];

            return (
              <div key={url} className="border-2 rounded-lg overflow-hidden">
                {/* URL Header */}
                <div
                  className={`p-4 text-white cursor-pointer ${recStyle.bg}`}
                  onClick={() => toggleExpand(url)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <RecIcon size={16} />
                        <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded">
                          {recStyle.text}
                        </span>
                        {group.message && (
                          <span className="text-xs bg-black/20 px-2 py-0.5 rounded">
                            {group.message}
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

                  {/* Alternatives hint */}
                  {group.alternatives?.length > 0 && (
                    <div className="mt-2 text-xs opacity-80">
                      {group.alternatives.length} alternativa(s) disponible(s)
                    </div>
                  )}
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="bg-gray-50">
                    {/* Alternatives */}
                    {group.alternatives?.length > 0 && (
                      <div className="p-3 bg-amber-50 border-b">
                        <div className="text-xs font-semibold text-amber-800 mb-2">
                          Alternativas sugeridas:
                        </div>
                        <div className="space-y-1">
                          {group.alternatives.map((alt, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <ExternalLink size={12} className="text-amber-600" />
                              <span className="font-mono text-gray-700">{alt.url}</span>
                              <span className="text-amber-600">— {alt.reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Keywords */}
                    <div className="divide-y">
                      {group.keywords.map((row) => (
                        <div key={row.id} className="p-3 flex items-center gap-3 hover:bg-white transition">
                          <button
                            onClick={() => onRemoveKeyword(row.id)}
                            className="text-red-400 hover:text-red-600 transition"
                            title="Eliminar keyword"
                          >
                            <Trash2 size={16} />
                          </button>

                          <div className="flex-1 grid grid-cols-7 gap-2 text-sm items-center">
                            {/* Category */}
                            <div className="flex items-center gap-1">
                              {editingCell?.id === row.id && editingCell?.field === 'Main Category' ? (
                                <div className="flex gap-1">
                                  <input
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="w-20 p-1 border rounded text-xs"
                                    autoFocus
                                  />
                                  <button onClick={saveEdit} className="text-green-600"><Check size={14} /></button>
                                  <button onClick={cancelEdit} className="text-red-600"><X size={14} /></button>
                                </div>
                              ) : (
                                <div
                                  className="cursor-pointer hover:bg-indigo-50 rounded px-1 flex items-center gap-1 group"
                                  onClick={() => startEdit(row.id, 'Main Category', row['Main Category'])}
                                >
                                  <span className="text-xs font-medium text-indigo-700 bg-indigo-100 px-2 py-1 rounded">
                                    {row['Main Category']}
                                  </span>
                                  <Edit2 size={10} className="text-gray-400 opacity-0 group-hover:opacity-100" />
                                </div>
                              )}
                            </div>

                            {/* SubCategory */}
                            <span className="text-xs text-gray-500 truncate" title={row['Sub Category 1']}>
                              {row['Sub Category 1'] || '—'}
                            </span>

                            {/* Keyword */}
                            <span className="font-medium text-gray-800 truncate col-span-2" title={row['Keyword']}>
                              {row['Keyword']}
                            </span>

                            {/* Volume */}
                            <span className="text-center font-mono text-gray-600">
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

                            {/* Confidence & Intent */}
                            <div className="flex items-center gap-1 justify-end">
                              {getConfidenceBadge(row._confidence)}
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                row['KW Intent'] === 'Transactional'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-sky-100 text-sky-700'
                              }`}>
                                {row['KW Intent']?.charAt(0)}
                              </span>
                            </div>
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
