import { useMemo } from "react";
import {
  BarChart,
  Callout,
  Card,
  CardBody,
  CardHeader,
  CollapsibleSection,
  computeDAGLayout,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  PieChart,
  Pill,
  Row,
  Stack,
  Stat,
  Swatch,
  Table,
  Text,
  TodoList,
  useCanvasState,
  useHostTheme,
} from "cursor/canvas";

type Tab = "overview" | "config" | "engineering" | "landing" | "workflow" | "onboarding" | "mobile" | "stack" | "modules" | "catalog" | "web" | "routes" | "tenant" | "roadmap";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Visao Geral" },
  { id: "engineering", label: "Gaps Eng." },
  { id: "config", label: "Config Central" },
  { id: "workflow", label: "Fluxo SDLC" },
  { id: "landing", label: "Landing Page" },
  { id: "onboarding", label: "Onboarding" },
  { id: "mobile", label: "PWA + Native" },
  { id: "catalog", label: "Catalogo" },
  { id: "web", label: "Telas Web" },
  { id: "modules", label: "Modulos" },
  { id: "routes", label: "Rotas API" },
  { id: "stack", label: "Stack" },
  { id: "tenant", label: "Multi-tenant" },
  { id: "roadmap", label: "Roadmap" },
];

const DAG_NODES = [
  { id: "web", label: "Next.js Web + PWA" },
  { id: "gateway", label: "API Gateway" },
  { id: "kernel", label: "Core Kernel" },
  { id: "registry", label: "Plugin Registry" },
  { id: "auth", label: "Auth + RBAC" },
  { id: "events", label: "Event Bus" },
  { id: "db", label: "PostgreSQL" },
  { id: "cache", label: "Redis" },
  { id: "cleaning", label: "Cleaning Plugin" },
  { id: "construction", label: "Construction Plugin" },
  { id: "services", label: "Services Plugin" },
  { id: "billing", label: "Billing Plugin" },
];

const DAG_EDGES = [
  { from: "web", to: "gateway" },
  { from: "gateway", to: "kernel" },
  { from: "kernel", to: "registry" },
  { from: "kernel", to: "auth" },
  { from: "kernel", to: "events" },
  { from: "kernel", to: "db" },
  { from: "kernel", to: "cache" },
  { from: "registry", to: "cleaning" },
  { from: "registry", to: "construction" },
  { from: "registry", to: "services" },
  { from: "registry", to: "billing" },
  { from: "events", to: "cleaning" },
  { from: "events", to: "construction" },
  { from: "events", to: "services" },
];

const MVP_TASKS = [
  { id: "sdlc1", content: "SDLC Fase 1-2 — Discovery + Arquitetura + docs engenharia", status: "completed" as const },
  { id: "sdlc3", content: "SDLC Fase 3 — Design Figma + Design System", status: "pending" as const },
  { id: "eng1", content: "Eng — ADRs + DDD docs (context-map, glossary, events)", status: "completed" as const },
  { id: "eng2", content: "Eng — Threat model + secrets + api-security docs", status: "completed" as const },
  { id: "eng3", content: "Eng — SLO + DR + runbooks + DORA docs", status: "completed" as const },
  { id: "eng4", content: "Eng — CI GitHub Actions + validate scripts", status: "completed" as const },
  { id: "eng5", content: "Eng — Implementar resilience + outbox + idempotency (codigo)", status: "completed" as const },
  { id: "land", content: "Landing/GTM — marketing site parcial; contact API stub; analytics GTM pendente", status: "pending" as const },
  { id: "p0", content: "Dev Fase 0 — Onboarding wizard + industry packs (marketplace stub)", status: "completed" as const },
  { id: "p1", content: "Fase 1 — Core + CRM + Auth + portal web v1 (login, invoices, Stripe pay, docs, profile, bookings, messages, support; admin-saas apps/admin)", status: "completed" as const },
  { id: "p2", content: "Fase 2 — Estimating + Price Book (calculate room tiers ok)", status: "pending" as const },
  { id: "p3", content: "Fase 3 — Scheduling + Dispatch (assign UI + maps ok)", status: "pending" as const },
  { id: "p4", content: "Fase 4 — Expenses + Invoicing (invoice print preview ok; sem server PDF)", status: "pending" as const },
  { id: "p5", content: "Fase 5 — House Cleaning parcial (QC/supplies API; photo upload real)", status: "pending" as const },
  { id: "p6", content: "Fase 6 — Construction parcial (CO ok; daily-log photo upload real)", status: "pending" as const },
  { id: "p7", content: "Fase 7 — PWA campo parcial (offline ok; /m/jobs mine filter; maps navigate)", status: "pending" as const },
  { id: "p8", content: "Fase 8 — Accounting + Payroll parcial (employee↔user link ok)", status: "pending" as const },
];

function TabBar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  const theme = useHostTheme();
  return (
    <Row gap={6} wrap>
      {TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              background: selected ? theme.accent.primary : theme.fill.tertiary,
              color: selected ? theme.text.onAccent : theme.text.secondary,
              border: `1px solid ${selected ? theme.accent.primary : theme.stroke.secondary}`,
              borderRadius: 6,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: selected ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </Row>
  );
}

