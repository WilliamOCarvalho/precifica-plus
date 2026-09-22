"use client";

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Calculator,
  ChartNoAxesCombined,
  CircleDollarSign,
  GitCompareArrows,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
};

const items: Array<{ label: string; icon: LucideIcon; active?: boolean }> = [
  { label: "Calcular preço", icon: Calculator, active: true },
  { label: "Meus produtos", icon: Package },
  { label: "Simulações", icon: GitCompareArrows },
  { label: "Custos fixos", icon: CircleDollarSign },
  { label: "Relatórios", icon: ChartNoAxesCombined },
  { label: "Aprenda", icon: BookOpen },
];

export function AppSidebar({ collapsed, mobileOpen, onToggleCollapsed, onCloseMobile }: SidebarProps) {
  return (
    <>
      <button
        type="button"
        className={`sidebar-backdrop${mobileOpen ? " visible" : ""}`}
        aria-label="Fechar menu ao clicar fora"
        onClick={onCloseMobile}
      />
      <aside className={`sidebar${collapsed ? " sidebar-collapsed" : ""}${mobileOpen ? " sidebar-mobile-open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand" aria-label="Precifica+"><span>+</span><strong>Precifica</strong></div>
          <button type="button" className="sidebar-toggle" onClick={onToggleCollapsed} aria-label={collapsed ? "Expandir menu" : "Recolher menu"} title={collapsed ? "Expandir menu" : "Recolher menu"}>
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <button type="button" className="sidebar-close-mobile" onClick={onCloseMobile} aria-label="Fechar menu"><X size={19} /></button>
        </div>
        <nav aria-label="Navegação principal">
          {items.map(({ label, icon: Icon, active }) => (
            <button
              type="button"
              key={label}
              className={`nav-item${active ? " nav-active" : ""}`}
              aria-current={active ? "page" : undefined}
              title={collapsed ? label : undefined}
              data-tooltip={label}
              onClick={onCloseMobile}
            >
              <Icon size={18} aria-hidden="true" />
              <span className="nav-label">{label}</span>
              {!active ? <small>Em breve</small> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-note"><strong>Preço certo.</strong><br />Mais lucro para o seu negócio.</div>
      </aside>
    </>
  );
}
