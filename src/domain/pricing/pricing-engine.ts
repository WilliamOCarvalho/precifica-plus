import {
  type CommercialPriceSuggestion,
  type EquivalentChannelPrice,
  type ManualPriceSimulation,
  type PriceCompositionItem,
  type PricingInput,
  type PricingResult,
  PricingValidationError,
  type SalesChannel,
} from "./types";

const PERCENT_DENOMINATOR = 100;

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new PricingValidationError(`${label} deve ser um número maior ou igual a zero.`);
  }
}

function assertValidCents(value: number, label: string): void {
  assertFiniteNonNegative(value, label);
  if (!Number.isInteger(value)) {
    throw new PricingValidationError(`${label} deve ser informado em centavos inteiros.`);
  }
}

function roundCents(value: number): number {
  return Math.round(value);
}

function percentageAmountCents(priceCents: number, percent: number): number {
  return roundCents((priceCents * percent) / PERCENT_DENOMINATOR);
}

function validateChannel(channel: SalesChannel): void {
  if (!channel || !channel.id || !channel.label) {
    throw new PricingValidationError("Selecione um canal de venda válido.");
  }
  assertFiniteNonNegative(channel.channelFeePercent, `Taxa do canal ${channel.label}`);
  if (channel.channelFeePercent >= PERCENT_DENOMINATOR) {
    throw new PricingValidationError(`A taxa do canal ${channel.label} deve ser menor que 100%.`);
  }
}

function validatePricingPercentages(
  input: Pick<PricingInput, "taxRatePercent" | "commissionPercent">,
  channel: SalesChannel,
  marginPercent: number,
): void {
  if (!Number.isFinite(marginPercent)) {
    throw new PricingValidationError("A margem deve ser um número válido.");
  }
  const combinedPercent =
    input.taxRatePercent + input.commissionPercent + channel.channelFeePercent + marginPercent;
  if (combinedPercent >= PERCENT_DENOMINATOR) {
    throw new PricingValidationError(
      "A soma de impostos, comissão, taxa do canal e margem deve ser menor que 100% para que exista um preço válido.",
    );
  }
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
    [input.commissionPercent, "Comissão"],
    [input.desiredMarginPercent, "Margem líquida desejada"],
  ];
  monetaryFields.forEach(([value, label]) => assertValidCents(value, label));
  percentageFields.forEach(([value, label]) => assertFiniteNonNegative(value, label));
  validateChannel(input.channel);
  validatePricingPercentages(input, input.channel, input.desiredMarginPercent);
}

function baseCost(input: PricingInput): number {
  return input.productCostCents + input.packagingCents + input.otherVariableCostsCents + input.fixedCostAllocationCents;
}

function withChannel(input: PricingInput, channel: SalesChannel, desiredMarginPercent = input.desiredMarginPercent): PricingInput {
  return { ...input, channel, desiredMarginPercent };
}

/**
 * Calculates `price = baseCost / (1 - taxes - channelFee - commission - desiredMargin)`.
 * Charges and profit are derived after price rounding, preserving price = costs + charges + profit.
 */
export function calculateRecommendedPrice(input: PricingInput): PricingResult {
  validateInput(input);
  const baseCostCents = baseCost(input);
  const totalPercentageRatePercent = input.taxRatePercent + input.channel.channelFeePercent + input.commissionPercent;
  const denominator = 1 - (totalPercentageRatePercent + input.desiredMarginPercent) / PERCENT_DENOMINATOR;
  const recommendedPriceCents = roundCents(baseCostCents / denominator);
  const taxCents = percentageAmountCents(recommendedPriceCents, input.taxRatePercent);
  const channelFeeCents = percentageAmountCents(recommendedPriceCents, input.channel.channelFeePercent);
  const commissionCents = percentageAmountCents(recommendedPriceCents, input.commissionPercent);
  const totalPercentageExpenseCents = taxCents + channelFeeCents + commissionCents;
  const totalCostCents = baseCostCents + totalPercentageExpenseCents;
  const netProfitCents = recommendedPriceCents - totalCostCents;
  const actualNetMarginPercent = recommendedPriceCents === 0 ? 0 : (netProfitCents / recommendedPriceCents) * PERCENT_DENOMINATOR;
  const markup = baseCostCents === 0 ? 0 : recommendedPriceCents / baseCostCents;
  const composition: PriceCompositionItem[] = [
    { label: "Custo do produto", amountCents: input.productCostCents, tone: "cost" },
    { label: "Embalagem", amountCents: input.packagingCents, tone: "cost" },
    { label: "Outros custos", amountCents: input.otherVariableCostsCents, tone: "cost" },
    { label: "Rateio de custo fixo", amountCents: input.fixedCostAllocationCents, tone: "cost" },
    { label: "Impostos", amountCents: taxCents, tone: "fee" },
    { label: `Taxa ${input.channel.label}`, amountCents: channelFeeCents, tone: "fee" },
    { label: "Comissão", amountCents: commissionCents, tone: "fee" },
    { label: "Lucro líquido", amountCents: netProfitCents, tone: "profit" },
  ];

  return { channel: input.channel, baseCostCents, recommendedPriceCents, taxCents, channelFeeCents, commissionCents, totalPercentageExpenseCents, totalPercentageRatePercent, totalCostCents, netProfitCents, actualNetMarginPercent, markup, desiredMarginPercent: input.desiredMarginPercent, composition };
}