function ArchitectureDAG() {
  const theme = useHostTheme();
  const layout = useMemo(
    () =>
      computeDAGLayout({
        nodes: DAG_NODES.map((n) => ({ id: n.id })),
        edges: DAG_EDGES,
        direction: "vertical",
        nodeWidth: 168,
        nodeHeight: 36,
        rankGap: 56,
        nodeGap: 20,
        padding: 16,
      }),
    [],
  );

  const nodeMap = Object.fromEntries(DAG_NODES.map((n) => [n.id, n.label]));

  const pluginIds = new Set(["cleaning", "construction", "services", "billing"]);

  return (
    <Stack gap={8}>
      <H3>Arquitetura Plugin-Play</H3>
      <Text tone="tertiary" size="small">
        Fluxo de requisicao: Web → Gateway → Kernel → Plugins registrados via Event Bus
      </Text>
      <div style={{ overflowX: "auto" }}>
        <svg
          width={layout.width}
          height={layout.height}
          style={{ display: "block", minWidth: layout.width }}
        >
          {layout.edges.map((edge) => (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={edge.sourceX}
              y1={edge.sourceY}
              x2={edge.targetX}
              y2={edge.targetY}
              stroke={theme.stroke.secondary}
              strokeWidth={1.5}
              strokeDasharray={edge.isBackEdge ? "4 3" : undefined}
            />
          ))}
          {layout.nodes.map((node) => {
            const isPlugin = pluginIds.has(node.id);
            return (
              <g key={node.id}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={168}
                  height={36}
                  rx={6}
                  fill={isPlugin ? theme.fill.secondary : theme.fill.tertiary}
                  stroke={isPlugin ? theme.accent.primary : theme.stroke.primary}
                  strokeWidth={1}
                />
                <text
                  x={node.x + 84}
                  y={node.y + 22}
                  textAnchor="middle"
                  fill={theme.text.primary}
                  fontSize={11}
                  fontFamily="system-ui, sans-serif"
                >
                  {nodeMap[node.id]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </Stack>
  );
}

function OverviewTab() {
  return (
    <Stack gap={20}>
      <Row gap={12} wrap>
        <Stat label="Nome sugerido" value="FieldForge ERP" tone="info" />
        <Stat label="Mercado" value="EUA" />
        <Stat label="Modelo" value="SaaS Multi-tenant" tone="success" />
        <Stat label="Verticais" value="3 verticais" />
        <Stat label="Modulos totais" value="32" tone="info" />
        <Stat label="Telas web" value="84+" tone="success" />
        <Stat label="SDLC" value="Fase 2" tone="info" />
      </Row>

      <Callout tone="success" title="Gaps P0 documentados — repo /srv/projects/fieldforge">
        24 artefatos criados: DDD, 4 ADRs, security, SRE, compliance, CI.
        Resilience, outbox e idempotency implementados. RLS integration tests no CI (DT-04).
        F5 cleaning e F6 construction entregues (depth parcial: stubs migr. 173–174, 188–189).
        F7 PWA offline queue entregue (depth parcial: /m/expenses, /m/time, sw v3).
        Landing/GTM parcial: blog CMS config, case studies /industries, contact API stub.
      </Callout>

      <Callout tone="warning" title="Gaps de engenharia — 31 itens identificados">
        Analise vs DDD, DDIA, Release It!, Google SRE e Accelerate. 12 gaps P0
        antes de producao. Ver aba Gaps Eng.
      </Callout>

      <Callout tone="success" title="Config central dinamica">
        brand.name, cores, precos e debug em config/app.config.yaml — um arquivo,
        todo o sistema atualiza. Ver aba Config Central e /srv/projects/fieldforge/config/.
      </Callout>

      <Callout tone="success" title="Landing + SDLC profissional">
        Site marketing fieldforge.com (22 paginas estaticas, depth parcial GTM) e fluxo
        SDLC completo de 7 fases — do discovery ao monitoramento. Ver abas Fluxo SDLC e Landing Page.
      </Callout>

      <Callout tone="success" title="Mobile: PWA agora, App Store pronto">
        App de campo em PWA (/m/*) com offline sync. Arquitetura Capacitor
        preparada para Android e iPhone — mesmo codigo, plugins nativos quando
        publicar nas lojas. Veja aba PWA + Native.
      </Callout>

      <Callout tone="success" title="Onboarding inteligente por ramo">
        Wizard de 5 passos no cadastro: cliente escolhe o tipo de servico e o
        sistema libera modulos automaticamente via Industry Packs. Novos modulos
        entram por manifest sem alterar o core — veja aba Onboarding.
      </Callout>

      <Callout tone="warning" title="Gap analysis — modulos que faltavam">
        Versao anterior misturava orcamentos em invoicing e nao tinha modulos
        dedicados para: estimating (calculo de orcamentos), expenses (despesas),
        job-costing, accounting (GL/AP/AR), client-portal, price-book, purchase-orders,
        documents, fleet e communications. Catalogo completo adicionado nas abas
        Catalogo Completo e Telas Web.
      </Callout>

      <Callout tone="info" title="Recomendacao principal">
        Go (backend) + Next.js (frontend) + PostgreSQL com Row-Level Security.
        Go oferece performance nativa, concorrencia excelente para dispatch em
        tempo real, e interfaces Go sao ideais para arquitetura plugin-play.
        Next.js entrega SSR, PWA para tecnicos de campo, e portal do cliente.
      </Callout>

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader>Problema que resolve</CardHeader>
          <CardBody>
            <Stack gap={8}>
              <Text size="small">
                Empresas de limpeza residencial, construcao civil e servicos de
                campo nos EUA usam 5-10 ferramentas desconectadas (QuickBooks,
                Jobber, spreadsheets). FieldForge unifica operacoes, financeiro e
                compliance US em uma plataforma multitenant.
              </Text>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Diferenciais competitivos</CardHeader>
          <CardBody>
            <Stack gap={6}>
              <Row gap={8} align="center">
                <Swatch color="blue" />
                <Text size="small">3 verticais em 1 ERP com modulos ativaveis</Text>
              </Row>
              <Row gap={8} align="center">
                <Swatch color="green" />
                <Text size="small">Plugin-play: clientes pagam so o que usam</Text>
              </Row>
              <Row gap={8} align="center">
                <Swatch color="purple" />
                <Text size="small">Compliance US: sales tax, 1099, lien waivers</Text>
              </Row>
              <Row gap={8} align="center">
                <Swatch color="orange" />
                <Text size="small">White-label por tenant (subdominio proprio)</Text>
              </Row>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <ArchitectureDAG />

      <H3>Nomes alternativos</H3>
      <Row gap={8} wrap>
        <Pill tone="info">FieldForge ERP</Pill>
        <Pill>CleanBuild Pro</Pill>
        <Pill>ServiceStack US</Pill>
        <Pill>TenantWorks</Pill>
        <Pill>BuildClean OS</Pill>
      </Row>
    </Stack>
  );
}

function StackTab() {
  return (
    <Stack gap={20}>
      <Callout tone="success" title="Stack recomendada">
        Backend Go + Fiber/Echo · Frontend Next.js 15 · DB PostgreSQL 16 ·
        Cache Redis · Queue NATS ou Asynq · Auth Clerk ou custom JWT ·
        Payments Stripe · Tax Avalara/TaxJar
      </Callout>

      <H2>Comparativo de linguagens rapidas</H2>
      <Table
        headers={["Criterio", "Go", "Bun + TypeScript", "Rust"]}
        rows={[
          ["Performance runtime", "Excelente", "Muito boa", "Maxima"],
          ["Velocidade de dev", "Alta", "Muito alta", "Media-baixa"],
          ["Plugin architecture", "Interfaces nativas", "Modulos npm", "Traits + dyn"],
          ["Ecossistema ERP/SaaS", "Forte", "Muito forte", "Emergente"],
          ["Contratacao EUA", "Facil", "Muito facil", "Dificil"],
          ["Concorrencia multitenant", "Goroutines", "Async I/O", "Tokio"],
          ["Recomendacao", "PRINCIPAL", "Prototipo rapido", "Modulos criticos"],
        ]}
        rowTone={[undefined, "success", "info", "neutral"]}
        striped
      />

      <H2>Monorepo sugerido</H2>
      <Table
        headers={["Pasta", "Tecnologia", "Responsabilidade"]}
        rows={[
          ["apps/marketing", "Next.js 15 + Tailwind", "Landing — le config central brand/pricing"],
          ["packages/config", "TypeScript + YAML", "Loader: brand, debug, pricing, features"],
          ["apps/web", "Next.js 15 + Tailwind", "App SaaS app.fieldforge.com — admin, portal, PWA /m/*"],
          ["apps/native", "Capacitor 6", "Shell iOS + Android — mesmo bundle /m"],
          ["packages/mobile-core", "TypeScript", "Platform adapters: camera, GPS, push, offline"],
          ["apps/api", "Go + Fiber", "API Gateway, rotas, middleware tenant"],
          ["apps/worker", "Go + Asynq", "Jobs: invoicing, reminders, sync tax"],
          ["packages/core", "Go", "Kernel: auth, tenant ctx, event bus, RBAC"],
          ["packages/plugins/*", "Go", "Modulos: cleaning, construction, etc."],
          ["packages/sdk", "TypeScript", "Client SDK + tipos OpenAPI gerados"],
          ["infra/", "Docker + Terraform", "K8s ou Fly.io, RDS, ElastiCache"],
        ]}
        striped
      />

      <H2>Plugin interface (Go)</H2>
      <Text tone="secondary" size="small">
        Cada modulo implementa uma interface padrao e se registra no boot:
      </Text>
      <Card>
        <CardBody>
          <Text as="span" size="small" style={{ fontFamily: "monospace", whiteSpace: "pre" }}>
{`type Plugin interface {
  Name() string
  Version() string
  RegisterRoutes(r fiber.Router)
  RegisterEvents(bus EventBus)
  Migrations() []Migration
  Permissions() []Permission
  Dependencies() []string
}`}
          </Text>
        </CardBody>
      </Card>
    </Stack>
  );
}

function ModulesTab() {
  const modules = [
    { name: "core", tier: "Obrigatorio", desc: "Auth, tenants, users, RBAC, audit log, settings, notifications", weeks: 4 },
    { name: "crm", tier: "Obrigatorio", desc: "Leads, clientes, propriedades, contratos, pipeline, historico", weeks: 4 },
    { name: "client-portal", tier: "Obrigatorio", desc: "Portal self-service: quotes, invoices, schedule, docs, pagamentos", weeks: 3 },
    { name: "estimating", tier: "Obrigatorio", desc: "Calculo orcamentos, templates, markup, conversao quote→job", weeks: 5 },
    { name: "price-book", tier: "Obrigatorio", desc: "Catalogo precos: labor, materiais, servicos por vertical", weeks: 2 },
    { name: "scheduling", tier: "Obrigatorio", desc: "Calendario, rotas recorrentes, dispatch, GPS, crew assignment", weeks: 4 },
    { name: "job-costing", tier: "Obrigatorio", desc: "Cost codes, budget vs actual, margem por job, alertas overrun", weeks: 4 },
    { name: "expenses", tier: "Obrigatorio", desc: "Despesas, recibos OCR, alocacao job, aprovacao, reembolso", weeks: 3 },
    { name: "invoicing", tier: "Obrigatorio", desc: "Invoices, progress billing, retainage, Stripe, ACH, sales tax", weeks: 4 },
    { name: "accounting", tier: "Plugin", desc: "GL, AP/AR, chart of accounts, WIP, bank recon, QuickBooks sync", weeks: 6 },
    { name: "cleaning", tier: "Plugin", desc: "Checklists, supplies, recurring cleans, phase pricing, ratings", weeks: 5 },
    { name: "construction", tier: "Plugin", desc: "Projetos, fases, CO, subs, permits, lien waivers, RFIs", weeks: 8 },
    { name: "field-services", tier: "Plugin", desc: "Work orders, time tracking, assinatura digital, SLA", weeks: 4 },
    { name: "purchase-orders", tier: "Plugin", desc: "PO, vendor bills, 3-way match, procurement workflow", weeks: 3 },
    { name: "payroll", tier: "Plugin", desc: "1099 contractors, prevailing wage, Gusto/ADP integration", weeks: 4 },
    { name: "inventory", tier: "Plugin", desc: "Materiais, equipamentos, custo por job, reorder alerts", weeks: 3 },
    { name: "fleet", tier: "Plugin", desc: "Veiculos, manutencao, GPS fleet, custo por mile", weeks: 3 },
    { name: "documents", tier: "Plugin", desc: "Contratos, fotos, RFIs, submittals, versionamento", weeks: 3 },
    { name: "communications", tier: "Plugin", desc: "SMS/email templates, automacoes, review requests", weeks: 2 },
    { name: "reporting", tier: "Plugin", desc: "P&L por job, dashboards, BI, export contabil", weeks: 4 },
  ];

  return (
    <Stack gap={20}>
      <Text tone="secondary">
        Sistema modular plugin-play: cada tenant ativa apenas os modulos que precisa.
        Billing por modulo via Stripe entitlements.
      </Text>

      <Table
        headers={["Modulo", "Tipo", "Descricao", "Estimativa"]}
        rows={modules.map((m) => [
          m.name,
          m.tier,
          m.desc,
          `${m.weeks} sem`,
        ])}
        columnAlign={["left", "center", "left", "right"]}
        rowTone={modules.map((m) => (m.tier === "Obrigatorio" ? "info" : "neutral"))}
        striped
      />

      <H2>Eventos entre modulos (Event Bus)</H2>
      <Grid columns={2} gap={12}>
        <CollapsibleSection title="estimating.quote.accepted" defaultOpen leading={<Swatch color="yellow" />}>
          <Text size="small" tone="secondary">
            Dispara: job-costing.create_budget, scheduling.create_job,
            crm.move_lead_to_won, client-portal.notify_client
          </Text>
        </CollapsibleSection>
        <CollapsibleSection title="expense.approved" leading={<Swatch color="pink" />}>
          <Text size="small" tone="secondary">
            Dispara: job-costing.allocate_cost, accounting.post_entry,
            invoicing.update_billable, reporting.log_expense
          </Text>
        </CollapsibleSection>
        <CollapsibleSection title="cleaning.job.completed" leading={<Swatch color="green" />}>
          <Text size="small" tone="secondary">
            Dispara: invoicing.create_from_job, crm.update_last_service,
            reporting.log_metric
          </Text>
        </CollapsibleSection>
        <CollapsibleSection title="construction.change_order.approved" leading={<Swatch color="orange" />}>
          <Text size="small" tone="secondary">
            Dispara: invoicing.create_milestone, scheduling.reschedule_phase,
            crm.notify_client
          </Text>
        </CollapsibleSection>
        <CollapsibleSection title="tenant.subscription.updated" leading={<Swatch color="blue" />}>
          <Text size="small" tone="secondary">
            Dispara: registry.enable_plugins, auth.update_seats,
            reporting.reset_quotas
          </Text>
        </CollapsibleSection>
        <CollapsibleSection title="field.work_order.signed" leading={<Swatch color="purple" />}>
          <Text size="small" tone="secondary">
            Dispara: invoicing.finalize, payroll.log_hours,
            construction.update_progress
          </Text>
        </CollapsibleSection>
      </Grid>
    </Stack>
  );
}

type ModuleStatus = "ok" | "new" | "expand";

const FULL_CATALOG: {
  category: string;
  modules: { name: string; status: ModuleStatus; features: string; weeks: number }[];
}[] = [
  {
    category: "Plataforma e Core",
    modules: [
      { name: "core", status: "expand", features: "Auth SSO, tenants, RBAC, audit, settings, webhooks", weeks: 4 },
      { name: "notifications", status: "new", features: "Push, email, SMS, in-app, preferencias por usuario", weeks: 2 },
      { name: "file-storage", status: "new", features: "S3 uploads, thumbnails, permissoes por tenant", weeks: 2 },
      { name: "integrations-hub", status: "new", features: "QuickBooks, Stripe, Avalara, Gusto, Google Maps", weeks: 3 },
      { name: "marketing", status: "new", features: "Landing fieldforge.com, pricing, LPs verticais, SEO, blog", weeks: 3 },
      { name: "onboarding", status: "new", features: "Wizard 5 passos, industry packs, auto-provision, marketplace", weeks: 4 },
      { name: "mobile-core", status: "new", features: "PWA + Capacitor adapters, offline sync, platform API", weeks: 5 },
    ],
  },
  {
    category: "CRM e Clientes",
    modules: [
      { name: "crm", status: "expand", features: "Leads, clientes, propriedades, contratos, tags, notas", weeks: 4 },
      { name: "client-portal", status: "new", features: "Login cliente, ver quotes/invoices, agendar, pagar online", weeks: 3 },
      { name: "communications", status: "new", features: "SMS Twilio, email templates, automacoes, review Google", weeks: 2 },
      { name: "marketing", status: "new", features: "Referral tracking, landing pages, campanhas, NPS", weeks: 2 },
    ],
  },
  {
    category: "Orcamentos e Precificacao",
    modules: [
      { name: "estimating", status: "new", features: "Builder line-items, markup/margin, templates, envio digital", weeks: 5 },
      { name: "price-book", status: "new", features: "Catalogo labor/material/servico, rates por regiao US", weeks: 2 },
      { name: "takeoff", status: "new", features: "Medicao sqft, fases cleaning, import CSV/planos", weeks: 3 },
      { name: "proposals", status: "new", features: "Proposta PDF branded, e-signature, deposito online", weeks: 2 },
    ],
  },
  {
    category: "Financeiro e Despesas",
    modules: [
      { name: "job-costing", status: "new", features: "Cost codes, budget vs actual, WIP, forecast overrun", weeks: 4 },
      { name: "expenses", status: "new", features: "Receipt scan OCR, categorias, aprovacao, reembolso, mileage", weeks: 3 },
      { name: "invoicing", status: "expand", features: "Progress billing, retainage, deposits, payment plans", weeks: 4 },
      { name: "accounting", status: "new", features: "GL, AP/AR, chart accounts, bank recon, 1099 prep", weeks: 6 },
      { name: "purchase-orders", status: "new", features: "PO, vendor management, 3-way match, budget commit", weeks: 3 },
    ],
  },
  {
    category: "Operacoes e Campo",
    modules: [
      { name: "scheduling", status: "expand", features: "Calendario, recurring, route optimize, crew skills", weeks: 4 },
      { name: "dispatch", status: "new", features: "Board tempo real, assign tech, ETA cliente, reroute", weeks: 3 },
      { name: "field-services", status: "expand", features: "Work orders, clock in/out, forms, assinatura, offline", weeks: 4 },
      { name: "fleet", status: "new", features: "Veiculos, manutencao, fuel log, GPS fleet tracking", weeks: 3 },
      { name: "inventory", status: "expand", features: "Stock por warehouse/truck, reorder, custo por job", weeks: 3 },
    ],
  },
  {
    category: "Verticais (Plugins)",
    modules: [
      { name: "cleaning", status: "expand", features: "Phase pricing, checklists, supplies, recurring, QC photos", weeks: 5 },
      { name: "construction", status: "expand", features: "Projetos, CO, subs, permits, lien waivers, daily logs", weeks: 8 },
      { name: "maintenance-contracts", status: "new", features: "Contratos recorrentes, SLA, preventive maintenance", weeks: 3 },
    ],
  },
  {
    category: "Compliance e RH",
    modules: [
      { name: "payroll", status: "expand", features: "W2/1099, prevailing wage, certified payroll, Gusto sync", weeks: 4 },
      { name: "compliance", status: "new", features: "OSHA incidents, safety checklists, insurance certs", weeks: 3 },
      { name: "documents", status: "new", features: "RFIs, submittals, contracts, versionamento, e-sign", weeks: 3 },
    ],
  },
  {
    category: "Analytics e Admin",
    modules: [
      { name: "reporting", status: "expand", features: "P&L job, cash flow, KPIs, custom reports, exports", weeks: 4 },
      { name: "dashboards", status: "new", features: "Widgets por role: owner, dispatcher, accountant, client", weeks: 2 },
      { name: "admin-saas", status: "new", features: "Super-admin: tenants, billing, plugins, usage metrics", weeks: 3 },
    ],
  },
];

function CatalogTab() {
  const statusLabel: Record<ModuleStatus, string> = {
    ok: "OK",
    new: "NOVO",
    expand: "EXPANDIR",
  };
  const statusTone: Record<ModuleStatus, "success" | "warning" | "info"> = {
    ok: "success",
    new: "warning",
    expand: "info",
  };

  const allModules = FULL_CATALOG.flatMap((c) => c.modules);
  const newCount = allModules.filter((m) => m.status === "new").length;
  const expandCount = allModules.filter((m) => m.status === "expand").length;

  return (
    <Stack gap={20}>
      <Callout tone="warning" title="Analise de gaps — o que faltava">
        Orcamentos estavam apenas como sub-rota de billing. Faltavam modulos
        dedicados de estimating, price-book, job-costing, expenses, accounting,
        client-portal, purchase-orders, dispatch, fleet, documents, communications
        e compliance. Referencia: Jobber, Knowify, Procore, QuoteIQ, Penta ERP.
      </Callout>

      <Row gap={12} wrap>
        <Stat label="Modulos no catalogo" value={String(allModules.length)} />
        <Stat label="Novos" value={String(newCount)} tone="warning" />
        <Stat label="Expandir" value={String(expandCount)} tone="info" />
        <Stat label="Semanas totais est." value="~95" tone="success" />
      </Row>

      <Grid columns={2} gap={16}>
        <Stack gap={4}>
          <H3>Distribuicao por status</H3>
          <PieChart
            data={[
              { label: "Novos", value: newCount, tone: "warning" },
              { label: "Expandir", value: expandCount, tone: "info" },
            ]}
            donut
          />
          <Text tone="tertiary" size="small">
            Fonte: gap analysis vs Jobber, Procore, QuoteIQ, Penta · jun 2025
          </Text>
        </Stack>
        <Stack gap={4}>
          <H3>Modulos criticos para MVP</H3>
          <Table
            headers={["Modulo", "Por que e critico"]}
            rows={[
              ["estimating", "Calculo orcamentos e conversao quote→job"],
              ["expenses", "Controle despesas alocadas por job"],
              ["job-costing", "Margem real budget vs actual"],
              ["client-portal", "Cliente ve quotes, paga, agenda online"],
              ["price-book", "Base de precos para estimativas rapidas"],
              ["crm", "Gestao completa de clientes e propriedades"],
            ]}
            striped
          />
        </Stack>
      </Grid>

      {FULL_CATALOG.map((cat) => (
        <CollapsibleSection
          title={cat.category}
          count={cat.modules.length}
          defaultOpen={cat.category.includes("Orcamentos") || cat.category.includes("Financeiro")}
        >
          <Table
            headers={["Modulo", "Status", "Funcionalidades", "Semanas"]}
            rows={cat.modules.map((m) => [
              m.name,
              statusLabel[m.status],
              m.features,
              `${m.weeks}`,
            ])}
            rowTone={cat.modules.map((m) => statusTone[m.status])}
            columnAlign={["left", "center", "left", "right"]}
            striped
          />
        </CollapsibleSection>
      ))}
    </Stack>
  );
}

const WEB_SCREENS: {
  area: string;
  persona: string;
  routes: { path: string; screen: string; module: string }[];
}[] = [
  {
    area: "Landing Page — Marketing",
    persona: "Visitante / Lead",
    routes: [
      { path: "/", screen: "Home: hero, verticais, features, pricing, FAQ", module: "marketing" },
      { path: "/features", screen: "Grid de funcionalidades por modulo", module: "marketing" },
      { path: "/pricing", screen: "Planos Starter/Business/Enterprise + add-ons", module: "marketing" },
      { path: "/industries", screen: "Hub: cleaning, construction, field services", module: "marketing" },
      { path: "/industries/cleaning", screen: "LP vertical house cleaning", module: "marketing" },
      { path: "/industries/construction", screen: "LP vertical construcao civil", module: "marketing" },
      { path: "/industries/field-services", screen: "LP vertical servicos de campo", module: "marketing" },
      { path: "/about", screen: "Sobre a empresa e missao", module: "marketing" },
      { path: "/blog", screen: "Blog SEO — dicas para contractors US", module: "marketing" },
      { path: "/contact", screen: "Formulario contato + demo request", module: "marketing" },
      { path: "/login", screen: "Redirect para app.fieldforge.com/login", module: "marketing" },
      { path: "/privacy", screen: "Privacy Policy (CCPA)", module: "marketing" },
      { path: "/terms", screen: "Terms of Service", module: "marketing" },
    ],
  },
  {
    area: "Onboarding e Signup",
    persona: "Novo tenant",
    routes: [
      { path: "/signup", screen: "Cadastro publico — inicio wizard", module: "onboarding" },
      { path: "/onboarding", screen: "Wizard 5 passos com stepper", module: "onboarding" },
      { path: "/onboarding/industry", screen: "Escolha ramo — 6 industry packs", module: "onboarding" },
      { path: "/onboarding/profile", screen: "Perfil empresa: estado, equipe, logo", module: "onboarding" },
      { path: "/onboarding/modules", screen: "Revisar modulos pre-selecionados", module: "onboarding" },
      { path: "/onboarding/setup", screen: "Setup rapido: Stripe, CSV, convites", module: "onboarding" },
      { path: "/onboarding/complete", screen: "Conclusao + tour guiado", module: "onboarding" },
      { path: "/marketplace", screen: "Browse plugins futuros", module: "onboarding" },
    ],
  },
  {
    area: "Dashboard e Home",
    persona: "Todos",
    routes: [
      { path: "/dashboard", screen: "Dashboard principal (KPIs por role)", module: "dashboards" },
      { path: "/dashboard/owner", screen: "Visao executiva: revenue, margem, jobs ativos", module: "reporting" },
      { path: "/dashboard/dispatcher", screen: "Jobs hoje, atrasados, crew availability", module: "dispatch" },
      { path: "/dashboard/accountant", screen: "AR aging, despesas pendentes, WIP", module: "accounting" },
      { path: "/notifications", screen: "Central de notificacoes", module: "notifications" },
    ],
  },
  {
    area: "Clientes e CRM",
    persona: "Admin, Sales",
    routes: [
      { path: "/clients", screen: "Lista clientes com busca e filtros", module: "crm" },
      { path: "/clients/new", screen: "Cadastro cliente + propriedades", module: "crm" },
      { path: "/clients/:id", screen: "Perfil cliente: dados, historico, docs", module: "crm" },
      { path: "/clients/:id/properties", screen: "Enderecos e detalhes propriedade", module: "crm" },
      { path: "/clients/:id/jobs", screen: "Historico de servicos do cliente", module: "crm" },
      { path: "/clients/:id/invoices", screen: "Faturas e pagamentos do cliente", module: "invoicing" },
      { path: "/leads", screen: "Pipeline kanban de leads", module: "crm" },
      { path: "/leads/:id", screen: "Detalhe lead + atividades", module: "crm" },
      { path: "/contracts", screen: "Contratos e service agreements", module: "crm" },
    ],
  },
  {
    area: "Orcamentos e Propostas",
    persona: "Sales, Estimator",
    routes: [
      { path: "/estimates", screen: "Lista orcamentos (draft, sent, accepted)", module: "estimating" },
      { path: "/estimates/new", screen: "Novo orcamento — selecionar cliente", module: "estimating" },
      { path: "/estimates/:id", screen: "Builder: line-items, markup, preview", module: "estimating" },
      { path: "/estimates/:id/calculate", screen: "Calculadora: labor+material+margin", module: "estimating" },
      { path: "/estimates/:id/send", screen: "Enviar proposta por email/SMS", module: "proposals" },
      { path: "/price-book", screen: "Catalogo de precos editavel", module: "price-book" },
      { path: "/price-book/import", screen: "Import CSV de rates", module: "price-book" },
      { path: "/takeoff", screen: "Medicao sqft / fases cleaning", module: "takeoff" },
      { path: "/proposals/:id/sign", screen: "Pagina publica e-signature", module: "proposals" },
    ],
  },
  {
    area: "Despesas e Financeiro",
    persona: "Accountant, Field",
    routes: [
      { path: "/expenses", screen: "Lista despesas com status aprovacao", module: "expenses" },
      { path: "/expenses/new", screen: "Nova despesa + foto recibo OCR", module: "expenses" },
      { path: "/expenses/approve", screen: "Fila aprovacao despesas", module: "expenses" },
      { path: "/job-costing", screen: "Overview custos por job", module: "job-costing" },
      { path: "/job-costing/:jobId", screen: "Budget vs actual detalhado", module: "job-costing" },
      { path: "/invoices", screen: "Lista faturas", module: "invoicing" },
      { path: "/invoices/new", screen: "Criar invoice de job/quote", module: "invoicing" },
      { path: "/invoices/:id", screen: "Detalhe + enviar + cobrar", module: "invoicing" },
      { path: "/payments", screen: "Pagamentos recebidos e pendentes", module: "invoicing" },
      { path: "/accounting/chart", screen: "Chart of accounts", module: "accounting" },
      { path: "/accounting/ap", screen: "Accounts payable / vendor bills", module: "accounting" },
      { path: "/accounting/ar", screen: "Accounts receivable aging", module: "accounting" },
      { path: "/purchase-orders", screen: "POs e vendor management", module: "purchase-orders" },
      { path: "/reports", screen: "Relatorios P&L, cash flow, WIP", module: "reporting" },
    ],
  },
  {
    area: "Payroll e RH",
    persona: "Accountant, Owner",
    routes: [
      { path: "/payroll", screen: "Employees W-2 e 1099 contractors", module: "payroll" },
      { path: "/payroll/runs", screen: "Payroll runs — criar draft e submeter", module: "payroll" },
      { path: "/payroll/tax", screen: "W-4 form: filing status e allowances", module: "payroll" },
      { path: "/timesheets", screen: "Timesheets — submit e approve workflow", module: "payroll" },
    ],
  },
  {
    area: "Agenda e Dispatch",
    persona: "Dispatcher",
    routes: [
      { path: "/schedule", screen: "Calendario semanal/mensal", module: "scheduling" },
      { path: "/schedule/map", screen: "Mapa jobs + crews GPS", module: "scheduling" },
      { path: "/dispatch", screen: "Board dispatch tempo real", module: "dispatch" },
      { path: "/crews", screen: "Gestao crews e skills", module: "scheduling" },
      { path: "/routes", screen: "Rotas otimizadas do dia", module: "scheduling" },
      { path: "/recurring", screen: "Servicos recorrentes", module: "scheduling" },
    ],
  },
  {
    area: "Operacoes — Cleaning",
    persona: "Dispatcher, Crew",
    routes: [
      { path: "/cleaning/jobs", screen: "Jobs cleaning do dia", module: "cleaning" },
      { path: "/cleaning/jobs/:id", screen: "Detalhe job + checklist + fotos", module: "cleaning" },
      { path: "/cleaning/phases", screen: "Templates fase: rough/final/premium", module: "cleaning" },
      { path: "/cleaning/supplies", screen: "Supplies por job/crew", module: "cleaning" },
      { path: "/cleaning/qc", screen: "Quality control review", module: "cleaning" },
    ],
  },
  {
    area: "Operacoes — Construction",
    persona: "PM, Sub",
    routes: [
      { path: "/projects", screen: "Lista projetos ativos", module: "construction" },
      { path: "/projects/:id", screen: "Overview projeto + budget", module: "construction" },
      { path: "/projects/:id/phases", screen: "Fases e milestones", module: "construction" },
      { path: "/projects/:id/change-orders", screen: "Change orders", module: "construction" },
      { path: "/projects/:id/daily-logs", screen: "Daily logs de campo", module: "construction" },
      { path: "/subcontractors", screen: "Rede de subcontractors", module: "construction" },
      { path: "/permits", screen: "Permits por projeto", module: "construction" },
      { path: "/lien-waivers", screen: "Gerar e coletar lien waivers", module: "construction" },
      { path: "/rfis", screen: "RFIs e submittals", module: "documents" },
    ],
  },
  {
    area: "Campo — PWA + App iOS/Android",
    persona: "Field Tech",
    routes: [
      { path: "/m", screen: "Home campo: jobs hoje, status sync", module: "mobile-core" },
      { path: "/m/sync", screen: "Fila offline + forcar sincronizacao", module: "mobile-core" },
      { path: "/m/profile", screen: "Perfil tech, biometria, push prefs", module: "mobile-core" },
      { path: "/m/jobs", screen: "Meus jobs do dia (offline cache)", module: "field-services" },
      { path: "/m/jobs/:id", screen: "Executar job: clock, checklist, fotos", module: "field-services" },
      { path: "/m/expenses", screen: "Registrar despesa com foto", module: "expenses" },
      { path: "/m/time", screen: "Clock in/out", module: "field-services" },
      { path: "/m/signature", screen: "Coletar assinatura cliente", module: "field-services" },
      { path: "/m/vehicle", screen: "Log veiculo e mileage", module: "fleet" },
    ],
  },
  {
    area: "Portal do Cliente",
    persona: "Client",
    routes: [
      { path: "/portal", screen: "Home portal: proximos servicos", module: "client-portal" },
      { path: "/portal/quotes", screen: "Ver e aprovar orcamentos", module: "client-portal" },
      { path: "/portal/quotes/:id", screen: "Detalhe quote + aceitar + deposito", module: "client-portal" },
      { path: "/portal/invoices", screen: "Faturas e pagar online", module: "client-portal" },
      { path: "/portal/schedule", screen: "Agendar servico (self-booking)", module: "client-portal" },
      { path: "/portal/history", screen: "Historico de servicos", module: "client-portal" },
      { path: "/portal/documents", screen: "Contratos e documentos", module: "client-portal" },
      { path: "/portal/messages", screen: "Mensagens com a empresa", module: "communications" },
    ],
  },
  {
    area: "Configuracoes e Admin",
    persona: "Owner, Super-admin",
    routes: [
      { path: "/settings", screen: "Configuracoes empresa", module: "core" },
      { path: "/settings/users", screen: "Usuarios e roles", module: "core" },
      { path: "/settings/plugins", screen: "Ativar/desativar modulos", module: "core" },
      { path: "/settings/modules", screen: "Gerenciar modulos pos-onboarding", module: "onboarding" },
      { path: "/settings/billing", screen: "Plano SaaS e faturamento", module: "core" },
      { path: "/settings/integrations", screen: "QuickBooks, Stripe, Twilio", module: "integrations-hub" },
      { path: "/settings/templates", screen: "Email/SMS/quote templates", module: "communications" },
      { path: "/admin/tenants", screen: "Super-admin: gestao tenants", module: "admin-saas" },
    ],
  },
];

function WebTab() {
  const totalScreens = WEB_SCREENS.reduce((acc, s) => acc + s.routes.length, 0);

  return (
    <Stack gap={20}>
      <Callout tone="info" title="Mapa completo de telas web">
        {totalScreens} rotas de frontend organizadas por area e persona.
        Next.js App Router com layouts por role (admin, field, client, super-admin).
      </Callout>

      <Row gap={12} wrap>
        <Stat label="Telas totais" value={String(totalScreens)} tone="info" />
        <Stat label="Areas funcionais" value={String(WEB_SCREENS.length)} />
        <Stat label="Portal cliente" value="8 telas" tone="success" />
        <Stat label="PWA campo" value="6 telas" />
      </Row>

      <H2>Telas por persona</H2>
      <Table
        headers={["Persona", "Telas principais", "Acesso"]}
        rows={[
          ["Owner / Admin", "Dashboard, reports, settings, plugins, users", "Full"],
          ["Sales / Estimator", "Leads, estimates, price-book, proposals", "CRM + Estimating"],
          ["Dispatcher", "Schedule, dispatch board, crews, routes", "Ops"],
          ["Field Tech", "PWA mobile: jobs, time, expenses, signature", "Assigned only"],
          ["Accountant", "Invoices, expenses, AP/AR, job costing, GL", "Finance"],
          ["Client", "Portal: quotes, pay, schedule, history", "Own data only"],
          ["Sub-contractor", "Assigned work orders, lien waivers", "Limited"],
          ["Super-admin", "Tenant management, SaaS billing", "Platform"],
        ]}
        striped
      />

      {WEB_SCREENS.map((section) => (
        <CollapsibleSection
          title={section.area}
          count={section.routes.length}
          trailing={<Text size="small" tone="tertiary">{section.persona}</Text>}
          defaultOpen={section.area.includes("Orcamentos") || section.area.includes("Despesas")}
        >
          <Table
            headers={["Rota", "Tela", "Modulo"]}
            rows={section.routes.map((r) => [r.path, r.screen, r.module])}
            striped
          />
        </CollapsibleSection>
      ))}
    </Stack>
  );
}

function RoutesTab() {
  return (
    <Stack gap={16}>
      <Text tone="secondary">
        Padrao REST versionado. Tenant resolvido via subdomain (acme.fieldforge.com)
        ou header X-Tenant-ID. Todas as rotas passam por middleware de auth + RBAC.
      </Text>

      <CollapsibleSection title="Onboarding — /api/v1/onboarding" count={10} defaultOpen leading={<Swatch color="green" />}>
        <Table
          headers={["Metodo", "Rota", "Descricao"]}
          rows={[
            ["POST", "/auth/signup", "Criar conta + tenant + inicia wizard"],
            ["GET", "/onboarding/status", "Passo atual do wizard"],
            ["GET", "/industry-packs", "Lista packs com preview de modulos"],
            ["POST", "/onboarding/industry", "Salvar ramo(s) selecionado(s)"],
            ["POST", "/onboarding/profile", "Perfil empresa: estado, equipe"],
            ["GET", "/onboarding/modules/preview", "Modulos que serao provisionados"],
            ["PATCH", "/onboarding/modules", "Ajustar modulos antes de confirmar"],
            ["POST", "/onboarding/complete", "Provisionar plugins + seed + finalizar"],
            ["POST", "/onboarding/skip-setup", "Pular setup rapido"],
            ["GET", "/plugins/available", "Marketplace de plugins disponiveis"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="Core — /api/v1" count={8} leading={<Swatch color="blue" />}>
        <Table
          headers={["Metodo", "Rota", "Descricao"]}
          rows={[
            ["POST", "/auth/login", "Login email/password ou SSO"],
            ["GET", "/tenants/current", "Dados do tenant ativo"],
            ["GET", "/users", "Listar usuarios do tenant"],
            ["POST", "/users", "Convidar usuario com role"],
            ["GET", "/plugins", "Modulos ativos do tenant"],
            ["POST", "/plugins/{id}/enable", "Ativar modulo (billing check)"],
            ["GET", "/audit-log", "Log de auditoria"],
            ["GET", "/health", "Health check publico"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="CRM — /api/v1/crm" count={10} leading={<Swatch color="green" />}>
        <Table
          headers={["Metodo", "Rota", "Descricao"]}
          rows={[
            ["GET", "/clients", "Listar clientes com paginacao e busca"],
            ["POST", "/clients", "Criar cliente + propriedades + contatos"],
            ["GET", "/clients/{id}", "Perfil completo do cliente"],
            ["PATCH", "/clients/{id}", "Atualizar dados do cliente"],
            ["GET", "/clients/{id}/properties", "Enderecos e propriedades"],
            ["GET", "/clients/{id}/history", "Historico servicos e interacoes"],
            ["GET", "/leads", "Pipeline de vendas kanban"],
            ["PATCH", "/leads/{id}/stage", "Mover lead no funil"],
            ["GET", "/contracts", "Contratos e service agreements"],
            ["POST", "/contracts", "Criar contrato recorrente"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="Estimating — /api/v1/estimates" count={9} defaultOpen leading={<Swatch color="yellow" />}>
        <Table
          headers={["Metodo", "Rota", "Descricao"]}
          rows={[
            ["GET", "/estimates", "Listar orcamentos por status"],
            ["POST", "/estimates", "Criar orcamento para cliente"],
            ["GET", "/estimates/{id}", "Detalhe com line-items"],
            ["PUT", "/estimates/{id}/lines", "Editar itens labor/material"],
            ["POST", "/estimates/{id}/calculate", "Recalcular markup e margin"],
            ["POST", "/estimates/{id}/send", "Enviar proposta ao cliente"],
            ["POST", "/estimates/{id}/accept", "Cliente aceita (portal)"],
            ["POST", "/estimates/{id}/convert", "Converter quote aprovado em job"],
            ["GET", "/templates", "Templates de orcamento por vertical"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="Price Book — /api/v1/price-book" count={5} leading={<Swatch color="gray" />}>
        <Table
          headers={["Metodo", "Rota", "Descricao"]}
          rows={[
            ["GET", "/items", "Catalogo labor, material, servicos"],
            ["POST", "/items", "Adicionar item ao catalogo"],
            ["PATCH", "/items/{id}", "Atualizar preco/rate"],
            ["POST", "/import", "Import CSV de rates"],
            ["GET", "/regions", "Rates por regiao US (zip/state)"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="Expenses — /api/v1/expenses" count={8} defaultOpen leading={<Swatch color="pink" />}>
        <Table
          headers={["Metodo", "Rota", "Descricao"]}
          rows={[
            ["GET", "/expenses", "Listar despesas com filtros"],
            ["POST", "/expenses", "Nova despesa + upload recibo"],
            ["POST", "/expenses/scan", "OCR recibo (foto → dados)"],
            ["PATCH", "/expenses/{id}", "Editar despesa"],
            ["POST", "/expenses/{id}/submit", "Submeter para aprovacao"],
            ["POST", "/expenses/{id}/approve", "Aprovar despesa"],
            ["POST", "/expenses/{id}/reject", "Rejeitar com motivo"],
            ["POST", "/expenses/{id}/allocate", "Alocar custo a job/cost code"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="Job Costing — /api/v1/job-costing" count={6} leading={<Swatch color="orange" />}>
        <Table
          headers={["Metodo", "Rota", "Descricao"]}
          rows={[
            ["GET", "/jobs/{id}/budget", "Budget do job"],
            ["POST", "/jobs/{id}/budget", "Criar budget de estimate"],
            ["GET", "/jobs/{id}/actuals", "Custos reais acumulados"],
            ["GET", "/jobs/{id}/variance", "Budget vs actual por cost code"],
            ["GET", "/jobs/{id}/forecast", "Projecao de overrun"],
            ["GET", "/cost-codes", "Lista cost codes do tenant"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="Client Portal — /api/v1/portal" count={7} leading={<Swatch color="purple" />}>
        <Table
          headers={["Metodo", "Rota", "Descricao"]}
          rows={[
            ["POST", "/auth/login", "Login cliente (magic link)"],
            ["GET", "/quotes", "Orcamentos pendentes do cliente"],
            ["POST", "/quotes/{id}/accept", "Aceitar orcamento + deposito"],
            ["GET", "/invoices", "Faturas do cliente"],
            ["POST", "/invoices/{id}/pay", "Pagar online Stripe"],
            ["GET", "/schedule", "Proximos servicos agendados"],
            ["POST", "/book", "Self-booking de servico"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="Cleaning — /api/v1/cleaning" count={7} leading={<Swatch color="cyan" />}>
        <Table
          headers={["Metodo", "Rota", "Descricao"]}
          rows={[
            ["GET", "/jobs", "Jobs agendados (filtro data/crew)"],
            ["POST", "/jobs", "Criar job avulso ou recorrente"],
            ["PATCH", "/jobs/{id}/status", "Iniciar, pausar, completar"],
            ["GET", "/routes", "Rotas otimizadas por crew/dia"],
            ["POST", "/routes/optimize", "Otimizar rota (Google OR-Tools)"],
            ["GET", "/checklists/{jobId}", "Checklist do servico"],
            ["POST", "/checklists/{jobId}/complete", "Completar com fotos"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="Construction — /api/v1/construction" count={8} leading={<Swatch color="orange" />}>
        <Table
          headers={["Metodo", "Rota", "Descricao"]}
          rows={[
            ["GET", "/projects", "Listar projetos ativos"],
            ["POST", "/projects", "Novo projeto com budget"],
            ["GET", "/projects/{id}/phases", "Fases e milestones"],
            ["POST", "/projects/{id}/change-orders", "Change order"],
            ["GET", "/subcontractors", "Rede de subs"],
            ["POST", "/lien-waivers", "Gerar lien waiver (estado-especifico)"],
            ["GET", "/permits", "Permits por projeto"],
            ["GET", "/projects/{id}/budget-vs-actual", "Budget tracking"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="Field Services — /api/v1/services" count={5} leading={<Swatch color="purple" />}>
        <Table
          headers={["Metodo", "Rota", "Descricao"]}
          rows={[
            ["GET", "/work-orders", "Ordens de servico"],
            ["POST", "/work-orders", "Criar OS com prioridade"],
            ["POST", "/work-orders/{id}/dispatch", "Despachar tecnico"],
            ["POST", "/time-entries", "Registrar horas (clock in/out)"],
            ["POST", "/signatures", "Assinatura digital do cliente"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="Billing — /api/v1/billing" count={8} leading={<Swatch color="pink" />}>
        <Table
          headers={["Metodo", "Rota", "Descricao"]}
          rows={[
            ["GET", "/invoices", "Listar faturas"],
            ["POST", "/invoices", "Gerar invoice de job/milestone"],
            ["POST", "/invoices/{id}/send", "Enviar fatura ao cliente"],
            ["POST", "/invoices/{id}/pay", "Processar pagamento Stripe"],
            ["POST", "/invoices/progress", "Progress billing (% complete)"],
            ["GET", "/payments", "Historico pagamentos"],
            ["GET", "/tax/calculate", "Calcular sales tax (Avalara)"],
            ["GET", "/ar-aging", "Accounts receivable aging"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="Accounting — /api/v1/accounting" count={6} leading={<Swatch color="blue" />}>
        <Table
          headers={["Metodo", "Rota", "Descricao"]}
          rows={[
            ["GET", "/chart-of-accounts", "Plano de contas"],
            ["GET", "/journal-entries", "Lancamentos contabeis"],
            ["GET", "/ap/bills", "Vendor bills (accounts payable)"],
            ["GET", "/ar/aging", "AR aging report"],
            ["POST", "/sync/quickbooks", "Sync bidirecional QuickBooks"],
            ["GET", "/wip", "Work-in-progress report"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="Payroll — /api/v1/payroll" count={10} leading={<Swatch color="green" />}>
        <Table
          headers={["Metodo", "Rota", "Descricao"]}
          rows={[
            ["GET", "/employees", "Listar employees W-2 e 1099"],
            ["GET", "/timesheets", "Listar timesheets"],
            ["POST", "/timesheets", "Criar timesheet (clock in/out)"],
            ["POST", "/timesheets/:id/submit", "Submeter timesheet para aprovacao"],
            ["POST", "/timesheets/:id/approve", "Aprovar timesheet (admin)"],
            ["GET", "/runs", "Listar payroll runs por periodo"],
            ["POST", "/runs", "Criar payroll run (draft)"],
            ["POST", "/runs/:id/submit", "Submeter run — calcula gross de timesheets aprovados"],
            ["GET", "/tax-profiles", "Listar Tax Profile (W-4 filing status + allowances)"],
            ["POST", "/tax-profiles", "Criar/atualizar W-4 por employee"],
          ]}
          striped
        />
      </CollapsibleSection>
    </Stack>
  );
}

function TenantTab() {
  return (
    <Stack gap={20}>
      <Grid columns={3} gap={12}>
        <Card>
          <CardHeader>Starter</CardHeader>
          <CardBody>
            <Stack gap={6}>
              <Text weight="semibold">Shared DB + RLS</Text>
              <Text size="small" tone="secondary">
                tenant_id em todas as tabelas. PostgreSQL Row-Level Security.
                Custo baixo, escala ate ~500 tenants.
              </Text>
              <Pill tone="success" size="sm">Recomendado MVP</Pill>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Business</CardHeader>
          <CardBody>
            <Stack gap={6}>
              <Text weight="semibold">Schema por tenant</Text>
              <Text size="small" tone="secondary">
                schema tenant_xxx isolado. Melhor para compliance e backups
                individuais. Migracao automatica por plugin.
              </Text>
              <Pill tone="info" size="sm">Escala media</Pill>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Enterprise</CardHeader>
          <CardBody>
            <Stack gap={6}>
              <Text weight="semibold">DB dedicado</Text>
              <Text size="small" tone="secondary">
                Instancia PostgreSQL separada. White-label completo, SLA
                customizado, data residency.
              </Text>
              <Pill size="sm">Grandes GCs</Pill>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <H2>RBAC — Roles padrao</H2>
      <Table
        headers={["Role", "Escopo", "Permissoes chave"]}
        rows={[
          ["owner", "Tenant", "Tudo + billing + plugins"],
          ["admin", "Tenant", "Users, settings, todos modulos"],
          ["dispatcher", "Operacoes", "Scheduling, dispatch, crews"],
          ["field-tech", "Campo", "Jobs assigned, time, checklists"],
          ["accountant", "Financeiro", "Invoices, reports, tax"],
          ["client", "Portal", "Quotes, invoices, schedule view"],
          ["sub-contractor", "Limitado", "Assigned work orders only"],
        ]}
        striped
      />

      <H2>Compliance EUA</H2>
      <Table
        headers={["Requisito", "Solucao", "Modulo"]}
        rows={[
          ["Sales Tax por estado", "Avalara / TaxJar API", "billing"],
          ["1099 Contractors", "Gusto API ou built-in", "payroll"],
          ["Lien Waivers", "Templates por estado (CA, TX, FL...)", "construction"],
          ["OSHA logs", "Incident tracking + export", "field-services"],
          ["CCPA/GDPR-lite", "Data export + delete tenant", "core"],
          ["SOC 2 (futuro)", "Audit log + encryption at rest", "core"],
        ]}
        striped
      />

      <Callout tone="warning" title="Resolucao de tenant">
        Subdomain: {"{slug}"}.fieldforge.com resolve tenant no middleware.
        Custom domain (CNAME) para white-label enterprise. JWT contem tenant_id
        + roles; nunca confiar apenas no header sem validacao.
      </Callout>
    </Stack>
  );
}

function OnboardingTab() {
  const onboardingDag = useMemo(
    () =>
      computeDAGLayout({
        nodes: [
          { id: "signup" },
          { id: "industry" },
          { id: "profile" },
          { id: "modules" },
          { id: "setup" },
          { id: "provision" },
          { id: "dashboard" },
        ],
        edges: [
          { from: "signup", to: "industry" },
          { from: "industry", to: "profile" },
          { from: "profile", to: "modules" },
          { from: "modules", to: "setup" },
          { from: "setup", to: "provision" },
          { from: "provision", to: "dashboard" },
        ],
        direction: "horizontal",
        nodeWidth: 120,
        nodeHeight: 32,
        rankGap: 40,
        nodeGap: 12,
        padding: 12,
      }),
    [],
  );

  const theme = useHostTheme();
  const stepLabels: Record<string, string> = {
    signup: "1. Conta",
    industry: "2. Ramo",
    profile: "3. Empresa",
    modules: "4. Modulos",
    setup: "5. Setup",
    provision: "Provision",
    dashboard: "Pronto!",
  };

  const industryPacks = [
    {
      id: "house-cleaning",
      name: "House Cleaning",
      desc: "Limpeza residencial e comercial recorrente",
      core: "crm, estimating, scheduling, invoicing, client-portal",
      plugins: "cleaning, communications",
      optional: "fleet, marketing",
      templates: "Price book residential, checklist padrao",
    },
    {
      id: "post-construction-clean",
      name: "Post-Construction Cleaning",
      desc: "Limpeza pos-obra por fases (rough/final/premium)",
      core: "crm, estimating, scheduling, job-costing, invoicing",
      plugins: "cleaning, construction-lite, documents",
      optional: "fleet, purchase-orders",
      templates: "Phase pricing, GC pipeline, lien docs",
    },
    {
      id: "general-contractor",
      name: "General Contractor",
      desc: "Construcao civil, projetos, subs e change orders",
      core: "crm, estimating, job-costing, scheduling, expenses, invoicing",
      plugins: "construction, documents, purchase-orders, payroll",
      optional: "fleet, inventory, compliance",
      templates: "Budget por fase, CO workflow, daily logs",
    },
    {
      id: "specialty-trade",
      name: "Specialty Trade",
      desc: "HVAC, plumbing, eletrica, roofing — servicos de campo",
      core: "crm, estimating, scheduling, dispatch, invoicing",
      plugins: "field-services, inventory, maintenance-contracts",
      optional: "fleet, purchase-orders",
      templates: "Work order forms, SLA templates",
    },
    {
      id: "property-maintenance",
      name: "Property Maintenance",
      desc: "Manutencao predial, landscaping, facility management",
      core: "crm, scheduling, dispatch, invoicing, client-portal",
      plugins: "field-services, maintenance-contracts, fleet",
      optional: "inventory, compliance",
      templates: "Contratos recorrentes, preventive schedule",
    },
    {
      id: "multi-service",
      name: "Multi-Service / Mixed",
      desc: "Empresa com multiplos ramos — escolhe modulos manualmente",
      core: "crm, estimating, scheduling, invoicing, expenses",
      plugins: "Usuario seleciona na etapa 4",
      optional: "Todos disponiveis no marketplace",
      templates: "Pack basico generico US",
    },
  ];

  return (
    <Stack gap={20}>
      <Callout tone="success" title="Objetivo">
        Cliente se cadastra em menos de 5 minutos, escolhe o ramo, e sai com
        modulos certos, menus corretos, templates de preco e tour guiado —
        sem configurar nada manualmente.
      </Callout>

      <Row gap={12} wrap>
        <Stat label="Passos do wizard" value="5" tone="info" />
        <Stat label="Industry packs" value="6" />
        <Stat label="Tempo alvo" value="< 5 min" tone="success" />
        <Stat label="Novos modulos" value="Manifest" tone="success" />
      </Row>

      <H2>Fluxo do wizard (5 passos)</H2>
      <div style={{ overflowX: "auto" }}>
        <svg width={onboardingDag.width} height={onboardingDag.height} style={{ display: "block" }}>
          {onboardingDag.edges.map((e) => (
            <line
              key={`${e.from}-${e.to}`}
              x1={e.sourceX}
              y1={e.sourceY}
              x2={e.targetX}
              y2={e.targetY}
              stroke={theme.stroke.secondary}
              strokeWidth={1.5}
            />
          ))}
          {onboardingDag.nodes.map((n) => (
            <g key={n.id}>
              <rect
                x={n.x}
                y={n.y}
                width={120}
                height={32}
                rx={6}
                fill={n.id === "provision" ? theme.fill.secondary : theme.fill.tertiary}
                stroke={n.id === "provision" ? theme.accent.primary : theme.stroke.primary}
                strokeWidth={1}
              />
              <text
                x={n.x + 60}
                y={n.y + 20}
                textAnchor="middle"
                fill={theme.text.primary}
                fontSize={10}
                fontFamily="system-ui, sans-serif"
              >
                {stepLabels[n.id]}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <Text tone="tertiary" size="small">
        Fonte: fluxo de onboarding FieldForge · provisionamento automatico apos passo 5
      </Text>

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader>Passo 1 — Criar conta</CardHeader>
          <CardBody>
            <Stack gap={4}>
              <Text size="small">Email, senha, nome da empresa</Text>
              <Text size="small" tone="secondary">Subdomain auto: acme-cleaning.fieldforge.com</Text>
              <Text size="small" tone="secondary">Verificacao email + aceite termos US</Text>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Passo 2 — Escolher ramo</CardHeader>
          <CardBody>
            <Stack gap={4}>
              <Text size="small">Cards visuais com 6 industry packs</Text>
              <Text size="small" tone="secondary">Pode selecionar mais de um (multi-service)</Text>
              <Text size="small" tone="secondary">Preview: "Voce tera acesso a X modulos"</Text>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Passo 3 — Perfil da empresa</CardHeader>
          <CardBody>
            <Stack gap={4}>
              <Text size="small">Estado US (sales tax), tamanho equipe, logo</Text>
              <Text size="small" tone="secondary">Fuso horario, moeda USD</Text>
              <Text size="small" tone="secondary">Opcional: importar do QuickBooks</Text>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Passo 4 — Revisar modulos</CardHeader>
          <CardBody>
            <Stack gap={4}>
              <Text size="small">Modulos pre-selecionados pelo pack (editavel)</Text>
              <Text size="small" tone="secondary">Add-ons opcionais com preco Stripe</Text>
              <Text size="small" tone="secondary">Core sempre incluso, plugins por plano</Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Card>
        <CardHeader>Passo 5 — Setup rapido (opcional, skip permitido)</CardHeader>
        <CardBody>
          <Row gap={8} wrap>
            <Pill>Convidar 1o usuario</Pill>
            <Pill>Conectar Stripe</Pill>
            <Pill>Importar clientes CSV</Pill>
            <Pill>Configurar price book</Pill>
            <Pill>Tour guiado dashboard</Pill>
          </Row>
        </CardBody>
      </Card>

      <H2>Industry Packs — modulos liberados por ramo</H2>
      <Table
        headers={["Pack", "Descricao", "Core incluso", "Plugins auto", "Opcionais", "Templates seed"]}
        rows={industryPacks.map((p) => [
          p.name,
          p.desc,
          p.core,
          p.plugins,
          p.optional,
          p.templates,
        ])}
        striped
      />

      <H2>Matriz ramo → modulo</H2>
      <Table
        headers={["Modulo", "Cleaning", "Post-Const", "GC", "Trade", "Maint", "Mixed"]}
        rows={[
          ["crm", "Sim", "Sim", "Sim", "Sim", "Sim", "Sim"],
          ["estimating", "Sim", "Sim", "Sim", "Sim", "Opc", "Sim"],
          ["cleaning", "Sim", "Sim", "—", "—", "—", "Escolhe"],
          ["construction", "—", "Lite", "Sim", "—", "—", "Escolhe"],
          ["field-services", "—", "—", "Opc", "Sim", "Sim", "Escolhe"],
          ["job-costing", "Opc", "Sim", "Sim", "Opc", "—", "Opc"],
          ["maintenance-contracts", "—", "—", "Opc", "Opc", "Sim", "Escolhe"],
          ["fleet", "Opc", "Opc", "Opc", "Opc", "Sim", "Opc"],
          ["payroll", "—", "—", "Sim", "Opc", "—", "Opc"],
          ["accounting", "—", "—", "Opc", "—", "—", "Opc"],
        ]}
        columnAlign={["left", "center", "center", "center", "center", "center", "center"]}
        striped
      />

      <H2>Arquitetura extensivel — novos modulos sem mudar o core</H2>
      <Grid columns={2} gap={16}>
        <Stack gap={8}>
          <H3>Plugin Manifest (YAML/JSON)</H3>
          <Card>
            <CardBody>
              <Text as="span" size="small" style={{ fontFamily: "monospace", whiteSpace: "pre" }}>
{`# plugins/cleaning/manifest.yaml
id: cleaning
version: 1.0.0
name: House Cleaning
industry_packs: [house-cleaning, post-construction-clean]
dependencies: [crm, scheduling, estimating]
routes_prefix: /api/v1/cleaning
permissions: [cleaning.jobs.read, ...]
nav_items:
  - label: Cleaning Jobs
    path: /cleaning/jobs
    icon: broom
seed:
  price_book: templates/cleaning-us.json
  checklists: templates/checklists.json
billing:
  stripe_price_id: price_xxx
  tier: plugin`}
              </Text>
            </CardBody>
          </Card>
        </Stack>
        <Stack gap={8}>
          <H3>Provisionamento automatico</H3>
          <Table
            headers={["Evento", "Acao"]}
            rows={[
              ["tenant.created", "Criar tenant + RLS + subdomain"],
              ["onboarding.industry_selected", "Resolver industry_pack modules"],
              ["onboarding.completed", "Enable plugins + run migrations + seed"],
              ["plugin.enabled", "Register routes + nav + permissions"],
              ["plugin.disabled", "Hide nav, block routes, keep data"],
              ["marketplace.plugin_added", "Novo manifest → zero deploy core"],
            ]}
            striped
          />
        </Stack>
      </Grid>

      <CollapsibleSection title="Industry Pack Registry (Go)" defaultOpen leading={<Swatch color="blue" />}>
        <Card>
          <CardBody>
            <Text as="span" size="small" style={{ fontFamily: "monospace", whiteSpace: "pre" }}>
{`type IndustryPack struct {
  ID          string
  Name        string
  Description string
  CoreModules []string   // sempre ativos
  Plugins     []string   // ativados no onboarding
  Optional    []string   // marketplace add-ons
  Seeds       []SeedConfig
}

func ProvisionTenant(tenantID string, packIDs []string) error {
  packs := registry.ResolvePacks(packIDs)
  modules := packs.MergeModules() // union sem duplicata
  for _, mod := range modules {
    pluginRegistry.Enable(tenantID, mod)
    bus.Publish("plugin.enabled", {tenantID, mod})
  }
  seeder.Run(tenantID, packs.Seeds())
  return nil
}`}
            </Text>
          </CardBody>
        </Card>
      </CollapsibleSection>

      <H2>Telas web do onboarding</H2>
      <Table
        headers={["Rota", "Tela", "Descricao"]}
        rows={[
          ["/signup", "Cadastro publico", "Email, senha, empresa — inicio wizard"],
          ["/onboarding", "Wizard container", "Stepper 5 passos com progress bar"],
          ["/onboarding/industry", "Escolha do ramo", "Cards visuais dos 6 packs"],
          ["/onboarding/profile", "Perfil empresa", "Estado, equipe, logo, timezone"],
          ["/onboarding/modules", "Revisar modulos", "Lista pre-selecionada + toggles"],
          ["/onboarding/setup", "Setup rapido", "Convites, Stripe, import CSV"],
          ["/onboarding/complete", "Conclusao", "Animacao + redirect dashboard + tour"],
          ["/settings/modules", "Gerenciar modulos", "Ativar/desativar apos onboarding"],
          ["/marketplace", "Modulo marketplace", "Browse futuros plugins (fase 2)"],
        ]}
        striped
      />

      <H2>Rotas API onboarding</H2>
      <Table
        headers={["Metodo", "Rota", "Descricao"]}
        rows={[
          ["POST", "/api/v1/auth/signup", "Criar conta + tenant + inicia onboarding"],
          ["GET", "/api/v1/onboarding/status", "Passo atual e dados salvos"],
          ["GET", "/api/v1/industry-packs", "Lista packs com modulos preview"],
          ["POST", "/api/v1/onboarding/industry", "Salvar ramo(s) selecionado(s)"],
          ["POST", "/api/v1/onboarding/profile", "Salvar perfil empresa"],
          ["GET", "/api/v1/onboarding/modules/preview", "Modulos que serao ativados"],
          ["PATCH", "/api/v1/onboarding/modules", "Ajustar modulos antes de confirmar"],
          ["POST", "/api/v1/onboarding/complete", "Provisionar + seed + marcar completo"],
          ["POST", "/api/v1/onboarding/skip-setup", "Pular setup rapido"],
          ["GET", "/api/v1/plugins/available", "Marketplace — plugins disponiveis"],
          ["POST", "/api/v1/plugins/{id}/enable", "Ativar plugin pos-onboarding"],
        ]}
        striped
      />

      <Callout tone="info" title="Futuros modulos — como adicionar">
        1. Criar pasta plugins/novo-modulo/ com manifest.yaml + codigo Go.
        2. Registrar no Plugin Registry no boot da API (auto-discovery).
        3. Adicionar industry_packs no manifest se aplicavel.
        4. Deploy apenas do plugin — core, onboarding e billing nao mudam.
        5. Marketplace lista automaticamente via GET /plugins/available.
      </Callout>

      <H2>UX — principios do onboarding facil</H2>
      <Grid columns={3} gap={12}>
        <Card>
          <CardHeader>Zero config obrigatoria</CardHeader>
          <CardBody>
            <Text size="small" tone="secondary">
              Defaults inteligentes por ramo. Price book US pre-populado.
              Menus so mostram modulos ativos.
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Progresso salvo</CardHeader>
          <CardBody>
            <Text size="small" tone="secondary">
              Wizard retoma de onde parou. Pode sair no passo 3 e voltar depois
              sem perder dados.
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Tour contextual</CardHeader>
          <CardBody>
            <Text size="small" tone="secondary">
              Apos onboarding, tour guiado mostra: criar 1o cliente, 1o
              orcamento, 1o job — baseado no ramo escolhido.
            </Text>
          </CardBody>
        </Card>
      </Grid>
    </Stack>
  );
}

function MobileTab() {
  const mobileDag = useMemo(
    () =>
      computeDAGLayout({
        nodes: [
          { id: "nextjs" },
          { id: "pwa" },
          { id: "mobilecore" },
          { id: "capacitor" },
          { id: "ios" },
          { id: "android" },
        ],
        edges: [
          { from: "nextjs", to: "pwa" },
          { from: "nextjs", to: "mobilecore" },
          { from: "pwa", to: "capacitor" },
          { from: "mobilecore", to: "capacitor" },
          { from: "capacitor", to: "ios" },
          { from: "capacitor", to: "android" },
        ],
        direction: "vertical",
        nodeWidth: 160,
        nodeHeight: 34,
        rankGap: 48,
        nodeGap: 24,
        padding: 16,
      }),
    [],
  );

  const theme = useHostTheme();
  const nodeLabels: Record<string, string> = {
    nextjs: "Next.js apps/web",
    pwa: "PWA /m/* + Service Worker",
    mobilecore: "packages/mobile-core",
    capacitor: "Capacitor Shell",
    ios: "App Store (iOS)",
    android: "Play Store (Android)",
  };

  return (
    <Stack gap={20}>
      <Callout tone="success" title="Estrategia: PWA primeiro, nativo sem reescrever">
        Um unico codebase TypeScript. Tecnicos usam PWA no browser hoje;
        quando publicar nas lojas, o Capacitor embrulha o mesmo app com plugins
        nativos (camera, GPS, push, biometria). Zero segunda equipe React Native.
      </Callout>

      <Row gap={12} wrap>
        <Stat label="Abordagem" value="PWA + Capacitor" tone="info" />
        <Stat label="Plataformas" value="Web iOS Android" tone="success" />
        <Stat label="Rotas campo" value="/m/*" />
        <Stat label="Offline" value="IndexedDB + sync" tone="success" />
      </Row>

      <H2>Arquitetura mobile em camadas</H2>
      <div style={{ overflowX: "auto" }}>
        <svg width={mobileDag.width} height={mobileDag.height} style={{ display: "block" }}>
          {mobileDag.edges.map((e) => (
            <line
              key={`${e.from}-${e.to}`}
              x1={e.sourceX}
              y1={e.sourceY}
              x2={e.targetX}
              y2={e.targetY}
              stroke={theme.stroke.secondary}
              strokeWidth={1.5}
            />
          ))}
          {mobileDag.nodes.map((n) => {
            const isStore = n.id === "ios" || n.id === "android";
            return (
              <g key={n.id}>
                <rect
                  x={n.x}
                  y={n.y}
                  width={160}
                  height={34}
                  rx={6}
                  fill={isStore ? theme.fill.secondary : theme.fill.tertiary}
                  stroke={isStore ? theme.accent.primary : theme.stroke.primary}
                  strokeWidth={1}
                />
                <text
                  x={n.x + 80}
                  y={n.y + 21}
                  textAnchor="middle"
                  fill={theme.text.primary}
                  fontSize={10}
                  fontFamily="system-ui, sans-serif"
                >
                  {nodeLabels[n.id]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <H2>Comparativo de abordagens mobile</H2>
      <Table
        headers={["Abordagem", "Velocidade", "App Store", "Offline", "Recomendacao"]}
        rows={[
          ["PWA only", "Muito rapida", "Limitado (Add to Home)", "Bom", "MVP imediato"],
          ["PWA + Capacitor", "Rapida", "Sim iOS + Android", "Excelente", "PRINCIPAL"],
          ["React Native separado", "Lenta (2 codebases)", "Sim", "Excelente", "Nao — duplica UI"],
          ["Flutter separado", "Lenta", "Sim", "Excelente", "Nao — outra linguagem"],
          ["TWA Android only", "Rapida", "So Play Store", "Bom", "Opcional fase 2 Android"],
        ]}
        rowTone={[undefined, "neutral", "success", "neutral", "info"]}
        striped
      />

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader>Fase A — PWA (agora)</CardHeader>
          <CardBody>
            <Stack gap={6}>
              <Text size="small">Rotas /m/* mobile-first no Next.js</Text>
              <Text size="small" tone="secondary">manifest.json + icons 192/512</Text>
              <Text size="small" tone="secondary">Service Worker via Serwist / next-pwa</Text>
              <Text size="small" tone="secondary">Install prompt Add to Home Screen</Text>
              <Text size="small" tone="secondary">Offline queue + sync ao reconectar</Text>
              <Pill tone="success" size="sm">Ship em 3-4 semanas</Pill>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Fase B — Capacitor (lojas)</CardHeader>
          <CardBody>
            <Stack gap={6}>
              <Text size="small">apps/native com Capacitor 6</Text>
              <Text size="small" tone="secondary">WebView carrega /m ou bundle estatico</Text>
              <Text size="small" tone="secondary">Plugins: Camera, Geolocation, Push, Bio</Text>
              <Text size="small" tone="secondary">Deep links + Universal Links iOS</Text>
              <Text size="small" tone="secondary">Submit App Store + Play Store</Text>
              <Pill tone="info" size="sm">+2-3 semanas apos PWA</Pill>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <H2>Monorepo mobile</H2>
      <Table
        headers={["Pasta", "Conteudo"]}
        rows={[
          ["apps/web/app/(mobile)/m/", "Route group mobile — layout sem sidebar admin"],
          ["apps/web/public/manifest.json", "PWA manifest: name, icons, display standalone"],
          ["apps/web/public/sw.js", "Service worker — cache assets + API stale-while-revalidate"],
          ["apps/native/", "Capacitor project: ios/ android/ capacitor.config.ts"],
          ["apps/native/capacitor.config.ts", "server.url prod ou webDir para static export"],
          ["packages/mobile-core/", "Platform adapters — unica API para web e nativo"],
          ["packages/mobile-core/adapters/web.ts", "Implementacao PWA: IndexedDB, File API"],
          ["packages/mobile-core/adapters/native.ts", "Implementacao Capacitor plugins"],
          ["packages/sdk/", "API client compartilhado — mesmo em web e native"],
        ]}
        striped
      />

      <H2>Platform Adapter Pattern</H2>
      <Card>
        <CardBody>
          <Text as="span" size="small" style={{ fontFamily: "monospace", whiteSpace: "pre" }}>
{`// packages/mobile-core/platform.ts
export interface MobilePlatform {
  takePhoto(): Promise<Blob>
  getLocation(): Promise<{ lat: number; lng: number }>
  storeSecure(key: string, value: string): Promise<void>
  schedulePush(title: string, body: string): Promise<void>
  isOnline(): boolean
  queueOffline(req: OfflineRequest): Promise<void>
  syncQueue(): Promise<SyncResult>
}

// Web: adapters/web.ts → IndexedDB + navigator.geolocation
// Native: adapters/native.ts → @capacitor/camera, geolocation, push

// Uso no componente — zero if (platform):
const platform = usePlatform() // injeta web ou native no boot`}
          </Text>
        </CardBody>
      </Card>

      <H2>Plugins Capacitor por feature ERP</H2>
      <Table
        headers={["Feature ERP", "Plugin Capacitor", "PWA fallback"]}
        rows={[
          ["Fotos checklist/job", "@capacitor/camera", "input capture=environment"],
          ["GPS dispatch", "@capacitor/geolocation", "navigator.geolocation"],
          ["GPS background", "@capacitor-community/background-geolocation", "Nao disponivel"],
          ["Push notifications", "@capacitor/push-notifications", "Web Push API"],
          ["Offline storage", "@capacitor-community/sqlite", "IndexedDB + Dexie"],
          ["Biometria login", "@capacitor-community/biometric-auth", "WebAuthn passkey"],
          ["Assinatura digital", "@capacitor-community/signature-pad", "Canvas touch"],
          ["Compartilhar PDF", "@capacitor/share", "Web Share API"],
          ["Deep link job", "@capacitor/app App URL", "URL /m/jobs/:id"],
          ["Barcode materiais", "@capacitor-community/barcode-scanner", "getUserMedia + zxing"],
        ]}
        striped
      />

      <H2>Telas /m/* — app de campo (PWA + native)</H2>
      <Table
        headers={["Rota", "Tela", "Offline", "Nativo extra"]}
        rows={[
          ["/m", "Home: jobs hoje, clock status", "Sim", "Push morning briefing"],
          ["/m/jobs", "Lista jobs atribuidos", "Sim cache", "—"],
          ["/m/jobs/:id", "Executar: checklist, fotos, notas", "Sim full", "Camera nativa HD"],
          ["/m/clock", "Clock in/out + GPS", "Queue sync", "Background GPS"],
          ["/m/expenses", "Despesa + foto recibo OCR", "Queue sync", "Camera + gallery"],
          ["/m/signature", "Assinatura cliente", "Sim", "Signature pad nativo"],
          ["/m/vehicle", "Log veiculo e mileage", "Queue sync", "—"],
          ["/m/profile", "Perfil tech, notificacoes", "Parcial", "Biometria unlock"],
          ["/m/sync", "Status fila offline + forcar sync", "Sim", "—"],
        ]}
        striped
      />

      <H2>Offline sync — fila de operacoes</H2>
      <CollapsibleSection title="Fluxo offline-first" defaultOpen leading={<Swatch color="blue" />}>
        <Table
          headers={["Passo", "Comportamento"]}
          rows={[
            ["1. Acao offline", "Salva em IndexedDB/SQLite com timestamp + tenant_id"],
            ["2. UI otimista", "Mostra job completo mesmo sem rede"],
            ["3. Reconexao", "syncQueue() envia em ordem FIFO com retry exponencial"],
            ["4. Conflito", "Server wins + notifica tech se dados divergiram"],
            ["5. Fotos", "Upload em background com progress; comprime antes envio"],
            ["6. Indicador", "Badge no header: '3 pending sync'"],
          ]}
          striped
        />
      </CollapsibleSection>

      <H2>capacitor.config.ts (pronto para lojas)</H2>
      <Card>
        <CardBody>
          <Text as="span" size="small" style={{ fontFamily: "monospace", whiteSpace: "pre" }}>
{`// apps/native/capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'com.fieldforge.fieldapp',
  appName: 'FieldForge',
  webDir: '../web/out-mobile',  // ou server.url em dev
  server: {
    url: process.env.MOBILE_SERVER_URL, // https://app.fieldforge.com/m
    cleartext: false,
  },
  plugins: {
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
    SplashScreen: { launchShowDuration: 2000 },
  },
  ios: { scheme: 'FieldForge', contentInset: 'automatic' },
  android: { allowMixedContent: false },
}`}
          </Text>
        </CardBody>
      </Card>

      <H2>Publicacao App Store e Play Store</H2>
      <Grid columns={2} gap={16}>
        <CollapsibleSection title="iOS — Apple App Store" leading={<Swatch color="blue" />}>
          <Table
            headers={["Requisito", "Solucao FieldForge"]}
            rows={[
              ["Apple Developer Account", "$99/ano — conta empresa"],
              ["Privacy manifest", "PrivacyInfo.xcprivacy — camera, location, photos"],
              ["App Tracking", "Sem tracking — declarar no App Privacy"],
              ["Background location", "Justificar: dispatch + clock in/out campo"],
              ["Universal Links", "fieldforge.com/m/* → abre app"],
              ["TestFlight", "Beta com 10-20 tenants antes review"],
              ["Review tips", "Modo demo + conta teste para reviewer"],
            ]}
            striped
          />
        </CollapsibleSection>
        <CollapsibleSection title="Android — Google Play Store" leading={<Swatch color="green" />}>
          <Table
            headers={["Requisito", "Solucao FieldForge"]}
            rows={[
              ["Play Console", "$25 one-time"],
              ["Target SDK 34+", "Capacitor 6 ja suporta"],
              ["App Links", "assetlinks.json no dominio"],
              ["Foreground service", "GPS tracking — notificacao persistente"],
              ["Data safety form", "Declarar location, photos, financial"],
              ["AAB bundle", "cap build android → upload Play Console"],
              ["Internal testing", "Track interno antes producao"],
            ]}
            striped
          />
        </CollapsibleSection>
      </Grid>

      <H2>CI/CD mobile</H2>
      <Table
        headers={["Pipeline", "Trigger", "Output"]}
        rows={[
          ["pwa-build", "Push main", "PWA deploy Vercel/Fly + SW update"],
          ["cap-sync", "Tag mobile-v*", "npx cap sync ios android"],
          ["ios-build", "Tag mobile-v*", "Fastlane → TestFlight"],
          ["android-build", "Tag mobile-v*", "Fastlane → Play Internal"],
          ["ota-update", "Push /m routes", "PWA instant; native reload WebView URL"],
        ]}
        striped
      />

      <Callout tone="info" title="Regra de ouro — mobile-ready desde o dia 1">
        Todo componente em /m/* usa usePlatform() — nunca chama Capacitor ou
        navigator direto. Assim PWA funciona hoje e native liga plugins sem
        refatorar UI. Admin e portal ficam so web — nao vao para lojas.
      </Callout>

      <H2>Roadmap mobile</H2>
      <BarChart
        categories={["PWA core", "Offline sync", "Capacitor shell", "Plugins nativos", "Store submit"]}
        series={[{ name: "Semanas", data: [2, 2, 1, 2, 2], tone: "info" }]}
        valueSuffix=" sem"
        height={180}
      />
      <Text tone="tertiary" size="small">
        Fonte: estimativa mobile FieldForge · total ~9 semanas apos field-services API pronta
      </Text>
    </Stack>
  );
}

function EngineeringGapsTab() {
  const gapsRemaining = [
    { label: "Implementacao codigo", value: 8, tone: "danger" as const },
    { label: "Design Figma", value: 4, tone: "warning" as const },
    { label: "Apps scaffold", value: 5, tone: "warning" as const },
    { label: "Documentado OK", value: 14, tone: "success" as const },
  ];

  return (
    <Stack gap={20}>
      <Callout tone="success" title="Atualizacao — gaps P0 documentados no repositorio">
        Criados em /srv/projects/fieldforge: docs/domain/*, docs/adr/0001-0005,
        docs/security/*, docs/ops/*, CI GitHub Actions, scripts de validacao.
        Resilience, outbox e idempotency implementados; F0–F7 plugins no CI (DT-04).
        F5 cleaning e F6 construction com depth parcial (stubs API + web).
        F7 PWA com depth parcial (offline queue, POST timesheets, SW v3).
        Landing/GTM parcial: config/marketing-content.yaml, case studies, POST /public/contact.
      </Callout>

      <Row gap={12} wrap>
        <Stat label="Docs criados" value="24" tone="success" />
        <Stat label="ADRs" value="4" tone="info" />
        <Stat label="P0 documentado" value="12/12" tone="success" />
        <Stat label="P0 codigo pendente" value="2" tone="success" />
      </Row>

      <Grid columns={2} gap={16}>
        <Stack gap={4}>
          <H3>Status pos-documentacao</H3>
          <PieChart
            data={gapsRemaining.map((g) => ({
              label: g.label,
              value: g.value,
              tone: g.tone,
            }))}
            donut
          />
          <Text tone="tertiary" size="small">
            Fonte: repo fieldforge · CI validate passa localmente
          </Text>
        </Stack>
        <Stack gap={4}>
          <H3>Artefatos no repo</H3>
          <Table
            headers={["Path", "Status"]}
            rows={[
              ["docs/domain/context-map.md", "Criado"],
              ["docs/domain/glossary.md", "Criado"],
              ["docs/adr/0001-0004", "Criado"],
              ["docs/security/threat-model.md", "Criado"],
              ["docs/ops/slo.md + runbooks/", "Criado"],
              [".github/workflows/ci.yml", "Criado"],
              ["packages/core/resilience/", "Criado"],
              ["docs/api/openapi.yaml", "Stub Fase 4"],
            ]}
            rowTone={["success", "success", "success", "success", "success", "success", "success", "warning"]}
            striped
          />
        </Stack>
      </Grid>

      <H2>Matriz livro → status atualizado</H2>
      <Table
        headers={["Livro", "Principio", "Doc", "Codigo"]}
        rows={[
          ["DDD", "Bounded Contexts", "OK", "Pendente"],
          ["DDD", "Ubiquitous Language", "OK", "Usar em codigo"],
          ["DDD", "Aggregates", "OK", "Pendente"],
          ["DDD", "Domain Events + Outbox", "OK", "OK"],
          ["DDIA", "Idempotency billing", "OK api-security", "OK"],
          ["DDIA", "Saga financeira", "OK ADR-003", "Pendente"],
          ["DDIA", "DR RPO/RTO", "OK", "Teste restore pendente"],
          ["Release It!", "Circuit breaker", "OK ADR-004", "OK"],
          ["Google SRE", "SLO + error budget", "OK", "Grafana pendente"],
          ["Google SRE", "Runbooks", "OK", "—"],
          ["Accelerate", "DORA metrics", "OK", "Dashboard pendente"],
          ["Threat Model", "STRIDE", "OK", "Pen test pendente"],
          ["SE at Google", "CODEOWNERS", "OK", "—"],
          ["CD", "CI pipeline", "OK", "go test pendente"],
        ]}
        rowTone={[
          "success", "warning", "success", "warning", "success", "warning",
          "success", "warning", "success", "info", "success", "info",
          "success", "info", "success", "warning", "success", "info",
        ]}
        striped
      />

      <H2>P0 — status por item</H2>
      <Table
        headers={["#", "Item", "Documentacao", "Implementacao"]}
        rows={[
          ["1", "Context map", "docs/domain/context-map.md", "—"],
          ["2", "Glossary", "docs/domain/glossary.md", "—"],
          ["3", "Threat model", "docs/security/threat-model.md", "Pen test beta"],
          ["4", "Circuit breaker", "ADR-0004 + resilience/README", "OK"],
          ["5", "Idempotency keys", "docs/security/api-security.md", "OK"],
          ["6", "Saga quote flow", "docs/domain/events.md", "Fase 4 worker"],
          ["7", "Outbox pattern", "ADR-0003", "OK"],
          ["8", "SLO documentado", "docs/ops/slo.md", "Grafana alerts"],
          ["9", "DR plan", "docs/ops/disaster-recovery.md", "Restore test mensal"],
          ["10", "Tenant isolation tests", "ADR-0002", "testcontainers Fase 4"],
          ["11", "Secrets policy", "docs/security/secrets.md", "Secrets manager"],
          ["12", "Rate limiting", "docs/security/api-security.md", "Fase 4 middleware"],
        ]}
        rowTone={Array(12).fill("success")}
        striped
      />

      <H2>Ainda falta no planejamento geral</H2>
      <Table
        headers={["Area", "Gap", "Prioridade", "Fase"]}
        rows={[
          ["Design", "Figma design system + prototipos", "P0", "SDLC 3"],
          ["Produto", "BRD formal assinado pelo cliente", "P1", "SDLC 1"],
          ["Codigo", "Scaffold apps/web, api, marketing", "P0", "Dev 4"],
          ["Codigo", "packages/core/resilience implementacao", "P0", "Dev 4"],
          ["Codigo", "Tenant RLS integration test suite", "P0", "Dev 4"],
          ["API", "OpenAPI spec completa gerada", "P1", "Dev 4"],
          ["Observability", "OpenTelemetry + Grafana dashboards", "P1", "Dev 6"],
          ["Legal", "Terms/Privacy revisados por advogado US", "P1", "Pre-launch"],
          ["GTM", "Analytics GA4/Meta, referral tracking, /about /security /changelog", "P1", "Marketing"],
          ["Ops", "Primeiro DR restore test executado", "P1", "Pre beta"],
          ["QA", "Playwright E2E suite", "P1", "SDLC 5"],
          ["Contract", "Pact tests integracoes externas", "P2", "Dev 5"],
        ]}
        striped
      />

      <Callout tone="info" title="Proximo passo recomendado">
        1. SDLC Fase 3 — Figma (landing + app + onboarding).
        2. Completar GTM — analytics, referral, paginas /about /security.
        3. Capacitor shell iOS/Android + OpenAPI completa.
      </Callout>

      <CollapsibleSection title="1. Domain-Driven Design (Evans) — detalhes" defaultOpen leading={<Swatch color="purple" />}>
        <Table
          headers={["Bounded Context", "Responsabilidade", "Integracao"]}
          rows={[
            ["Identity & Access", "Auth, RBAC, tenants", "Publica: tenant.created"],
            ["Commercial", "CRM, leads, contracts", "Consome: Identity"],
            ["Estimating", "Quotes, price book, takeoff", "Publica: quote.accepted"],
            ["Operations", "Scheduling, dispatch, field", "Consome: quote.accepted"],
            ["Financial", "Invoices, expenses, GL", "Saga com Operations"],
            ["Verticals", "Cleaning, Construction plugins", "Anti-corruption layer interno"],
          ]}
          striped
        />
        <Text size="small" tone="secondary">
          Aggregates sugeridos: Tenant (root), Customer+Properties, Estimate, Job, Invoice,
          Expense, Project (construction). Cada aggregate = transacao consistente.
        </Text>
      </CollapsibleSection>

      <CollapsibleSection title="2. Dados e consistencia (Kleppmann — DDIA)" leading={<Swatch color="blue" />}>
        <Table
          headers={["Padrao", "Onde aplicar", "Status"]}
          rows={[
            ["Transactional Outbox", "Domain events → NATS/Redis", "OK"],
            ["Idempotent consumer", "Webhook Stripe, worker jobs", "Parcial"],
            ["Optimistic locking", "Job status, invoice version", "Falta"],
            ["Event versioning", "cleaning.job.completed v1→v2", "Falta"],
            ["Read replica reporting", "P&L dashboards pesados", "Futuro"],
            ["Partition strategy", "tenant_id em todas tabelas", "OK planejado"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="3. Resiliencia (Nygard — Release It!)" leading={<Swatch color="orange" />}>
        <Table
          headers={["Pattern", "Servico externo", "Config sugerida"]}
          rows={[
            ["Circuit Breaker", "Stripe", "5 falhas → open 30s → half-open"],
            ["Circuit Breaker", "Avalara/TaxJar", "Fallback: tax manual queue"],
            ["Bulkhead", "Plugin goroutines", "Max 10 concurrent/tenant"],
            ["Timeout", "Todas APIs ext", "Connect 5s, read 30s"],
            ["Retry + jitter", "Email/SMS", "3 retries, exp backoff"],
            ["Health deep", "API /health/ready", "DB + Redis + queue check"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="4. SRE e operacoes (Google SRE + Accelerate)" leading={<Swatch color="cyan" />}>
        <Grid columns={2} gap={12}>
          <Table
            headers={["SLO proposto", "Target", "Error budget/mes"]}
            rows={[
              ["Availability API", "99.5%", "3.6h downtime"],
              ["Latency p95", "< 200ms", "5% requests podem exceder"],
              ["Invoice success rate", "99.9%", "Critico — alerta P1"],
              ["Mobile sync success", "98%", "Offline queue retry"],
            ]}
            striped
          />
          <Table
            headers={["DORA metric", "Meta MVP", "Meta 12 meses"]}
            rows={[
              ["Deploy frequency", "1x/semana", "On-demand"],
              ["Lead time change", "< 1 semana", "< 1 dia"],
              ["MTTR", "< 4h", "< 1h"],
              ["Change fail rate", "< 15%", "< 5%"],
            ]}
            striped
          />
        </Grid>
      </CollapsibleSection>

      <CollapsibleSection title="5. Seguranca (OWASP + Threat Modeling)" leading={<Swatch color="pink" />}>
        <Table
          headers={["Ameaca STRIDE", "Vetor FieldForge", "Mitigacao"]}
          rows={[
            ["Spoofing", "JWT roubado", "Short TTL, refresh rotation, MFA"],
            ["Tampering", "tenant_id manipulado", "RLS + middleware + audit log"],
            ["Repudiation", "Invoice alterada", "Audit trail imutavel"],
            ["Info disclosure", "Leak cross-tenant", "Integration tests RLS + pen test"],
            ["DoS", "API abuse", "Rate limit per IP + per tenant"],
            ["Elevation", "field-tech → admin", "RBAC least privilege + test roles"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="6. Qualidade e entrega (Humble + SE at Google)" leading={<Swatch color="green" />}>
        <Table
          headers={["Pratica", "Status", "Proximo passo"]}
          rows={[
            ["Definition of Done", "Criado .github/DOD.md", "—"],
            ["ADR 0001-0004", "Criado docs/adr/", "ADR-005 API deprecation"],
            ["Contract tests OpenAPI", "Stub openapi.yaml", "Gerar spec Fase 4"],
            ["CI pipeline", "ci.yml + validate scripts", "go test quando API existir"],
            ["CODEOWNERS", "Criado", "Ajustar teams GitHub"],
            ["Feature flags", "app.config features", "Flags DB tenant Fase 4"],
            ["Observability", "SLO doc", "OpenTelemetry Fase 6"],
          ]}
          striped
        />
      </CollapsibleSection>

      <H2>Artefatos no repositorio — status</H2>
      <Table
        headers={["Artefato", "Status"]}
        rows={[
          ["docs/domain/*", "Criado"],
          ["docs/adr/0001-0004", "Criado"],
          ["docs/security/*", "Criado"],
          ["docs/ops/* + runbooks", "Criado"],
          ["docs/compliance/ccpa-data-map.md", "Criado"],
          ["packages/core/resilience/", "Criado"],
          ["docs/api/openapi.yaml", "Stub — Fase 4"],
          [".github/CODEOWNERS + CI", "Criado"],
        ]}
        rowTone={["success", "success", "success", "success", "success", "success", "warning", "success"]}
        striped
      />

      <Callout tone="info" title="Proximo passo engenharia">
        F7 PWA depth parcial no ar (offline queue expenses/time, POST timesheets, SW v3).
        Landing/GTM parcial no ar (blog CMS, case studies, contact stub).
        Proximo: Capacitor shell iOS/Android, OpenAPI completa, saga financeira, Figma (SDLC 3), GTM analytics.
      </Callout>
    </Stack>
  );
}

function ConfigTab() {
  return (
    <Stack gap={20}>
      <Callout tone="success" title="Config central dinamica — implementada">
        Arquivo unico config/app.config.yaml controla brand (nome ainda flexivel),
        cores premium, precos, debug granular e feature flags. Apps leem via
        @fieldforge/config — altere sem redeploy de logica.
      </Callout>

      <Row gap={12} wrap>
        <Stat label="Arquivo base" value="app.config.yaml" tone="info" />
        <Stat label="Starter" value="$25/mo" tone="success" />
        <Stat label="Debug" value="Granular" />
        <Stat label="Brand" value="Dinamico" tone="info" />
      </Row>

      <H2>Arquivos de configuracao</H2>
      <Table
        headers={["Arquivo", "Proposito"]}
        rows={[
          ["config/app.config.yaml", "Fonte unica: brand, pricing, debug, features"],
          ["config/environments/development.yaml", "Debug ON, mocks Stripe/Avalara"],
          ["config/environments/staging.yaml", "Debug parcial, sem bypass auth"],
          ["config/environments/production.yaml", "Debug OFF, log warn"],
          ["packages/config/", "Loader TypeScript + tipos para web/marketing"],
          ["FF_* env vars", "Sobrescrevem YAML em runtime (FF_BRAND_NAME, etc.)"],
        ]}
        striped
      />

      <H2>Brand — cores premium (facil acesso)</H2>
      <Text tone="secondary" size="small">
        Paleta profissional: slate profundo + azul confiavel. Nome do produto em
        brand.name — candidatos alternativos em brand.name_candidates.
      </Text>
      <Table
        headers={["Token", "Hex", "Uso"]}
        rows={[
          ["primary", "#0F172A", "Header, sidebar, autoridade"],
          ["accent", "#2563EB", "CTAs, links, botoes primarios"],
          ["accent_muted", "#0EA5E9", "Hover, badges, destaques suaves"],
          ["background", "#FFFFFF", "Paginas, cards"],
          ["background_subtle", "#F8FAFC", "Secoes alternadas, landing"],
          ["text_primary", "#0F172A", "Titulos e corpo principal"],
          ["text_secondary", "#475569", "Subtitulos, labels"],
          ["success", "#059669", "Job completo, pagamento OK"],
          ["warning", "#D97706", "Atraso, budget overrun"],
          ["error", "#DC2626", "Erros, falhas criticas"],
        ]}
        striped
      />
      <Text size="small" tone="tertiary">
        CSS: --brand-primary, --brand-accent, etc. via brandCssVars() no layout root
      </Text>

      <H2>Pricing — planos SaaS (config/pricing.plans)</H2>
      <Table
        headers={["Plano", "$/mes", "$/ano", "Users", "Verticais", "Badge"]}
        rows={[
          ["Starter", "25", "250", "3", "1", "—"],
          ["Business", "89", "890", "10", "2", "Most Popular"],
          ["Pro", "149", "1490", "25", "3", "—"],
          ["Enterprise", "299+", "Custom", "Unlimited", "All", "Custom"],
        ]}
        columnAlign={["left", "right", "right", "center", "center", "center"]}
        striped
      />
      <Table
        headers={["Add-on", "$/mes"]}
        rows={[
          ["Extra user", "12"],
          ["Extra vertical module", "29"],
          ["Payroll & 1099", "39"],
          ["Full accounting GL", "49"],
        ]}
        columnAlign={["left", "right"]}
        striped
      />

      <H2>Debug — ativar/desativar via config</H2>
      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>Master switch</CardHeader>
          <CardBody>
            <Stack gap={4}>
              <Text size="small">debug.enabled — false em production</Text>
              <Text size="small" tone="secondary">debug.log_level: trace → error</Text>
              <Text size="small" tone="secondary">debug.show_dev_panel — overlay visual dev</Text>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Env overrides</CardHeader>
          <CardBody>
            <Stack gap={4}>
              <Text size="small">FF_DEBUG_ENABLED=true</Text>
              <Text size="small" tone="secondary">FF_DEBUG_LOG_LEVEL=debug</Text>
              <Text size="small" tone="secondary">FF_BRAND_NAME=NovoNome</Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Table
        headers={["Feature debug", "Dev", "Staging", "Prod", "Descricao"]}
        rows={[
          ["api_trace", "ON", "ON", "OFF", "Log request/response"],
          ["mock_stripe", "ON", "ON", "OFF", "Pagamentos simulados"],
          ["mock_avalara", "ON", "OFF", "OFF", "Sales tax fixo 8.25%"],
          ["skip_email_send", "ON", "ON", "OFF", "Email so no log"],
          ["expose_config_endpoint", "ON", "OFF", "OFF", "GET /debug/config"],
          ["seed_demo_data", "ON", "OFF", "OFF", "Dados demo no signup"],
          ["bypass_auth", "OFF", "OFF", "OFF", "NUNCA em staging/prod"],
          ["verbose_sql", "OFF", "OFF", "OFF", "Queries no log — cuidado LGPD"],
        ]}
        rowTone={[undefined, "success", "info", "neutral", undefined]}
        striped
      />

      <H2>Fluxo de leitura da config</H2>
      <Table
        headers={["Camada", "Como le"]}
        rows={[
          ["Marketing (landing)", "getConfig() no build/SSR — pricing e brand"],
          ["App web", "Layout root injeta CSS vars + DevPanel se debug"],
          ["API Go", "config.Load(APP_ENV) no boot — middleware condicional"],
          ["Mobile PWA", "Mesmo endpoint /api/v1/config/public (sem secrets)"],
        ]}
        striped
      />

      <Callout tone="info" title="Nome do produto ainda aberto">
        brand.name = FieldForge (working title). Troque em um unico lugar —
        landing, app, emails e PWA atualizam automaticamente. Candidatos listados
        em brand.name_candidates no YAML.
      </Callout>

      <Callout tone="warning" title="Endpoint publico seguro">
        Expor apenas subset: brand, pricing, features publicas via
        GET /api/v1/config/public. Nunca expor debug.* em production.
      </Callout>
    </Stack>
  );
}

function LandingTab() {
  const funnelDag = useMemo(
    () =>
      computeDAGLayout({
        nodes: [
          { id: "ads" },
          { id: "landing" },
          { id: "pricing" },
          { id: "signup" },
          { id: "onboard" },
          { id: "active" },
        ],
        edges: [
          { from: "ads", to: "landing" },
          { from: "landing", to: "pricing" },
          { from: "landing", to: "signup" },
          { from: "pricing", to: "signup" },
          { from: "signup", to: "onboard" },
          { from: "onboard", to: "active" },
        ],
        direction: "horizontal",
        nodeWidth: 100,
        nodeHeight: 30,
        rankGap: 36,
        nodeGap: 8,
        padding: 12,
      }),
    [],
  );

  const theme = useHostTheme();
  const funnelLabels: Record<string, string> = {
    ads: "Ads/SEO",
    landing: "Home",
    pricing: "Pricing",
    signup: "Signup",
    onboard: "Onboarding",
    active: "Tenant ativo",
  };

  return (
    <Stack gap={20}>
      <Callout tone="success" title="Landing page — porta de entrada comercial">
        Site marketing em fieldforge.com separado do app (app.fieldforge.com).
        Converte visitantes em trials via CTA claro, pricing transparente e LPs
        por vertical. Conecta direto ao fluxo de onboarding.
      </Callout>

      <Callout tone="success" title="Entregue (parcial) — GTM marketing">
        Blog listings via config/marketing-content.yaml com fallback API
        (GET /api/v1/public/marketing-content). Case studies nas LPs /industries/*.
        Contact form POST /api/v1/public/contact stub com reference_id.
        npm run build:marketing — 22 paginas estaticas.
      </Callout>

      <Row gap={12} wrap>
        <Stat label="Dominio marketing" value="fieldforge.com" tone="info" />
        <Stat label="Dominio app" value="app.*" />
        <Stat label="Paginas" value="22" tone="success" />
        <Stat label="Meta conversao" value="3-5%" tone="success" />
      </Row>

      <H2>Funil de conversao</H2>
      <div style={{ overflowX: "auto" }}>
        <svg width={funnelDag.width} height={funnelDag.height} style={{ display: "block" }}>
          {funnelDag.edges.map((e) => (
            <line
              key={`${e.from}-${e.to}`}
              x1={e.sourceX}
              y1={e.sourceY}
              x2={e.targetX}
              y2={e.targetY}
              stroke={theme.stroke.secondary}
              strokeWidth={1.5}
            />
          ))}
          {funnelDag.nodes.map((n) => (
            <g key={n.id}>
              <rect
                x={n.x}
                y={n.y}
                width={100}
                height={30}
                rx={6}
                fill={n.id === "signup" ? theme.fill.secondary : theme.fill.tertiary}
                stroke={n.id === "signup" ? theme.accent.primary : theme.stroke.primary}
                strokeWidth={1}
              />
              <text
                x={n.x + 50}
                y={n.y + 19}
                textAnchor="middle"
                fill={theme.text.primary}
                fontSize={9}
                fontFamily="system-ui, sans-serif"
              >
                {funnelLabels[n.id]}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <H2>Homepage — secoes obrigatorias</H2>
      <Table
        headers={["Secao", "Conteudo", "CTA"]}
        rows={[
          ["Hero", "Headline + sub: ERP para cleaning, construction, field services US", "Start Free Trial"],
          ["Social proof", "Logos clientes, 'Trusted by 500+ contractors'", "—"],
          ["3 verticais", "Cards: Cleaning, Construction, Field Services com link /industries", "See how it works"],
          ["Features", "Grid 6-8 features: estimating, dispatch, job costing, portal", "View all features"],
          ["Como funciona", "3 passos: Sign up → Pick industry → Run your business", "Get started"],
          ["Pricing preview", "Starter $25, Business $89, Pro $149, Enterprise", "See pricing"],
          ["Testimonials", "Quotes de GC, cleaning company, HVAC owner", "—"],
          ["FAQ", "Multitenant? Mobile app? QuickBooks? Cancel anytime?", "—"],
          ["Footer CTA", "Banner final: 'Ready to grow your field business?'", "Start Free Trial"],
        ]}
        striped
      />

      <H2>Paginas do site marketing</H2>
      <Grid columns={2} gap={16}>
        <Table
          headers={["Rota", "Proposito"]}
          rows={[
            ["/", "Homepage principal"],
            ["/features", "Detalhe de todos modulos"],
            ["/pricing", "Planos + comparativo + FAQ billing"],
            ["/industries/*", "LP por vertical (SEO long-tail)"],
            ["/about", "Empresa, equipe, missao"],
            ["/blog", "Content marketing SEO"],
            ["/contact", "Demo request + suporte vendas"],
          ]}
          striped
        />
        <Table
          headers={["Rota", "Proposito"]}
          rows={[
            ["/login", "Redirect app.fieldforge.com"],
            ["/signup", "Redirect app.fieldforge.com/signup"],
            ["/privacy", "Privacy Policy CCPA"],
            ["/terms", "Terms of Service"],
            ["/security", "SOC2 roadmap, encryption, RLS"],
            ["/changelog", "Product updates publicos"],
            ["/status", "Status page uptime (opcional)"],
          ]}
          striped
        />
      </Grid>

      <H2>Pricing tiers (SaaS)</H2>
      <Table
        headers={["Plano", "Preco/mes", "Anual", "Inclui", "Target"]}
        rows={[
          ["Starter", "$25", "$250/yr", "Core + 1 vertical, 3 users", "Solo / small crew"],
          ["Business", "$89", "$890/yr", "2 verticals, portal, job costing, 10 users", "Growing teams"],
          ["Pro", "$149", "$1490/yr", "All verticals, 25 users, QuickBooks", "Established contractors"],
          ["Enterprise", "from $299", "Custom", "White-label, SSO, dedicated DB, SLA", "Large GC"],
        ]}
        rowTone={["info", "success", "neutral"]}
        striped
      />

      <H2>Stack e SEO</H2>
      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader>Tech stack landing</CardHeader>
          <CardBody>
            <Stack gap={4}>
              <Text size="small">apps/marketing — Next.js 15 App Router</Text>
              <Text size="small" tone="secondary">Tailwind + shadcn/ui components</Text>
              <Text size="small" tone="secondary">Deploy Vercel — fieldforge.com</Text>
              <Text size="small" tone="secondary">Plausible/GA4 analytics + Meta pixel</Text>
              <Text size="small" tone="secondary">Stripe Pricing Table embed</Text>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>SEO checklist</CardHeader>
          <CardBody>
            <Stack gap={4}>
              <Text size="small">Meta title/description por pagina</Text>
              <Text size="small" tone="secondary">Schema.org SoftwareApplication JSON-LD</Text>
              <Text size="small" tone="secondary">sitemap.xml + robots.txt</Text>
              <Text size="small" tone="secondary">Open Graph + Twitter cards</Text>
              <Text size="small" tone="secondary">Core Web Vitals LCP &lt; 2.5s</Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <H2>Integracao landing → app</H2>
      <Table
        headers={["Acao landing", "Destino app", "Parametros UTM"]}
        rows={[
          ["Start Free Trial", "app.fieldforge.com/signup", "utm_source=landing&utm_campaign=hero"],
          ["Pricing CTA", "app.fieldforge.com/signup?plan=business", "plan pre-selected"],
          ["Industry LP CTA", "app.fieldforge.com/signup?pack=cleaning", "industry pack pre-selected"],
          ["Login", "app.fieldforge.com/login", "—"],
          ["Book demo", "Calendly embed ou /contact", "lead para CRM interno"],
        ]}
        striped
      />

      <Callout tone="info" title="Entregavel Fase 3 Design">
        Prototipo Figma da landing + design system antes de codar. Validar com
        5 contractors US antes do desenvolvimento (SDLC Fase 3).
      </Callout>
    </Stack>
  );
}

type SdlcPhase = "1" | "2" | "3" | "4" | "5" | "6" | "7";

const SDLC_PHASES: {
  id: SdlcPhase;
  name: string;
  status: "done" | "active" | "pending";
  objective: string;
  deliverable: string;
  fieldforge: string;
}[] = [
  {
    id: "1",
    name: "Descoberta & Requisitos",
    status: "active",
    objective: "Entender problema do cliente antes de codar",
    deliverable: "BRD / Product Brief aprovado",
    fieldforge: "Verticais US mapeadas, modulos 32+, personas definidas",
  },
  {
    id: "2",
    name: "Planejamento & Arquitetura",
    status: "active",
    objective: "Plano tecnico executavel + cronograma",
    deliverable: "Doc arquitetura + roadmap aprovado",
    fieldforge: "Stack Go+Next.js, plugin-play, multitenant RLS — este canvas",
  },
  {
    id: "3",
    name: "Design & Prototipacao",
    status: "pending",
    objective: "Validar UX visualmente antes do codigo",
    deliverable: "Protótipo Figma navegavel aprovado",
    fieldforge: "Landing, onboarding wizard, dashboard, PWA /m/*",
  },
  {
    id: "4",
    name: "Desenvolvimento",
    status: "pending",
    objective: "Construir em sprints curtos com qualidade",
    deliverable: "Features demonstraveis por sprint",
    fieldforge: "Monorepo, Git Flow, CI, sprints 2 semanas",
  },
  {
    id: "5",
    name: "Testes & QA",
    status: "pending",
    objective: "Garantir funcionamento em todos cenarios",
    deliverable: "Relatorio testes, zero bugs criticos",
    fieldforge: "Jest, Playwright E2E, k6 load, OWASP scan",
  },
  {
    id: "6",
    name: "Deploy & Entrega",
    status: "pending",
    objective: "Producao segura, controlada, reversivel",
    deliverable: "Sistema em prod com monitoramento",
    fieldforge: "staging + prod, blue-green, sign-off cliente",
  },
  {
    id: "7",
    name: "Manutencao & Evolucao",
    status: "pending",
    objective: "Software saudavel e alinhado ao negocio",
    deliverable: "SLO atingido, docs vivas, roadmap evolutivo",
    fieldforge: "Sentry, Grafana, ADRs, changelog, NPS tenants",
  },
];

function WorkflowTab() {
  const [activePhase, setActivePhase] = useCanvasState<SdlcPhase>("sdlcPhase", "2");

  const sdlcDag = useMemo(
    () =>
      computeDAGLayout({
        nodes: SDLC_PHASES.map((p) => ({ id: p.id })),
        edges: [
          { from: "1", to: "2" },
          { from: "2", to: "3" },
          { from: "3", to: "4" },
          { from: "4", to: "5" },
          { from: "5", to: "6" },
          { from: "6", to: "7" },
          { from: "7", to: "1" },
        ],
        direction: "horizontal",
        nodeWidth: 110,
        nodeHeight: 32,
        rankGap: 28,
        nodeGap: 4,
        padding: 12,
      }),
    [],
  );

  const theme = useHostTheme();
  const phase = SDLC_PHASES.find((p) => p.id === activePhase)!;

  return (
    <Stack gap={20}>
      <Callout tone="info" title="Fluxo de trabalho profissional — ciclo de vida completo">
        Do levantamento de requisitos ao monitoramento em producao. FieldForge
        segue SDLC com entregaveis claros por fase. Fases 1-2 em andamento
        (planejamento neste canvas).
      </Callout>

      <Row gap={12} wrap>
        <Stat label="Fases SDLC" value="7" />
        <Stat label="Fase atual" value={`${activePhase} — ${phase.name.split(" ")[0]}`} tone="info" />
        <Stat label="Sprint" value="2 semanas" tone="success" />
        <Stat label="Metodologia" value="Scrum" />
      </Row>

      <H2>Ciclo de vida do projeto</H2>
      <div style={{ overflowX: "auto" }}>
        <svg width={sdlcDag.width} height={sdlcDag.height} style={{ display: "block" }}>
          {sdlcDag.edges.map((e) => (
            <line
              key={`${e.from}-${e.to}`}
              x1={e.sourceX}
              y1={e.sourceY}
              x2={e.targetX}
              y2={e.targetY}
              stroke={theme.stroke.secondary}
              strokeWidth={1.5}
              strokeDasharray={e.isBackEdge ? "4 3" : undefined}
            />
          ))}
          {sdlcDag.nodes.map((n) => {
            const p = SDLC_PHASES.find((x) => x.id === n.id)!;
            const selected = n.id === activePhase;
            return (
              <g
                key={n.id}
                style={{ cursor: "pointer" }}
                onClick={() => setActivePhase(n.id as SdlcPhase)}
              >
                <rect
                  x={n.x}
                  y={n.y}
                  width={110}
                  height={32}
                  rx={6}
                  fill={selected ? theme.fill.secondary : theme.fill.tertiary}
                  stroke={selected ? theme.accent.primary : theme.stroke.primary}
                  strokeWidth={selected ? 2 : 1}
                />
                <text
                  x={n.x + 55}
                  y={n.y + 20}
                  textAnchor="middle"
                  fill={theme.text.primary}
                  fontSize={9}
                  fontFamily="system-ui, sans-serif"
                >
                  {n.id}. {p.name.split(" ")[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <Text tone="tertiary" size="small">
        Clique em uma fase para ver detalhes · fase 7 retroalimenta fase 1 (evolucao)
      </Text>

      <Card>
        <CardHeader>
          Fase {phase.id} — {phase.name}
        </CardHeader>
        <CardBody>
          <Stack gap={8}>
            <Row gap={8}>
              <Pill active={phase.status === "active"}>
                {phase.status === "done" ? "Concluida" : phase.status === "active" ? "Em andamento" : "Pendente"}
              </Pill>
            </Row>
            <Text size="small"><Text as="span" weight="semibold">Objetivo: </Text>{phase.objective}</Text>
            <Text size="small"><Text as="span" weight="semibold">Entregavel: </Text>{phase.deliverable}</Text>
            <Text size="small" tone="secondary"><Text as="span" weight="semibold">FieldForge: </Text>{phase.fieldforge}</Text>
          </Stack>
        </CardBody>
      </Card>

      <Row gap={6} wrap>
        {SDLC_PHASES.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePhase(p.id)}
            style={{
              background: p.id === activePhase ? theme.accent.primary : theme.fill.tertiary,
              color: p.id === activePhase ? theme.text.onAccent : theme.text.secondary,
              border: `1px solid ${theme.stroke.secondary}`,
              borderRadius: 6,
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {p.id}. {p.name.split("&")[0].trim()}
          </button>
        ))}
      </Row>

      <CollapsibleSection title="1. Descoberta & Levantamento de Requisitos" defaultOpen={activePhase === "1"} leading={<Swatch color="blue" />}>
        <Table
          headers={["Atividade", "FieldForge", "Status"]}
          rows={[
            ["Reunioes discovery com stakeholders", "Verticais: cleaning, construction, field US", "Em andamento"],
            ["Mapeamento AS-IS / TO-BE", "Jobber+QuickBooks+spreadsheets → FieldForge unificado", "Feito"],
            ["Requisitos funcionais", "32 modulos, 71+ telas, user stories por persona", "Feito"],
            ["Requisitos nao-funcionais", "99.5% SLA, p95<200ms, multitenant RLS, CCPA", "Feito"],
            ["BRD / Product Brief", "Este canvas como living document", "Em revisao"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="2. Planejamento & Arquitetura" defaultOpen={activePhase === "2"} leading={<Swatch color="green" />}>
        <Table
          headers={["Atividade", "Decisao FieldForge", "Status"]}
          rows={[
            ["Stack tecnologico", "Go API + Next.js + PostgreSQL + Redis", "Aprovado"],
            ["Arquitetura", "Monorepo plugin-play multitenant", "Aprovado"],
            ["Modelagem dados", "tenant_id + RLS, schema por tier enterprise", "Planejado"],
            ["Integracoes", "Stripe, Avalara, QuickBooks, Gusto, Twilio", "Mapeado"],
            ["Cronograma", "8 fases dev + SDLC completo, sprints 2 sem", "Planejado"],
            ["Ambientes", "dev / staging / prod + CI GitHub Actions", "Planejado"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="3. Design & Prototipacao" defaultOpen={activePhase === "3"} leading={<Swatch color="purple" />}>
        <Table
          headers={["Entregavel", "Escopo", "Ferramenta"]}
          rows={[
            ["Personas", "Owner, dispatcher, field-tech, accountant, client", "Figma"],
            ["Wireframes", "Landing, onboarding, dashboard, PWA /m/*", "Figma"],
            ["Design System", "Cores, tipografia, componentes shadcn", "Figma + Storybook"],
            ["Prototipo alta fidelidade", "Navegavel com estados vazio/erro/loading", "Figma"],
            ["Validacao usabilidade", "Min 5 contractors US", "Maze / testes moderados"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="4. Desenvolvimento" defaultOpen={activePhase === "4"} leading={<Swatch color="orange" />}>
        <Grid columns={2} gap={12}>
          <Stack gap={8}>
            <H3>Git Flow</H3>
            <Card>
              <CardBody>
                <Text as="span" size="small" style={{ fontFamily: "monospace", whiteSpace: "pre" }}>
{`main          → producao
develop       → integracao
feature/*     → nova funcionalidade
fix/*         → correcao bug
hotfix/*      → urgencia producao

PR obrigatorio + code review
Conventional Commits: feat/fix/docs`}
                </Text>
              </CardBody>
            </Card>
          </Stack>
          <Stack gap={8}>
            <H3>Kanban</H3>
            <Table
              headers={["Coluna", "Criterio"]}
              rows={[
                ["Backlog", "Priorizado MoSCoW com cliente"],
                ["To Do", "Definition of Ready atendida"],
                ["In Progress", "Dev ativo, branch criada"],
                ["In Review", "PR aberto, CI passando"],
                ["Done", "Merged, deploy staging, demo-ready"],
              ]}
              striped
            />
          </Stack>
        </Grid>
        <Text size="small" tone="secondary">
          Cerimonias: daily 15min · sprint planning · review com demo · retrospectiva
        </Text>
      </CollapsibleSection>

      <CollapsibleSection title="5. Testes & QA" defaultOpen={activePhase === "5"} leading={<Swatch color="yellow" />}>
        <Table
          headers={["Tipo", "Escopo FieldForge", "Ferramenta", "Meta"]}
          rows={[
            ["Unitarios", "Go packages, mobile-core, SDK", "Go test, Jest", "80% codigo critico"],
            ["Integracao", "API endpoints + tenant isolation", "Supertest, testcontainers", "100% rotas core"],
            ["E2E", "Signup→onboard→estimate→invoice", "Playwright", "Happy path + edge cases"],
            ["Performance", "API p95, 100 tenants concorrentes", "k6", "p95 < 200ms"],
            ["Seguranca", "OWASP Top 10, tenant leak", "Semgrep, OWASP ZAP", "Zero critico"],
            ["QA Manual", "Critérios aceite Fase 1", "Checklist", "Zero bugs criticos go-live"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="6. Deploy & Entrega" defaultOpen={activePhase === "6"} leading={<Swatch color="cyan" />}>
        <Table
          headers={["Etapa", "Acao", "Ferramenta"]}
          rows={[
            ["CI merge main", "Lint + test + build", "GitHub Actions"],
            ["Deploy staging", "Automatico pos-merge", "Fly.io / Vercel preview"],
            ["Homologacao cliente", "Sign-off critérios aceite", "Staging + dados anonimizados"],
            ["Deploy producao", "Aprovacao manual + blue-green", "Fly.io + Vercel"],
            ["Smoke tests", "Health, signup, login, estimate", "Playwright smoke suite"],
            ["Go-live", "Comunicar tenants, plantao 24h", "Status page + Slack alerts"],
          ]}
          striped
        />
      </CollapsibleSection>

      <CollapsibleSection title="7. Manutencao & Evolucao" defaultOpen={activePhase === "7"} leading={<Swatch color="pink" />}>
        <Grid columns={2} gap={12}>
          <Table
            headers={["Severidade", "Resposta", "Resolucao"]}
            rows={[
              ["P1 Critico", "15 min", "4 horas"],
              ["P2 Alto", "1 hora", "8 horas"],
              ["P3 Medio", "4 horas", "3 dias"],
              ["P4 Baixo", "1 dia util", "Proximo sprint"],
            ]}
            striped
          />
          <Table
            headers={["Atividade", "Frequencia"]}
            rows={[
              ["Monitoramento SLO", "Continuo — Sentry + Grafana"],
              ["Atualizar dependencias", "Semanal — Dependabot"],
              ["Post-mortem P1/P2", "Apos cada incidente"],
              ["Roadmap com clientes", "Mensal — novas features → Fase 1"],
              ["ADRs + changelog", "A cada release"],
            ]}
            striped
          />
        </Grid>
      </CollapsibleSection>

      <H2>Ferramentas por fase — FieldForge</H2>
      <Table
        headers={["Fase", "Categoria", "Ferramentas"]}
        rows={[
          ["1 Descoberta", "Docs", "Notion, este Canvas, Google Docs"],
          ["2 Planejamento", "Gestao + Diagramas", "Linear, Miro, Canvas DAG"],
          ["3 Design", "Prototipo", "Figma, Storybook"],
          ["4 Dev", "Code + CI", "Cursor, GitHub, ESLint, golangci-lint"],
          ["5 Testes", "QA", "Jest, Playwright, k6, Semgrep"],
          ["6 Deploy", "CD + Cloud", "GitHub Actions, Fly.io, Vercel, Docker"],
          ["7 Ops", "Observabilidade", "Sentry, Grafana, PagerDuty"],
        ]}
        striped
      />

      <H2>Boas praticas transversais</H2>
      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>Comunicacao cliente</CardHeader>
          <CardBody>
            <Text size="small" tone="secondary">
              Status semanal · decisoes por escrito · change request formal para
              escopo · problemas comunicados cedo
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Seguranca por design</CardHeader>
          <CardBody>
            <Text size="small" tone="secondary">
              TLS + AES-256 · bcrypt senhas · least privilege RBAC · secrets em
              env vars · review focado em tenant isolation
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Definition of Done</CardHeader>
          <CardBody>
            <Text size="small" tone="secondary">
              Codigo + testes + PR aprovado + CI verde + deploy staging +
              documentacao atualizada + demo sprint review
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Gestao de riscos</CardHeader>
          <CardBody>
            <Text size="small" tone="secondary">
              Riscos por sprint · buffer 20% capacidade · plano contingencia
              integracoes Stripe/Avalara · comunicar antes do impacto
            </Text>
          </CardBody>
        </Card>
      </Grid>

      <Callout tone="success" title="Ordem de execucao recomendada FieldForge">
        1. Concluir Fase 2 (arquitetura) → 2. Fase 3 Design (Figma landing + app) →
        3. Landing page + signup (marketing) → 4. Fase 0 dev onboarding →
        5. Core modules em sprints → 6. QA + staging → 7. Beta tenants → 8. Go-live
      </Callout>
    </Stack>
  );
}

function RoadmapTab() {
  return (
    <Stack gap={20}>
      <H2>Esforco de desenvolvimento por fase (semanas)</H2>
      <BarChart
        categories={["F0 Onboard", "F1 Core", "F2 Estimates", "F3 Ops", "F4 Finance", "F5 Clean", "F6 Build", "F7 Field"]}
        series={[{ name: "Semanas (time de 3 devs)", data: [4, 8, 6, 7, 6, 5, 8, 5], tone: "info" }]}
        valueSuffix=" sem"
        height={220}
      />
      <Text tone="tertiary" size="small">
        Fonte: estimativa arquitetural · time de 3 devs (1 Go, 1 Fullstack, 1 DevOps)
      </Text>

      <H2>Fases do MVP</H2>
      <TodoList todos={MVP_TASKS} />

      <Divider />

      <H2>Metricas de sucesso MVP</H2>
      <Grid columns={2} gap={12}>
        <Stat label="Time to first invoice" value="< 30 min" tone="success" />
        <Stat label="Tenants beta" value="10-20" />
        <Stat label="Uptime SLA" value="99.5%" tone="info" />
        <Stat label="API p95 latency" value="< 200ms" tone="success" />
      </Grid>

      <Callout tone="info" title="Proximo passo sugerido (SDLC)">
        Concluir Fase 2 (arquitetura) → Fase 3 Design Figma (landing + app) →
        Completar GTM landing (analytics, referral) → Onboarding wizard → Core em sprints.
        Ver abas Fluxo SDLC e Landing Page.
      </Callout>
    </Stack>
  );
}

export default function FieldForgeERPPlan() {
  const [tab, setTab] = useCanvasState<Tab>("activeTab", "overview");

  return (
    <Stack gap={20} style={{ padding: "4px 2px" }}>
      <Stack gap={6}>
        <H1>FieldForge ERP — Plano Arquitetural</H1>
        <Text tone="secondary">
          ERP multitenant para House Cleaning, Construcao Civil e Servicos de Campo — mercado EUA
        </Text>
      </Stack>

      <TabBar active={tab} onChange={setTab} />
      <Divider />

      {tab === "overview" && <OverviewTab />}
      {tab === "engineering" && <EngineeringGapsTab />}
      {tab === "config" && <ConfigTab />}
      {tab === "workflow" && <WorkflowTab />}
      {tab === "landing" && <LandingTab />}
      {tab === "onboarding" && <OnboardingTab />}
      {tab === "mobile" && <MobileTab />}
      {tab === "catalog" && <CatalogTab />}
      {tab === "web" && <WebTab />}
      {tab === "modules" && <ModulesTab />}
      {tab === "routes" && <RoutesTab />}
      {tab === "stack" && <StackTab />}
      {tab === "tenant" && <TenantTab />}
      {tab === "roadmap" && <RoadmapTab />}
    </Stack>
  );
}
