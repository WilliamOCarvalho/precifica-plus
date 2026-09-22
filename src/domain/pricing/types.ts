export type ProductKind = "product" | "service";

export type SalesChannelId = "pix" | "debit" | "credit" | "marketplace";

/** A selling channel has only its transaction or platform fee. Taxes remain business-level. */
export interface SalesChannel {
  id: SalesChannelId;
  label: string;
  channelFeePercent: number;
}

/** Monetary values accepted by the engine are integer centavos (BRL). */
export interface PricingInput {
  kind: ProductKind;
  name?: string;
  productCostCents: number;
  packagingCents: number;
  otherVariableCostsCents: number;
  fixedCostAllocationCents: number;
  /** Business or operation tax, independent of the sales channel. */
  taxRatePercent: number;
  /** Sales commission, independent of the sales channel. */
  commissionPercent: number;
  desiredMarginPercent: number;
  channel: SalesChannel;
}

export interface PriceCompositionItem {
  label: string;
  amountCents: number;
  tone: "cost" | "fee" | "profit";
}

export interface PricingResult {
  channel: SalesChannel;
  baseCostCents: number;
  recommendedPriceCents: number;
  taxCents: number;
  channelFeeCents: number;
  commissionCents: number;
  totalPercentageExpenseCents: number;
  totalPercentageRatePercent: number;
  totalCostCents: number;
  netProfitCents: number;
  actualNetMarginPercent: number;
  markup: number;
  desiredMarginPercent: number;
  composition: PriceCompositionItem[];
}

export interface ManualPriceSimulation {
  channel: SalesChannel;
  salePriceCents: number;
  taxCents: number;
  channelFeeCents: number;
  commissionCents: number;
  totalPercentageExpenseCents: number;
  totalCostCents: number;
  netProfitCents: number;
  netMarginPercent: number;
  differenceFromRecommendedCents: number;
}

export interface EquivalentChannelPrice {
  channel: SalesChannel;
  priceCents: number;
  netProfitCents: number;
  netMarginPercent: number;
}

export interface CommercialPriceSuggestion {
  priceCents: number;
  netProfitCents: number;
  netMarginPercent: number;
}

export class PricingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingValidationError";
  }
}
