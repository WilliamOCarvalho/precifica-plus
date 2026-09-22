"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  calculateEquivalentChannelPrices,
  compareSamePrice,
  simulateManualPrice,
  suggestCommercialPrices,
} from "@/domain/pricing/pricing-engine";
import type { PricingInput, PricingResult, SalesChannel, SalesChannelId } from "@/domain/pricing/types";
import { PricingValidationError } from "@/domain/pricing/types";
import { currencyToCents, formatCurrency, formatPercent } from "@/lib/format";

type ResultTab = "result" | "channels" | "same-price" | "equivalence";

type ChannelInsightsProps = {
  input: PricingInput;
  channels: readonly SalesChannel[];
  result: PricingResult;
  comparisons: readonly PricingResult[];
};

function DiscountBreakdown({ input, channel }: { input: PricingInput; channel: SalesChannel }) {
  const total = input.taxRatePercent + input.commissionPercent + channel.channelFeePercent;
  return <p className="discount-breakdown"><strong>Descontos sobre a venda: {formatPercent(total)}</strong><span>Impostos {formatPercent(input.taxRatePercent)} · Comissão {formatPercent(input.commissionPercent)} · Taxa do canal {formatPercent(channel.channelFeePercent)}</span></p>;
}

export function ChannelInsights({ input, channels, result, comparisons }: ChannelInsightsProps) {
  const [activeTab, setActiveTab] = useState<ResultTab>("result");
  const [manualPrice, setManualPrice] = useState("");
  const [manualMessage, setManualMessage] = useState<string | null>(null);
  const [samePrice, setSamePrice] = useState("");
  const [samePriceError, setSamePriceError] = useState<string | null>(null);
  const [samePriceResults, setSamePriceResults] = useState<ReturnType<typeof compareSamePrice> | null>(null);
  const [referenceChannelId, setReferenceChannelId] = useState<SalesChannelId>(input.channel.id);
  const [referencePrice, setReferencePrice] = useState("");
  const [equivalentError, setEquivalentError] = useState<string | null>(null);
  const [equivalentResults, setEquivalentResults] = useState<ReturnType<typeof calculateEquivalentChannelPrices> | null>(null);
  const [commercialOpen, setCommercialOpen] = useState(false);
  const suggestions = useMemo(() => suggestCommercialPrices(input), [input]);

  const simulate = () => {
    try {
      const cents = currencyToCents(manualPrice);
      if (cents === null) throw new PricingValidationError("Informe um preço de venda válido para simular.");
      const simulation = simulateManualPrice(input, cents);
      const message = simulation.netProfitCents < 0
        ? `Prejuízo de ${formatCurrency(Math.abs(simulation.netProfitCents))} por venda.`
        : `Lucro de ${formatCurrency(simulation.netProfitCents)} e margem de ${formatPercent(simulation.netMarginPercent)}.`;
      setManualMessage(message);
    } catch (caught) {
      setManualMessage(caught instanceof Error ? caught.message : "Não foi possível simular este preço.");
    }
  };

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
      setEquivalentError(caught instanceof Error ? caught.message : "Não foi possível calcular a equivalência.");
    }
  };

  return <section className="result-workspace" aria-live="polite">
    <div className="result-tabs" role="tablist" aria-label="Resultados da precificação">
      <button type="button" role="tab" aria-selected={activeTab === "result"} className={activeTab === "result" ? "active" : ""} onClick={() => setActiveTab("result")}>Resultado</button>
      <button type="button" role="tab" aria-selected={activeTab === "channels"} className={activeTab === "channels" ? "active" : ""} onClick={() => setActiveTab("channels")}>Canais</button>
      <button type="button" role="tab" aria-selected={activeTab === "same-price"} className={activeTab === "same-price" ? "active" : ""} onClick={() => setActiveTab("same-price")}>Mesmo preço</button>
      <button type="button" role="tab" aria-selected={activeTab === "equivalence"} className={activeTab === "equivalence" ? "active" : ""} onClick={() => setActiveTab("equivalence")}>Equivalência</button>
    </div>

    {activeTab === "result" ? <div className="tab-content result-tab">
      <div className="recommended-card compact-recommended"><p>PREÇO RECOMENDADO · {result.channel.label.toUpperCase()}</p><strong>{formatCurrency(result.recommendedPriceCents)}</strong><span>Margem desejada: {formatPercent(result.desiredMarginPercent)}</span></div>
      <div className="metrics-grid"><Metric label="Lucro por venda" value={formatCurrency(result.netProfitCents)} accent /><Metric label="Margem real" value={formatPercent(result.actualNetMarginPercent)} accent /><Metric label="Custo total" value={formatCurrency(result.totalCostCents)} /><Metric label="Markup" value={`${result.markup.toFixed(2).replace(".", ",")}x`} /></div>
      <div className="composition-card compact-composition"><div className="composition-header"><div><h2>Composição do preço</h2><p>Venda por {result.channel.label}</p></div><span>{formatCurrency(result.recommendedPriceCents)}</span></div><div className="compact-composition-list">{result.composition.filter((item) => item.amountCents > 0).map((item) => <div key={item.label}><span>{item.label}</span><strong>{formatCurrency(item.amountCents)}</strong></div>)}</div></div>
      <div className="compact-simulator"><label><span>Simule outro preço</span><div className="field-input"><span>R$</span><input inputMode="decimal" value={manualPrice} onChange={(event) => setManualPrice(event.target.value)} placeholder="89,90" aria-label="Preço para simulação" /></div></label><button type="button" className="secondary-button" onClick={simulate}>Simular</button></div>
      {manualMessage ? <p className="simulation-message">{manualMessage}</p> : null}
      <button type="button" className="commercial-toggle" onClick={() => setCommercialOpen((current) => !current)} aria-expanded={commercialOpen}>Ver opções de preço comercial <ChevronDown size={16} className={commercialOpen ? "rotated" : ""} /></button>
      {commercialOpen ? <div className="commercial-options">{suggestions.map((suggestion) => <div key={suggestion.priceCents}><strong>{formatCurrency(suggestion.priceCents)}</strong><span>Lucro {formatCurrency(suggestion.netProfitCents)} · Margem {formatPercent(suggestion.netMarginPercent)}</span></div>)}</div> : null}
    </div> : null}

    {activeTab === "channels" ? <div className="tab-content channel-tab"><p className="tab-lead">Preço necessário para alcançar a margem definida em cada canal.</p><div className="channel-comparison-grid">{comparisons.map((comparison) => <article className="channel-result-card" key={comparison.channel.id}><div><strong>{comparison.channel.label}</strong><span>Taxa do canal: {formatPercent(comparison.channel.channelFeePercent)}</span></div><b>{formatCurrency(comparison.recommendedPriceCents)}</b><p>Lucro líquido <strong>{formatCurrency(comparison.netProfitCents)}</strong></p><p>Margem <strong className="positive">{formatPercent(comparison.actualNetMarginPercent)}</strong></p><DiscountBreakdown input={input} channel={comparison.channel} /></article>)}</div></div> : null}

    {activeTab === "same-price" ? <div className="tab-content compact-tool-tab"><div className="tab-tool-header"><label><span>Preço de venda</span><div className="field-input"><span>R$</span><input inputMode="decimal" value={samePrice} onChange={(event) => setSamePrice(event.target.value)} placeholder="150,00" /></div></label><button type="button" className="secondary-button" onClick={comparePrice}>Comparar</button></div>{samePriceError ? <p className="inline-error">{samePriceError}</p> : null}{samePriceResults ? <div className="same-price-grid">{samePriceResults.map((comparison) => <article key={comparison.channel.id}><h3>{comparison.channel.label}</h3><strong>{formatCurrency(comparison.netProfitCents)}</strong><span>Lucro</span><b className={comparison.netProfitCents < 0 ? "negative" : "positive"}>{formatPercent(comparison.netMarginPercent)}</b><span>Margem</span><DiscountBreakdown input={input} channel={comparison.channel} /></article>)}</div> : <EmptyHint text="Informe um preço para ver lucro, margem e descontos nos quatro canais." />}</div> : null}

    {activeTab === "equivalence" ? <div className="tab-content compact-tool-tab"><div className="tab-tool-header equivalence-controls"><label><span>Canal de referência</span><select value={referenceChannelId} onChange={(event) => setReferenceChannelId(event.target.value as SalesChannelId)}>{channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.label}</option>)}</select></label><label><span>Preço</span><div className="field-input"><span>R$</span><input inputMode="decimal" value={referencePrice} onChange={(event) => setReferencePrice(event.target.value)} placeholder="79,90" /></div></label><button type="button" className="secondary-button" onClick={keepMargin}>Calcular</button></div>{equivalentError ? <p className="inline-error">{equivalentError}</p> : null}{equivalentResults ? <div className="same-price-grid equivalence-grid">{equivalentResults.map((equivalent) => <article key={equivalent.channel.id}><h3>{equivalent.channel.label}</h3><strong>{formatCurrency(equivalent.priceCents)}</strong><span>Preço equivalente</span><b className={equivalent.netProfitCents < 0 ? "negative" : "positive"}>{formatPercent(equivalent.netMarginPercent)}</b><span>Margem</span></article>)}</div> : <EmptyHint text="Use um preço de referência para calcular quanto cobrar nos demais canais." />}</div> : null}
  </section>;
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div className={`metric-card${accent ? " metric-card-positive" : ""}`}><span>{label}</span><strong>{value}</strong></div>;
}

function EmptyHint({ text }: { text: string }) { return <p className="empty-tab-hint">{text}</p>; }
