"use client";

import { FormEvent, useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { ChannelInsights } from "@/features/pricing/channel-insights";
import { DEFAULT_SALES_CHANNELS } from "@/domain/pricing/sales-channels";
import { calculateRecommendedPrice, compareSalesChannels } from "@/domain/pricing/pricing-engine";
import type { PricingInput, PricingResult, ProductKind, SalesChannel, SalesChannelId } from "@/domain/pricing/types";
import { PricingValidationError } from "@/domain/pricing/types";
import { currencyToCents, parseBrazilianNumber } from "@/lib/format";

type FormValues = { kind: ProductKind; name: string; productCost: string; packaging: string; otherVariableCosts: string; fixedCostAllocation: string; taxRate: string; commission: string; desiredMargin: string; selectedChannelId: SalesChannelId; channelFees: Record<SalesChannelId, string> };
type Calculation = { input: PricingInput; channels: SalesChannel[]; result: PricingResult; comparisons: PricingResult[] };

const initialValues: FormValues = {
  kind: "product", name: "", productCost: "50,00", packaging: "3,50", otherVariableCosts: "2,00", fixedCostAllocation: "4,50", taxRate: "6", commission: "5", desiredMargin: "25", selectedChannelId: "credit",
  channelFees: { pix: "0", debit: "1,5", credit: "3,49", marketplace: "16" },
};

function Field({ label, value, onChange, suffix, placeholder = "0,00" }: { label: string; value: string; onChange: (value: string) => void; suffix?: string; placeholder?: string }) {
  return <label className="field"><span>{label}</span><div className="field-input">{suffix === "R$" ? <span>R$</span> : null}<input inputMode="decimal" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} aria-label={label} />{suffix === "%" ? <span>%</span> : null}</div></label>;
}

function toPricingContext(values: FormValues): Pick<Calculation, "input" | "channels"> {
  const money = (value: string, label: string): number => { const cents = currencyToCents(value); if (cents === null) throw new PricingValidationError(`${label} precisa ser preenchido com um valor válido.`); return cents; };
  const percent = (value: string, label: string): number => { const parsed = parseBrazilianNumber(value); if (parsed === null) throw new PricingValidationError(`${label} precisa ser preenchido com um percentual válido.`); return parsed; };
  const channels = DEFAULT_SALES_CHANNELS.map((channel) => ({ ...channel, channelFeePercent: percent(values.channelFees[channel.id], `Taxa do canal ${channel.label}`) }));
  const selectedChannel = channels.find((channel) => channel.id === values.selectedChannelId);
  if (!selectedChannel) throw new PricingValidationError("Selecione um canal de venda válido.");
  return { channels, input: { kind: values.kind, name: values.name.trim(), productCostCents: money(values.productCost, values.kind === "product" ? "Custo do produto" : "Custo direto"), packagingCents: money(values.packaging, "Embalagem ou materiais"), otherVariableCostsCents: money(values.otherVariableCosts, "Outros custos variáveis"), fixedCostAllocationCents: money(values.fixedCostAllocation, "Rateio de custo fixo"), taxRatePercent: percent(values.taxRate, "Imposto"), commissionPercent: percent(values.commission, "Comissão"), desiredMarginPercent: percent(values.desiredMargin, "Margem líquida desejada"), channel: selectedChannel } };
}

function buildCalculation(values: FormValues): Calculation {
  const { input, channels } = toPricingContext(values);
  return { input, channels, result: calculateRecommendedPrice(input), comparisons: compareSalesChannels(input, channels) };
}

