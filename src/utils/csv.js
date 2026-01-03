/**
 * Parse CSV text into headers and rows
 * @param {string} text - Raw CSV text
 * @returns {{ headers: string[], rows: Object[] }}
 */
export const parseCSV = (text) => {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  // Handle quoted fields with commas
  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || '';
    });
    return row;
  });

  return { headers, rows };
};

/**
 * Generate CSV content from data
 * @param {Object[]} data - Array of row objects
 * @param {string[]} headers - Column headers
 * @returns {string}
 */
export const generateCSV = (data, headers) => {
  const escapeField = (field) => {
    const str = String(field || '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  return [
    headers.join(','),
    ...data.map(row => headers.map(h => escapeField(row[h])).join(','))
  ].join('\n');
};

/**
 * Download data as CSV file
 * @param {Object[]} data - Data to export
 * @param {string[]} headers - Column headers
 * @param {string} filename - Output filename
 */
export const downloadCSV = (data, headers, filename = 'export.csv') => {
  const csvContent = generateCSV(data, headers);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
