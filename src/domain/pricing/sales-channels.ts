import type { SalesChannel } from "./types";

/** Editable starting values only; they are not official payment-channel rates. */
export const DEFAULT_SALES_CHANNELS: readonly SalesChannel[] = [
  { id: "pix", label: "PIX", channelFeePercent: 0 },
  { id: "debit", label: "Débito", channelFeePercent: 1.5 },
  { id: "credit", label: "Crédito", channelFeePercent: 3.49 },
  { id: "marketplace", label: "Marketplace", channelFeePercent: 16 },
];
