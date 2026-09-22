import {
  type ManualPriceSimulation,
  type PriceCompositionItem,
  type PricingInput,
  type PricingResult,
  PricingValidationError,
} from "./types";

const PERCENT_DENOMINATOR = 100;

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new PricingValidationError(`${label} deve ser um número maior ou igual a zero.`);
  }
}

function roundCents(value: number): number {
  return Math.round(value);
}

function feeCents(priceCents: number, percent: number): number {
  return roundCents((priceCents * percent) / PERCENT_DENOMINATOR);
}

function validateInput(input: PricingInput): void {
  const monetaryFields: Array<[number, string]> = [
    [input.productCostCents, "Custo do produto"],
    [input.packagingCents, "Embalagem"],
    [input.otherVariableCostsCents, "Outros custos variáveis"],
    [input.fixedCostAllocationCents, "Rateio de custo fixo"],
  ];
  const percentageFields: Array<[number, string]> = [
    [input.taxRatePercent, "Imposto"],
    [input.paymentFeePercent, "Taxa de pagamento"],
    [input.commissionPercent, "Comissão"],
    [input.desiredMarginPercent, "Margem líquida desejada"],
  ];

  monetaryFields.forEach(([value, label]) => {
    assertFiniteNonNegative(value, label);
    if (!Number.isInteger(value)) {
      throw new PricingValidationError(`${label} deve ser informado em centavos inteiros.`);
    }
  });
  percentageFields.forEach(([value, label]) => assertFiniteNonNegative(value, label));

  const combinedPercent =
    input.taxRatePercent +
    input.paymentFeePercent +
    input.commissionPercent +
    input.desiredMarginPercent;
  if (combinedPercent >= PERCENT_DENOMINATOR) {
    throw new PricingValidationError(
      "A soma de taxas e margem deve ser menor que 100% para que exista um preço válido.",
    );
  }
}

function baseCost(input: PricingInput): number {
  return (
    input.productCostCents +
    input.packagingCents +
    input.otherVariableCostsCents +
    input.fixedCostAllocationCents
  );
}

/**
 * Calculates the selling price from `price = baseCost / (1 - fees - desiredMargin)`.
 * Monetary outputs are integer centavos. The recommended price is rounded to the
 * nearest cent, then all fee and profit figures are derived from that rounded price.
 */
export function calculateRecommendedPrice(input: PricingInput): PricingResult {
  validateInput(input);
  const baseCostCents = baseCost(input);
  const totalFeePercent =
    input.taxRatePercent + input.paymentFeePercent + input.commissionPercent;
  const denominator = 1 - (totalFeePercent + input.desiredMarginPercent) / PERCENT_DENOMINATOR;
  const recommendedPriceCents = roundCents(baseCostCents / denominator);
  const taxCents = feeCents(recommendedPriceCents, input.taxRatePercent);
  const paymentFeeCents = feeCents(recommendedPriceCents, input.paymentFeePercent);
  const commissionCents = feeCents(recommendedPriceCents, input.commissionPercent);
  const totalCostCents = baseCostCents + taxCents + paymentFeeCents + commissionCents;
  const netProfitCents = recommendedPriceCents - totalCostCents;
  const actualNetMarginPercent =
    recommendedPriceCents === 0 ? 0 : (netProfitCents / recommendedPriceCents) * PERCENT_DENOMINATOR;
  const markup = baseCostCents === 0 ? 0 : recommendedPriceCents / baseCostCents;

  const composition: PriceCompositionItem[] = [
    { label: "Custo do produto", amountCents: input.productCostCents, tone: "cost" },
    { label: "Embalagem", amountCents: input.packagingCents, tone: "cost" },
    { label: "Outros custos", amountCents: input.otherVariableCostsCents, tone: "cost" },
    { label: "Rateio de custo fixo", amountCents: input.fixedCostAllocationCents, tone: "cost" },
    { label: "Impostos", amountCents: taxCents, tone: "fee" },
    { label: "Taxa de pagamento", amountCents: paymentFeeCents, tone: "fee" },
    { label: "Comissão", amountCents: commissionCents, tone: "fee" },
    { label: "Lucro líquido", amountCents: netProfitCents, tone: "profit" },
  ];

  return {
    baseCostCents,
    recommendedPriceCents,
    taxCents,
    paymentFeeCents,
    commissionCents,
    totalCostCents,
    netProfitCents,
    actualNetMarginPercent,
    markup,
    desiredMarginPercent: input.desiredMarginPercent,
    composition,
  };
}

/** Calculates the financial impact of an arbitrary sale price using the same input. */
export function simulateManualPrice(
  input: PricingInput,
  salePriceCents: number,
): ManualPriceSimulation {
  validateInput(input);
  assertFiniteNonNegative(salePriceCents, "Preço de venda");
  if (!Number.isInteger(salePriceCents)) {
    throw new PricingValidationError("Preço de venda deve ser informado em centavos inteiros.");
  }

  const recommended = calculateRecommendedPrice(input);
  const taxCents = feeCents(salePriceCents, input.taxRatePercent);
  const paymentFeeCents = feeCents(salePriceCents, input.paymentFeePercent);
  const commissionCents = feeCents(salePriceCents, input.commissionPercent);
  const totalCostCents = baseCost(input) + taxCents + paymentFeeCents + commissionCents;
  const netProfitCents = salePriceCents - totalCostCents;

  return {
    salePriceCents,
    taxCents,
    paymentFeeCents,
    commissionCents,
    totalCostCents,
    netProfitCents,
    netMarginPercent: salePriceCents === 0 ? 0 : (netProfitCents / salePriceCents) * PERCENT_DENOMINATOR,
    differenceFromRecommendedCents: salePriceCents - recommended.recommendedPriceCents,
  };
}
