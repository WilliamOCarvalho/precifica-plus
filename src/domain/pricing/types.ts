export type ProductKind = "product" | "service";

/** Monetary values accepted by the engine are integer centavos (BRL). */
export interface PricingInput {
  kind: ProductKind;
  name?: string;
  productCostCents: number;
  packagingCents: number;
  otherVariableCostsCents: number;
  fixedCostAllocationCents: number;
  taxRatePercent: number;
  paymentFeePercent: number;
  commissionPercent: number;
  desiredMarginPercent: number;
}

export interface PriceCompositionItem {
  label: string;
  amountCents: number;
  tone: "cost" | "fee" | "profit";
}

export interface PricingResult {
  baseCostCents: number;
  recommendedPriceCents: number;
  taxCents: number;
  paymentFeeCents: number;
  commissionCents: number;
  totalCostCents: number;
  netProfitCents: number;
  actualNetMarginPercent: number;
  markup: number;
  desiredMarginPercent: number;
  composition: PriceCompositionItem[];
}

export interface ManualPriceSimulation {
  salePriceCents: number;
  taxCents: number;
  paymentFeeCents: number;
  commissionCents: number;
  totalCostCents: number;
  netProfitCents: number;
  netMarginPercent: number;
  differenceFromRecommendedCents: number;
}

export class PricingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingValidationError";
  }
}
