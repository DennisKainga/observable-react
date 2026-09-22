import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      {/* Hero Section */}
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)] animate-pulse" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)] animate-pulse" style={{ animationDelay: '1s' }} />
        <p className="island-kicker mb-3">Observability Dashboard</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          Full-Stack OpenTelemetry
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Welcome to the TanStack frontend telemetry hub. This application is instrumented to push Real User Monitoring (RUM) data, Core Web Vitals, and traces directly to your local LGTM stack.
        </p>
      </section>

      {/* How OTel Works (Animated Pipeline) */}
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-[var(--sea-ink)]">How The Data Flows</h2>
        <div className="grid gap-4 sm:grid-cols-4 relative">
          {/* Connecting line for desktop */}
          <div className="hidden sm:block absolute top-1/2 left-0 w-full h-0.5 bg-[rgba(79,184,178,0.2)] -z-10" />

          {[
            [
              '1. React App',
              'Generates Spans',
              'Browser telemetry is generated using @opentelemetry/sdk-trace-web and sent via HTTP.',
            ],
            [
              '2. OTel Collector',
              'localhost:4318',
              'Acts as the middleman. Receives batched traces and routes them to the correct databases.',
            ],
            [
              '3. Storage',
              'Tempo & Loki',
              'Tempo stores the distributed traces. Loki stores the backend application logs.',
            ],
            [
              '4. Grafana',
              'localhost:4000',
              'Queries the databases to visualize performance, traffic, and trace-to-log correlations.',
            ],
          ].map(([title, subtitle, desc], index) => (
            <article
              key={title}
              className="island-shell feature-card rise-in rounded-2xl p-5 border border-[rgba(79,184,178,0.1)] hover:-translate-y-1 transition-transform duration-300"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="mb-3 h-8 w-8 rounded-full bg-[rgba(79,184,178,0.2)] flex items-center justify-center animate-bounce" style={{ animationDelay: `${index * 200}ms` }}>
                <span className="text-xs font-bold text-[var(--sea-ink)]">{index + 1}</span>
              </div>
              <h3 className="mb-1 text-base font-bold text-[var(--sea-ink)]">{title}</h3>
              <p className="mb-2 text-xs font-semibold text-[#328f97]">{subtitle}</p>
              <p className="m-0 text-sm text-[var(--sea-ink-soft)]">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Infrastructure Setup Instructions */}
      <section className="island-shell mt-8 rise-in rounded-2xl p-6 lg:p-10" style={{ animationDelay: '600ms' }}>
        <h2 className="mb-6 text-2xl font-bold text-[var(--sea-ink)]">Local Infrastructure Guide</h2>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column: Startup */}
          <div>
            <h3 className="mb-3 font-semibold text-[var(--sea-ink)] flex items-center gap-2">
              <span className="bg-[#328f97] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
              Start the Services
            </h3>
            <p className="text-sm text-[var(--sea-ink-soft)] mb-3">
              Ensure Docker is running, then spin up the observability stack:
            </p>
            <pre className="bg-[#0f172a] text-[#38bdf8] p-3 rounded-lg text-sm overflow-x-auto mb-6">
              <code>docker compose up -d</code>
            </pre>

            <h3 className="mb-3 font-semibold text-[var(--sea-ink)] flex items-center gap-2">
              <span className="bg-[#328f97] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
              Service Endpoints
            </h3>
            <ul className="list-none space-y-2 text-sm text-[var(--sea-ink-soft)]">
              <li className="flex justify-between border-b border-[rgba(23,58,64,0.1)] pb-1">
                <strong>Grafana UI:</strong> <span>http://localhost:4000</span>
              </li>
              <li className="flex justify-between border-b border-[rgba(23,58,64,0.1)] pb-1">
                <strong>OTel Collector (HTTP):</strong> <span>http://localhost:4318</span>
              </li>
              <li className="flex justify-between border-b border-[rgba(23,58,64,0.1)] pb-1">
                <strong>OTel Collector (gRPC):</strong> <span>localhost:4317</span>
              </li>
              <li className="flex justify-between border-b border-[rgba(23,58,64,0.1)] pb-1">
                <strong>Loki (Internal):</strong> <span>http://loki-erp:3100</span>
              </li>
              <li className="flex justify-between border-b border-[rgba(23,58,64,0.1)] pb-1">
                <strong>Tempo (Internal):</strong> <span>http://tempo-erp:3200</span>
              </li>
            </ul>
          </div>

          {/* Right Column: Grafana Config */}
          <div>
            <h3 className="mb-3 font-semibold text-[var(--sea-ink)] flex items-center gap-2">
              <span className="bg-[#328f97] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span>
              Configure Grafana
            </h3>
            <p className="text-sm text-[var(--sea-ink-soft)] mb-4">
              Open Grafana at <strong>http://localhost:4000</strong> (Login: <code>admin</code> / <code>admin</code>) and configure the internal Docker network Data Sources:
            </p>

            <div className="space-y-4">
              <div className="bg-[rgba(79,184,178,0.05)] border border-[rgba(79,184,178,0.2)] p-4 rounded-xl">
                <h4 className="font-bold text-sm text-[var(--sea-ink)] mb-1">Add Tempo (Traces)</h4>
                <ul className="list-disc pl-4 text-xs text-[var(--sea-ink-soft)] space-y-1">
                  <li>Navigate to <strong>Connections &gt; Data Sources</strong></li>
                  <li>URL: <code>http://tempo-erp:3200</code></li>
                  <li>Under <em>Trace to logs</em>, select your Loki data source and set tags to <code>service.name</code></li>
                </ul>
              </div>

              <div className="bg-[rgba(79,184,178,0.05)] border border-[rgba(79,184,178,0.2)] p-4 rounded-xl">
                <h4 className="font-bold text-sm text-[var(--sea-ink)] mb-1">Add Loki (Logs)</h4>
                <ul className="list-disc pl-4 text-xs text-[var(--sea-ink-soft)] space-y-1">
                  <li>Navigate to <strong>Connections &gt; Data Sources</strong></li>
                  <li>URL: <code>http://loki-erp:3100</code></li>
                  <li>Click Save & Test</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}