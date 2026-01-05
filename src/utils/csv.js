/**
 * Parse CSV text into headers and rows
 * Auto-detects delimiter (comma, semicolon, or tab)
 * @param {string} text - Raw CSV text
 * @returns {{ headers: string[], rows: Object[] }}
 */
export const parseCSV = (text) => {
  // Remove BOM and normalize line endings
  const normalizedText = text
    .replace(/^\uFEFF/, '')           // Remove BOM
    .replace(/\r\n/g, '\n')           // Windows line endings
    .replace(/\r/g, '\n')             // Mac line endings
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // Remove control characters

  // Split lines and clean each one (remove trailing tabs, spaces, etc.)
  const lines = normalizedText
    .split('\n')
    .map(l => l.replace(/[\t\s]+$/, '').trim())  // Remove trailing tabs and whitespace
    .filter(l => l);
  if (lines.length === 0) return { headers: [], rows: [] };

  // Auto-detect delimiter from first line
  const firstLine = lines[0];
  let delimiter = ',';

  // Count occurrences of potential delimiters
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = '\t';
  }

  // Clean a value: remove quotes, trim, and remove trailing delimiters
  const cleanValue = (val) => {
    if (!val) return '';
    return val
      .trim()
      .replace(/^["']+|["']+$/g, '')   // Remove surrounding quotes (single or double)
      .replace(/[;,\s]+$/, '')          // Remove trailing semicolons, commas, whitespace
      .replace(/^[;,\s]+/, '')          // Remove leading semicolons, commas, whitespace
      .trim();
  };

  console.log('CSV Debug - Delimiter detected:', delimiter, '| First line:', firstLine.substring(0, 100));

  // Handle quoted fields
  const parseLine = (line, delim) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delim && !inQuotes) {
        result.push(cleanValue(current));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(cleanValue(current));

    // Remove empty trailing columns
    while (result.length > 0 && result[result.length - 1] === '') {
      result.pop();
    }

    return result;
  };

  const headers = parseLine(lines[0], delimiter);
  console.log('CSV Debug - Headers parsed:', headers);

  const rows = lines.slice(1).map(line => {
    const values = parseLine(line, delimiter);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || '';
    });
    return row;
  });

  console.log('CSV Debug - First row:', rows[0]);
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
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
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
 * Uses UTF-8 BOM and semicolon delimiter for proper Excel handling in Spanish
 * @param {Object[]} data - Data to export
 * @param {string[]} headers - Column headers
 * @param {string} filename - Output filename
 */
export const downloadCSV = (data, headers, filename = 'export.csv') => {
  // Use semicolon as delimiter for better Excel compatibility in Spanish locales
  const escapeField = (field) => {
    const str = String(field || '');
    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.join(';'),
    ...data.map(row => headers.map(h => escapeField(row[h])).join(';'))
  ];

  const csvContent = csvLines.join('\r\n');

  // UTF-8 BOM for Excel to recognize encoding
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