export function PricingCalculator() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [calculation, setCalculation] = useState<Calculation | null>(() => buildCalculation(initialValues));
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSidebarCollapsed(window.localStorage.getItem("precifica.sidebar.collapsed") === "true");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggleSidebar = () => setSidebarCollapsed((current) => {
    const next = !current;
    window.localStorage.setItem("precifica.sidebar.collapsed", String(next));
    return next;
  });
  const update = (field: Exclude<keyof FormValues, "channelFees">, value: string) => setValues((current) => ({ ...current, [field]: value }));
  const updateChannelFee = (id: SalesChannelId, value: string) => setValues((current) => ({ ...current, channelFees: { ...current.channelFees, [id]: value } }));
  const calculate = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); try { setCalculation(buildCalculation(values)); setError(null); } catch (caught) { setCalculation(null); setError(caught instanceof Error ? caught.message : "Não foi possível calcular o preço."); } };

  return <div className={`app-shell${sidebarCollapsed ? " app-sidebar-collapsed" : ""}`}>
    <AppSidebar collapsed={sidebarCollapsed} mobileOpen={mobileMenuOpen} onToggleCollapsed={toggleSidebar} onCloseMobile={() => setMobileMenuOpen(false)} />
    <main className="main-content">
      <div className="compact-topbar"><button type="button" className="mobile-menu-trigger" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button><h1>Calcular preço</h1></div>
      <form onSubmit={calculate} className="calculator-layout compact-layout" noValidate>
        <section className="form-panel compact-form-panel" aria-label="Dados para precificação">
          <div className="compact-form-section product-section"><div className="compact-section-heading"><h2>Produto/serviço</h2><div className="toggle" role="group" aria-label="Tipo de item"><button type="button" onClick={() => update("kind", "product")} className={values.kind === "product" ? "selected" : ""}>Produto</button><button type="button" onClick={() => update("kind", "service")} className={values.kind === "service" ? "selected" : ""}>Serviço</button></div></div><label className="field compact-name"><span>Nome <em>opcional</em></span><div className="field-input"><input value={values.name} onChange={(event) => update("name", event.target.value)} placeholder={values.kind === "product" ? "Ex.: Kit de velas" : "Ex.: Consultoria"} /></div></label><div className="fields-grid"><Field label={values.kind === "product" ? "Custo" : "Custo direto"} value={values.productCost} onChange={(value) => update("productCost", value)} suffix="R$" /><Field label={values.kind === "product" ? "Embalagem" : "Materiais"} value={values.packaging} onChange={(value) => update("packaging", value)} suffix="R$" /><Field label="Outros custos" value={values.otherVariableCosts} onChange={(value) => update("otherVariableCosts", value)} suffix="R$" /><Field label="Custo fixo" value={values.fixedCostAllocation} onChange={(value) => update("fixedCostAllocation", value)} suffix="R$" /></div></div>
          <div className="compact-form-section sales-section"><div className="compact-section-heading"><h2>Venda</h2></div><div className="fields-grid"><Field label="Imposto" value={values.taxRate} onChange={(value) => update("taxRate", value)} suffix="%" /><Field label="Comissão" value={values.commission} onChange={(value) => update("commission", value)} suffix="%" /></div><div className="channel-editor">{DEFAULT_SALES_CHANNELS.map((channel) => <div className={`channel-editor-item${values.selectedChannelId === channel.id ? " selected-channel" : ""}`} key={channel.id}><button type="button" onClick={() => update("selectedChannelId", channel.id)} aria-pressed={values.selectedChannelId === channel.id}>{channel.label}</button><div className="field-input"><input inputMode="decimal" value={values.channelFees[channel.id]} onChange={(event) => updateChannelFee(channel.id, event.target.value)} aria-label={`Taxa do canal ${channel.label}`} /><span>%</span></div></div>)}</div></div>
          <div className="compact-form-section margin-section"><Field label="Margem desejada" value={values.desiredMargin} onChange={(value) => update("desiredMargin", value)} suffix="%" /><button className="primary-button" type="submit">Calcular preço</button></div>
        </section>
        <section className="result-column compact-result-column">{error ? <div className="error-box"><strong>Revise os dados</strong><p>{error}</p></div> : null}{calculation ? <ChannelInsights key={`${calculation.input.channel.id}-${calculation.result.recommendedPriceCents}`} input={calculation.input} channels={calculation.channels} result={calculation.result} comparisons={calculation.comparisons} /> : <div className="empty-result"><strong>Preencha os dados para calcular.</strong></div>}</section>
      </form>
    </main>
  </div>;
}
