"use client";

import { useMemo, useState } from "react";
import {
  calculateEquivalentChannelPrices,
  compareSamePrice,
  suggestCommercialPrices,
} from "@/domain/pricing/pricing-engine";
import type { PricingInput, PricingResult, SalesChannel, SalesChannelId } from "@/domain/pricing/types";
import { PricingValidationError } from "@/domain/pricing/types";
import { currencyToCents, formatCurrency, formatPercent } from "@/lib/format";

type ChannelInsightsProps = {
  input: PricingInput;
  channels: readonly SalesChannel[];
  comparisons: readonly PricingResult[];
};

export function ChannelInsights({ input, channels, comparisons }: ChannelInsightsProps) {
  const [samePrice, setSamePrice] = useState("");
  const [samePriceError, setSamePriceError] = useState<string | null>(null);
  const [samePriceResults, setSamePriceResults] = useState<ReturnType<typeof compareSamePrice> | null>(null);
  const [referenceChannelId, setReferenceChannelId] = useState<SalesChannelId>(input.channel.id);
  const [referencePrice, setReferencePrice] = useState("");
  const [equivalentError, setEquivalentError] = useState<string | null>(null);
  const [equivalentResults, setEquivalentResults] = useState<ReturnType<typeof calculateEquivalentChannelPrices> | null>(null);
  const commercialSuggestions = useMemo(() => suggestCommercialPrices(input), [input]);

  const comparePrice = () => {
    try {
      const cents = currencyToCents(samePrice);
      if (cents === null) throw new PricingValidationError("Informe um preço de venda válido para comparar.");
      setSamePriceResults(compareSamePrice(input, cents, channels));
      setSamePriceError(null);
    } catch (caught) {
      setSamePriceResults(null);
      setSamePriceError(caught instanceof Error ? caught.message : "Não foi possível comparar os canais.");
    }
  };

  const keepMargin = () => {
    try {
      const cents = currencyToCents(referencePrice);
      const referenceChannel = channels.find((channel) => channel.id === referenceChannelId);
      if (cents === null) throw new PricingValidationError("Informe um preço de referência válido.");
      if (!referenceChannel) throw new PricingValidationError("Selecione um canal de referência válido.");
      setEquivalentResults(calculateEquivalentChannelPrices(input, referenceChannel, cents, channels));
      setEquivalentError(null);
    } catch (caught) {
      setEquivalentResults(null);
      setEquivalentError(caught instanceof Error ? caught.message : "Não foi possível manter a mesma margem.");
    }
  };

  return (
    <section className="advanced-section" aria-label="Comparações avançadas por canal">
      <div className="advanced-heading">
        <p className="eyebrow">COMPARAÇÕES AVANÇADAS</p>
        <h2>Entenda o impacto de cada forma de venda</h2>
        <p>As taxas abaixo são editáveis e os resultados são calculados com os dados desta simulação.</p>
      </div>

      <details className="advanced-panel" open>
        <summary>Compare por forma de pagamento <span>⌄</span></summary>
        <div className="channel-comparison-grid">
          {comparisons.map((result) => (
            <article className="channel-result-card" key={result.channel.id}>
              <div><strong>{result.channel.label}</strong><span>Taxa do canal: {formatPercent(result.channel.channelFeePercent)}</span></div>
              <p>Preço necessário</p><b>{formatCurrency(result.recommendedPriceCents)}</b>
              <dl><div><dt>Lucro líquido</dt><dd>{formatCurrency(result.netProfitCents)}</dd></div><div><dt>Margem</dt><dd>{formatPercent(result.actualNetMarginPercent)}</dd></div></dl>
            </article>
          ))}
        </div>
      </details>

      <details className="advanced-panel">
        <summary>E se eu cobrar o mesmo preço? <span>⌄</span></summary>
        <div className="advanced-controls">
          <label className="inline-field"><span>Preço de venda</span><div className="field-input"><span>R$</span><input inputMode="decimal" value={samePrice} onChange={(event) => setSamePrice(event.target.value)} placeholder="Ex.: 89,90" /></div></label>
          <button type="button" className="secondary-button" onClick={comparePrice}>Comparar canais</button>
        </div>
        {samePriceError ? <p className="inline-error">{samePriceError}</p> : null}
        {samePriceResults ? <div className="same-price-grid" aria-live="polite">
          {samePriceResults.map((result) => <article key={result.channel.id}><h3>{result.channel.label}</h3><p>Taxas: <strong>{formatPercent(input.taxRatePercent + input.commissionPercent + result.channel.channelFeePercent)}</strong></p><p>Lucro: <strong>{formatCurrency(result.netProfitCents)}</strong></p><p>Margem: <strong className={result.netProfitCents < 0 ? "negative" : "positive"}>{formatPercent(result.netMarginPercent)}</strong></p></article>)}
        </div> : null}
      </details>

      <details className="advanced-panel">
        <summary>Manter a mesma margem <span>⌄</span></summary>
        <p className="advanced-description">Informe um canal e seu preço. Calcularemos o valor necessário nos demais canais para preservar a margem líquida obtida.</p>
        <div className="advanced-controls equivalent-controls">
          <label className="inline-field"><span>Canal de referência</span><select value={referenceChannelId} onChange={(event) => setReferenceChannelId(event.target.value as SalesChannelId)}>{channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.label}</option>)}</select></label>
          <label className="inline-field"><span>Preço no canal</span><div className="field-input"><span>R$</span><input inputMode="decimal" value={referencePrice} onChange={(event) => setReferencePrice(event.target.value)} placeholder="Ex.: 79,90" /></div></label>
          <button type="button" className="secondary-button" onClick={keepMargin}>Calcular equivalência</button>
        </div>
        {equivalentError ? <p className="inline-error">{equivalentError}</p> : null}
        {equivalentResults ? <div className="same-price-grid" aria-live="polite">
          {equivalentResults.map((result) => <article key={result.channel.id}><h3>{result.channel.label}</h3><p>Preço equivalente</p><b>{formatCurrency(result.priceCents)}</b><p>Margem: <strong className={result.netProfitCents < 0 ? "negative" : "positive"}>{formatPercent(result.netMarginPercent)}</strong></p></article>)}
        </div> : null}
      </details>

      <details className="advanced-panel">
        <summary>Arredondamento comercial <span>⌄</span></summary>
        <p className="advanced-description">Sugestões calculadas acima do preço matemático para {input.channel.label}. Elas não são recomendações automáticas.</p>
        <div className="commercial-grid">
          {commercialSuggestions.map((suggestion) => <article key={suggestion.priceCents}><strong>{formatCurrency(suggestion.priceCents)}</strong><span>Lucro: {formatCurrency(suggestion.netProfitCents)}</span><span>Margem: {formatPercent(suggestion.netMarginPercent)}</span></article>)}
        </div>
      </details>
    </section>
  );
}
