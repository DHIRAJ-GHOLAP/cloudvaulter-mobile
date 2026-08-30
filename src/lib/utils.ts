export const formatBytes = (bytes: number, decimals = 2): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const formatCurrency = (amount: number | null | undefined, currency = 'INR'): string => {
  const val = typeof amount === 'number' && isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(val);
};

export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '-'; }
};

export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '-'; }
};

export const getFileIcon = (contentType: string): string => {
  if (contentType.includes('image')) return 'image';
  if (contentType.includes('video')) return 'videocam';
  if (contentType.includes('audio')) return 'musical-notes';
  if (contentType.includes('pdf')) return 'document-text';
  if (contentType.includes('zip') || contentType.includes('archive')) return 'archive';
  if (contentType.includes('text')) return 'document';
  return 'document-outline';
};

export const getFileColor = (contentType: string): string => {
  if (contentType.includes('image')) return '#7C3AED';
  if (contentType.includes('video')) return '#0EA5E9';
  if (contentType.includes('audio')) return '#16A34A';
  if (contentType.includes('pdf')) return '#DC2626';
  if (contentType.includes('zip') || contentType.includes('archive')) return '#D97706';
  return '#FF6B00';
};

export const truncate = (str: string, maxLen: number): string => {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  const ext = str.lastIndexOf('.');
  if (ext > 0 && str.length - ext <= 6) {
    const extPart = str.slice(ext);
    return str.slice(0, maxLen - extPart.length - 3) + '...' + extPart;
  }
  return str.slice(0, maxLen - 3) + '...';
};
