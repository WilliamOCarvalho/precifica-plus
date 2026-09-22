import { describe, expect, it } from "vitest";
import { calculateRecommendedPrice, simulateManualPrice } from "./pricing-engine";
import { PricingValidationError, type PricingInput } from "./types";

const standardInput: PricingInput = {
  kind: "product",
  productCostCents: 5000,
  packagingCents: 350,
  otherVariableCostsCents: 200,
  fixedCostAllocationCents: 450,
  taxRatePercent: 6,
  paymentFeePercent: 3.49,
  commissionPercent: 5,
  desiredMarginPercent: 25,
};

describe("pricing engine", () => {
  it("calculates a recommended price with percentage charges applied to sale price", () => {
    const result = calculateRecommendedPrice(standardInput);
    expect(result.baseCostCents).toBe(6000);
    expect(result.recommendedPriceCents).toBe(9916);
    expect(result.taxCents).toBe(595);
    expect(result.paymentFeeCents).toBe(346);
    expect(result.commissionCents).toBe(496);
    expect(result.netProfitCents).toBe(2479);
    expect(result.markup).toBeCloseTo(1.652667, 5);
  });

  it("works with zero rates", () => {
    const result = calculateRecommendedPrice({ ...standardInput, taxRatePercent: 0, paymentFeePercent: 0, commissionPercent: 0, desiredMarginPercent: 0 });
    expect(result.recommendedPriceCents).toBe(6000);
    expect(result.netProfitCents).toBe(0);
  });

  it("works with zero desired margin", () => {
    const result = calculateRecommendedPrice({ ...standardInput, desiredMarginPercent: 0 });
    expect(result.recommendedPriceCents).toBe(7017);
    expect(result.actualNetMarginPercent).toBeCloseTo(0, 1);
  });

  it("aggregates multiple fees", () => {
    const result = calculateRecommendedPrice({ ...standardInput, productCostCents: 10000, packagingCents: 0, otherVariableCostsCents: 0, fixedCostAllocationCents: 0, taxRatePercent: 10, paymentFeePercent: 5, commissionPercent: 5, desiredMarginPercent: 20 });
    expect(result.recommendedPriceCents).toBe(16667);
  });

  it("rounds the recommended price and monetary fees to centavos", () => {
    const result = calculateRecommendedPrice({ ...standardInput, productCostCents: 100, packagingCents: 0, otherVariableCostsCents: 0, fixedCostAllocationCents: 0, taxRatePercent: 3.49, paymentFeePercent: 0, commissionPercent: 0, desiredMarginPercent: 25 });
    expect(result.recommendedPriceCents).toBe(140);
    expect(result.taxCents).toBe(5);
  });

  it("simulates a manually entered price", () => {
    const result = simulateManualPrice(standardInput, 7990);
    expect(result.salePriceCents).toBe(7990);
    expect(result.netProfitCents).toBe(832);
    expect(result.differenceFromRecommendedCents).toBe(-1926);
  });

  it("reports loss for a manual price below the base cost", () => {
    const result = simulateManualPrice(standardInput, 5000);
    expect(result.netProfitCents).toBeLessThan(0);
    expect(result.netMarginPercent).toBeLessThan(0);
  });

  it("rejects rates plus margin of 100% or more", () => {
    expect(() => calculateRecommendedPrice({ ...standardInput, desiredMarginPercent: 85.51 })).toThrow(PricingValidationError);
  });

  it("rejects negative and invalid numeric values", () => {
    expect(() => calculateRecommendedPrice({ ...standardInput, packagingCents: -1 })).toThrow("Embalagem");
    expect(() => calculateRecommendedPrice({ ...standardInput, taxRatePercent: Number.NaN })).toThrow("Imposto");
    expect(() => simulateManualPrice(standardInput, Number.NaN)).toThrow("Preço de venda");
  });
});
