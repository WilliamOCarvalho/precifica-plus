"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  calculateRecommendedPrice,
  simulateManualPrice,
} from "@/domain/pricing/pricing-engine";
import type { PricingInput, PricingResult, ProductKind } from "@/domain/pricing/types";
import { PricingValidationError } from "@/domain/pricing/types";
import { currencyToCents, formatCurrency, formatPercent, parseBrazilianNumber } from "@/lib/format";

type FormValues = {
  kind: ProductKind;
  name: string;
  productCost: string;
  packaging: string;
  otherVariableCosts: string;
  fixedCostAllocation: string;
  taxRate: string;
  paymentFee: string;
  commission: string;
  desiredMargin: string;
};

const initialValues: FormValues = {
  kind: "product",
  name: "",
  productCost: "50,00",
  packaging: "3,50",
  otherVariableCosts: "2,00",
  fixedCostAllocation: "4,50",
  taxRate: "6",
  paymentFee: "3,49",
  commission: "5",
  desiredMargin: "25",
};

const navigation = [
  ["⌁", "Calcular preço", true],
  ["▣", "Meus produtos", false],
  ["◫", "Simulações", false],
  ["◌", "Custos fixos", false],
  ["▥", "Relatórios", false],
  ["?", "Aprenda", false],
] as const;

function Field({
  label,
  value,
  onChange,
  suffix,
  placeholder = "0,00",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="field-input">
        {suffix === "R$" ? <span>R$</span> : null}
        <input
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
        />
        {suffix === "%" ? <span>%</span> : null}
      </div>
    </label>
  );
}

function ResultCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`metric-card${accent ? " metric-card-positive" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function toPricingInput(values: FormValues): PricingInput {
  const money = (value: string, label: string): number => {
    const cents = currencyToCents(value);
    if (cents === null) throw new PricingValidationError(`${label} precisa ser preenchido com um valor válido.`);
    return cents;
  };
  const percent = (value: string, label: string): number => {
    const parsed = parseBrazilianNumber(value);
    if (parsed === null) throw new PricingValidationError(`${label} precisa ser preenchido com um percentual válido.`);
    return parsed;
  };

  return {
    kind: values.kind,
    name: values.name.trim(),
    productCostCents: money(values.productCost, values.kind === "product" ? "Custo do produto" : "Custo direto"),
    packagingCents: money(values.packaging, "Embalagem ou materiais"),
    otherVariableCostsCents: money(values.otherVariableCosts, "Outros custos variáveis"),
    fixedCostAllocationCents: money(values.fixedCostAllocation, "Rateio de custo fixo"),
    taxRatePercent: percent(values.taxRate, "Imposto"),
    paymentFeePercent: percent(values.paymentFee, "Taxa de pagamento"),
    commissionPercent: percent(values.commission, "Comissão"),
    desiredMarginPercent: percent(values.desiredMargin, "Margem líquida desejada"),
  };
}

export function PricingCalculator() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [result, setResult] = useState<PricingResult | null>(() => calculateRecommendedPrice(toPricingInput(initialValues)));
  const [error, setError] = useState<string | null>(null);
  const [manualPrice, setManualPrice] = useState("");
  const [simulationMessage, setSimulationMessage] = useState<string | null>(null);

  const update = (field: keyof FormValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  const calculate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSimulationMessage(null);
    try {
      const nextResult = calculateRecommendedPrice(toPricingInput(values));
      setResult(nextResult);
      setManualPrice("");
      setError(null);
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Não foi possível calcular o preço.");
    }
  };

  const simulate = () => {
    try {
      const cents = currencyToCents(manualPrice);
      if (cents === null) throw new PricingValidationError("Informe um preço de venda válido para simular.");
      const simulation = simulateManualPrice(toPricingInput(values), cents);
      const impact =
        simulation.netProfitCents < 0
          ? `Este preço gera prejuízo de ${formatCurrency(Math.abs(simulation.netProfitCents))} por venda.`
          : `Com esse preço sua margem será de ${formatPercent(simulation.netMarginPercent)}.`;
      const difference =
        simulation.differenceFromRecommendedCents === 0
          ? "É igual ao preço recomendado."
          : `${simulation.differenceFromRecommendedCents > 0 ? "Diferença acima" : "Diferença abaixo"} do recomendado: ${formatCurrency(Math.abs(simulation.differenceFromRecommendedCents))}.`;
      setSimulationMessage(`${impact} ${difference}`);
      setError(null);
    } catch (caught) {
      setSimulationMessage(null);
      setError(caught instanceof Error ? caught.message : "Não foi possível simular este preço.");
    }
  };

  const donutStyle = useMemo(() => {
    if (!result || result.recommendedPriceCents === 0) return { background: "#e2e8f0" };
    const colors = ["#60a5fa", "#93c5fd", "#cbd5e1", "#94a3b8", "#fbbf24", "#fb923c", "#f87171", "#22c55e"];
    let current = 0;
    const sections = result.composition
      .filter((item) => item.amountCents > 0)
      .map((item, index) => {
        const next = current + (item.amountCents / result.recommendedPriceCents) * 100;
        const section = `${colors[index]} ${current}% ${next}%`;
        current = next;
        return section;
      });
    return { background: `conic-gradient(${sections.join(", ")})` };
  }, [result]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>+</span> Precifica</div>
        <nav aria-label="Navegação principal">
          {navigation.map(([icon, label, active]) => (
            <button type="button" className={`nav-item${active ? " nav-active" : ""}`} key={label} aria-current={active ? "page" : undefined}>
              <span>{icon}</span>{label}{!active ? <small>Em breve</small> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-note"><strong>Preço certo.</strong><br />Mais lucro para o seu negócio.</div>
      </aside>

      <main className="main-content">
        <header className="page-heading">
          <div>
            <p className="eyebrow">PRECIFICAÇÃO</p>
            <h1>Calculadora inteligente de preço</h1>
            <p>Descubra o preço ideal para seu produto ou serviço, considerando todos os custos e taxas.</p>
          </div>
          <div className="help-chip">● Dados salvos nesta sessão</div>
        </header>

        <form onSubmit={calculate} className="calculator-layout" noValidate>
          <section className="form-panel">
            <div className="form-section">
              <div className="section-title"><span>1</span><div><h2>Dados do produto/serviço</h2><p>Informe os custos por unidade.</p></div></div>
              <div className="toggle" role="group" aria-label="Tipo de item">
                <button type="button" onClick={() => update("kind", "product")} className={values.kind === "product" ? "selected" : ""}>Produto</button>
                <button type="button" onClick={() => update("kind", "service")} className={values.kind === "service" ? "selected" : ""}>Serviço</button>
              </div>
              <label className="field full-field"><span>Nome {values.kind === "product" ? "do produto" : "do serviço"} <em>opcional</em></span><div className="field-input"><input value={values.name} onChange={(event) => update("name", event.target.value)} placeholder={values.kind === "product" ? "Ex.: Kit de velas" : "Ex.: Consultoria"} /></div></label>
              <div className="fields-grid">
                <Field label={values.kind === "product" ? "Custo do produto" : "Custo direto"} value={values.productCost} onChange={(v) => update("productCost", v)} suffix="R$" />
                <Field label={values.kind === "product" ? "Embalagem" : "Materiais"} value={values.packaging} onChange={(v) => update("packaging", v)} suffix="R$" />
                <Field label="Outros custos variáveis" value={values.otherVariableCosts} onChange={(v) => update("otherVariableCosts", v)} suffix="R$" />
                <Field label="Rateio de custo fixo por unidade" value={values.fixedCostAllocation} onChange={(v) => update("fixedCostAllocation", v)} suffix="R$" />
              </div>
              {values.kind === "service" ? <p className="service-hint">A estrutura já está preparada para incluir custo/hora, horas trabalhadas e deslocamento em uma próxima etapa.</p> : null}
            </div>

            <div className="form-section">
              <div className="section-title"><span>2</span><div><h2>Taxas e impostos</h2><p>Percentuais incidentes sobre o preço de venda.</p></div></div>
              <div className="fields-grid fields-three"><Field label="Imposto" value={values.taxRate} onChange={(v) => update("taxRate", v)} suffix="%" /><Field label="Taxa de pagamento" value={values.paymentFee} onChange={(v) => update("paymentFee", v)} suffix="%" /><Field label="Comissão" value={values.commission} onChange={(v) => update("commission", v)} suffix="%" /></div>
            </div>

            <div className="form-section last-section">
              <div className="section-title"><span>3</span><div><h2>Margem desejada</h2><p>O lucro líquido que você quer obter em cada venda.</p></div></div>
              <div className="margin-row"><Field label="Margem líquida desejada" value={values.desiredMargin} onChange={(v) => update("desiredMargin", v)} suffix="%" /><button className="primary-button" type="submit">Calcular preço <span>→</span></button></div>
            </div>
          </section>

          <section className="result-column" aria-live="polite">
            {error ? <div className="error-box"><strong>Revise os dados</strong><p>{error}</p></div> : null}
            {result ? <>
              <div className="recommended-card">
                <p>PREÇO RECOMENDADO</p>
                <strong>{formatCurrency(result.recommendedPriceCents)}</strong>
                <span>Para atingir {formatPercent(result.desiredMarginPercent)} de margem líquida.</span>
              </div>
              <div className="metrics-grid">
                <ResultCard label="Lucro por venda" value={formatCurrency(result.netProfitCents)} accent />
                <ResultCard label="Margem real" value={formatPercent(result.actualNetMarginPercent)} accent />
                <ResultCard label="Custo total" value={formatCurrency(result.totalCostCents)} />
                <ResultCard label="Markup" value={`${result.markup.toFixed(2).replace(".", ",")}x`} />
              </div>
              <div className="composition-card">
                <div className="composition-header"><div><h2>Composição do preço</h2><p>Para onde vai o dinheiro da venda?</p></div><span>{formatCurrency(result.recommendedPriceCents)}</span></div>
                <div className="composition-body">
                  <div className="donut" style={donutStyle}><div><strong>100%</strong><span>da venda</span></div></div>
                  <div className="composition-list">
                    {result.composition.map((item, index) => <div key={item.label}><span className={`legend-dot dot-${index}`} /> <span>{item.label}</span><strong>{formatCurrency(item.amountCents)}</strong></div>)}
                  </div>
                </div>
                <p className="interpretation">De cada R$ 100 vendidos, aproximadamente <strong>{formatCurrency(Math.round(result.netProfitCents * 10000 / result.recommendedPriceCents))}</strong> representam lucro e <strong>{formatCurrency(Math.round((result.totalCostCents) * 10000 / result.recommendedPriceCents))}</strong> cobrem custos, taxas e impostos.</p>
              </div>
              <div className="simulation-card">
                <div><h2>Simule outro preço</h2><p>Veja o impacto de um preço de venda manual.</p></div>
                <div className="simulation-controls"><div className="field-input"><span>R$</span><input inputMode="decimal" value={manualPrice} onChange={(event) => setManualPrice(event.target.value)} placeholder="Ex.: 79,90" aria-label="Preço de venda para simulação" /></div><button type="button" className="secondary-button" onClick={simulate}>Simular</button></div>
                {simulationMessage ? <p className="simulation-message">{simulationMessage}</p> : null}
              </div>
            </> : <div className="empty-result"><strong>Preencha os dados para calcular.</strong><p>O preço recomendado aparecerá aqui.</p></div>}
          </section>
        </form>
      </main>
    </div>
  );
}
