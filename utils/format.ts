export function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toLocaleString();
}

export function getPct(lines: number, total: number): string {
  return total > 0 ? ((lines / total) * 100).toFixed(1) + '%' : '0%';
}
