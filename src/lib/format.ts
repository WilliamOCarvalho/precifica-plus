export const formatCurrency = (cents: number): string =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export const formatPercent = (value: number): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const parseBrazilianNumber = (value: string): number | null => {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized || !/^\d+(\.\d+)?$/.test(normalized)) return null;
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
};

export const currencyToCents = (value: string): number | null => {
  const parsed = parseBrazilianNumber(value);
  return parsed === null ? null : Math.round(parsed * 100);
};
