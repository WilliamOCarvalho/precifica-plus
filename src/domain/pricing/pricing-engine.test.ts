import { describe, expect, it } from "vitest";
import { DEFAULT_SALES_CHANNELS } from "./sales-channels";
import {
  calculateEquivalentChannelPrices,
  calculateRecommendedPrice,
  compareSalesChannels,
  compareSamePrice,
  simulateManualPrice,
  suggestCommercialPrices,
} from "./pricing-engine";
import { PricingValidationError, type PricingInput, type SalesChannel } from "./types";

const channel = (id: SalesChannel["id"]): SalesChannel => {
  const found = DEFAULT_SALES_CHANNELS.find((item) => item.id === id);
  if (!found) throw new Error("Canal de teste ausente");
  return { ...found };
};

const standardInput: PricingInput = {
  kind: "product", productCostCents: 5000, packagingCents: 350, otherVariableCostsCents: 200, fixedCostAllocationCents: 450,
  taxRatePercent: 6, commissionPercent: 5, desiredMarginPercent: 25, channel: channel("credit"),
};

describe("pricing engine", () => {
  it("calculates a recommended price with taxes, channel fee and commission", () => {
    const result = calculateRecommendedPrice(standardInput);
    expect(result.baseCostCents).toBe(6000);
    expect(result.recommendedPriceCents).toBe(9916);
    expect(result.taxCents).toBe(595);
    expect(result.channelFeeCents).toBe(346);
    expect(result.commissionCents).toBe(496);
    expect(result.totalPercentageExpenseCents).toBe(1437);
    expect(result.netProfitCents).toBe(2479);
  });

  it("calculates PIX with no channel fee", () => {
    const result = calculateRecommendedPrice({ ...standardInput, channel: channel("pix") });
    expect(result.channelFeeCents).toBe(0);
    expect(result.recommendedPriceCents).toBe(9375);
    expect(result.recommendedPriceCents).toBeLessThan(calculateRecommendedPrice(standardInput).recommendedPriceCents);
  });

  it("calculates debit, credit and marketplace with their own editable rates", () => {
    const results = compareSalesChannels(standardInput, DEFAULT_SALES_CHANNELS);
    expect(results.map((result) => result.channel.id)).toEqual(["pix", "debit", "credit", "marketplace"]);
    expect(results[0].recommendedPriceCents).toBeLessThan(results[1].recommendedPriceCents);
    expect(results[1].recommendedPriceCents).toBeLessThan(results[2].recommendedPriceCents);
    expect(results[2].recommendedPriceCents).toBeLessThan(results[3].recommendedPriceCents);
    expect(results[3].channelFeeCents).toBeGreaterThan(results[2].channelFeeCents);
  });

  it("works with zero rates and margin", () => {
    const result = calculateRecommendedPrice({ ...standardInput, taxRatePercent: 0, commissionPercent: 0, desiredMarginPercent: 0, channel: { ...channel("pix"), channelFeePercent: 0 } });
    expect(result.recommendedPriceCents).toBe(6000);
    expect(result.netProfitCents).toBe(0);
  });

  it("rounds monetary outputs to centavos", () => {
    const result = calculateRecommendedPrice({ ...standardInput, productCostCents: 100, packagingCents: 0, otherVariableCostsCents: 0, fixedCostAllocationCents: 0, taxRatePercent: 3.49, commissionPercent: 0, desiredMarginPercent: 25, channel: channel("pix") });
    expect(result.recommendedPriceCents).toBe(140);
    expect(result.taxCents).toBe(5);
  });

  it("compares one identical price across channels", () => {
    const results = compareSamePrice(standardInput, 10000, DEFAULT_SALES_CHANNELS);
    expect(results[0].netProfitCents).toBeGreaterThan(results[3].netProfitCents);
    expect(results[0].netMarginPercent).toBeGreaterThan(results[2].netMarginPercent);
    expect(results[3].channelFeeCents).toBe(1600);
  });

  it("keeps the margin obtained in a reference channel", () => {
    const equivalent = calculateEquivalentChannelPrices(standardInput, channel("pix"), 10000, DEFAULT_SALES_CHANNELS);
    const pix = equivalent.find((result) => result.channel.id === "pix");
    const marketplace = equivalent.find((result) => result.channel.id === "marketplace");
    expect(pix?.priceCents).toBe(10000);
    expect(marketplace?.priceCents).toBeGreaterThan(10000);
    equivalent.forEach((result) => expect(result.netMarginPercent).toBeCloseTo(29, 1));
  });

  it("can compare an unprofitable reference price without making it a validation error", () => {
    const equivalent = calculateEquivalentChannelPrices(standardInput, channel("pix"), 5000, DEFAULT_SALES_CHANNELS);
    expect(equivalent).toHaveLength(4);
    equivalent.forEach((result) => expect(result.netMarginPercent).toBeLessThan(0));
  });

  it("simulates a manual price and reports loss below costs", () => {
    const simulation = simulateManualPrice(standardInput, 7990);
    expect(simulation.differenceFromRecommendedCents).toBe(-1926);
    expect(simulateManualPrice(standardInput, 5000).netProfitCents).toBeLessThan(0);
  });

  it("derives commercial prices and their impact from the mathematical result", () => {
    const suggestions = suggestCommercialPrices(standardInput);
    expect(suggestions).toHaveLength(3);
    expect(suggestions[0].priceCents).toBeGreaterThanOrEqual(calculateRecommendedPrice(standardInput).recommendedPriceCents);
    expect(suggestions[0].netMarginPercent).toBeGreaterThanOrEqual(calculateRecommendedPrice(standardInput).actualNetMarginPercent);
  });

  it("rejects invalid channel fees, impossible margin and invalid numeric values", () => {
    expect(() => calculateRecommendedPrice({ ...standardInput, channel: { ...channel("pix"), channelFeePercent: 100 } })).toThrow(PricingValidationError);
    expect(() => calculateRecommendedPrice({ ...standardInput, desiredMarginPercent: 85.51 })).toThrow(PricingValidationError);
    expect(() => calculateRecommendedPrice({ ...standardInput, packagingCents: -1 })).toThrow("Embalagem");
    expect(() => calculateRecommendedPrice({ ...standardInput, taxRatePercent: Number.NaN })).toThrow("Imposto");
    expect(() => simulateManualPrice(standardInput, Number.POSITIVE_INFINITY)).toThrow("Preço de venda");
  });
});