/** Calculates the financial impact of an arbitrary sale price in one channel. */
export function simulateManualPrice(input: PricingInput, salePriceCents: number): ManualPriceSimulation {
  validateInput(input);
  assertValidCents(salePriceCents, "Preço de venda");
  const recommended = calculateRecommendedPrice(input);
  const taxCents = percentageAmountCents(salePriceCents, input.taxRatePercent);
  const channelFeeCents = percentageAmountCents(salePriceCents, input.channel.channelFeePercent);
  const commissionCents = percentageAmountCents(salePriceCents, input.commissionPercent);
  const totalPercentageExpenseCents = taxCents + channelFeeCents + commissionCents;
  const totalCostCents = baseCost(input) + totalPercentageExpenseCents;
  const netProfitCents = salePriceCents - totalCostCents;
  return { channel: input.channel, salePriceCents, taxCents, channelFeeCents, commissionCents, totalPercentageExpenseCents, totalCostCents, netProfitCents, netMarginPercent: salePriceCents === 0 ? 0 : (netProfitCents / salePriceCents) * PERCENT_DENOMINATOR, differenceFromRecommendedCents: salePriceCents - recommended.recommendedPriceCents };
}

/** Returns the recommended result for every supplied selling channel. */
export function compareSalesChannels(input: PricingInput, channels: readonly SalesChannel[]): PricingResult[] {
  if (channels.length === 0) throw new PricingValidationError("Informe ao menos um canal de venda.");
  return channels.map((channel) => calculateRecommendedPrice(withChannel(input, channel)));
}

/** Simulates one identical sale price for every supplied selling channel. */
export function compareSamePrice(input: PricingInput, salePriceCents: number, channels: readonly SalesChannel[]): ManualPriceSimulation[] {
  if (channels.length === 0) throw new PricingValidationError("Informe ao menos um canal de venda.");
  return channels.map((channel) => simulateManualPrice(withChannel(input, channel), salePriceCents));
}

/** Uses the reference sale margin to compute the price required in each channel to preserve it. */
export function calculateEquivalentChannelPrices(input: PricingInput, referenceChannel: SalesChannel, referenceSalePriceCents: number, channels: readonly SalesChannel[]): EquivalentChannelPrice[] {
  validateChannel(referenceChannel);
  assertValidCents(referenceSalePriceCents, "Preço de referência");
  const reference = simulateManualPrice(withChannel(input, referenceChannel), referenceSalePriceCents);
  return channels.map((channel) => {
    validateChannel(channel);
    validatePricingPercentages(input, channel, reference.netMarginPercent);
    const totalRate = input.taxRatePercent + input.commissionPercent + channel.channelFeePercent;
    const priceCents = roundCents(baseCost(input) / (1 - (totalRate + reference.netMarginPercent) / PERCENT_DENOMINATOR));
    const simulation = simulateManualPrice(withChannel(input, channel), priceCents);
    return { channel, priceCents, netProfitCents: simulation.netProfitCents, netMarginPercent: simulation.netMarginPercent };
  });
}

/** Provides nearby, higher commercial price endings and their calculated financial impact. */
export function suggestCommercialPrices(input: PricingInput): CommercialPriceSuggestion[] {
  const mathematicalPrice = calculateRecommendedPrice(input).recommendedPriceCents;
  const currentWhole = Math.floor(mathematicalPrice / 100) * 100;
  const endingNinety = currentWhole + 90 >= mathematicalPrice ? currentWhole + 90 : currentWhole + 190;
  const nextWhole = Math.ceil(mathematicalPrice / 100) * 100;
  const nextTenEndingNinety = Math.ceil((mathematicalPrice + 10) / 1000) * 1000 - 10;
  const candidates = [...new Set([endingNinety, nextWhole, nextTenEndingNinety])].sort((a, b) => a - b);
  while (candidates.length < 3) {
    candidates.push(candidates[candidates.length - 1] + 100);
  }
  return candidates.map((priceCents) => {
    const simulation = simulateManualPrice(input, priceCents);
    return { priceCents, netProfitCents: simulation.netProfitCents, netMarginPercent: simulation.netMarginPercent };
  });
}
