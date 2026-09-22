# Observable React: Full-Stack Telemetry with TanStack & OTel

## Why This Project Exists
This project serves as a comprehensive reference implementation for adding **Real User Monitoring (RUM)** and **Full-Stack Observability** to a modern React application using TanStack Start. It bridges the gap between frontend user experience and backend performance by capturing Core Web Vitals, dynamic route transitions, API requests, and manual business interactions (like POS checkouts) and correlating them into a single, unified trace.

## Why OpenTelemetry (OTel)?
Historically, developers had to install proprietary SDKs (like DataDog, New Relic, or Sentry) and were locked into that specific vendor's ecosystem. 

OpenTelemetry solves this by providing a single, open-source standard for generating and exporting telemetry data (Traces, Metrics, and Logs). 
* **Vendor-Agnostic:** You write your instrumentation code once. If you want to switch your visualization tool from Grafana to DataDog tomorrow, you only change one line in the Collector config—zero changes to your React codebase.
* **Full Context:** It allows for trace context propagation. A unique Trace ID generated in the browser is passed to the backend via HTTP headers, allowing you to track a single button click all the way down to a specific SQL database query.
* **Rich Auto-Instrumentation:** It automatically hooks into `fetch`, `XMLHttpRequest`, and browser document load events to build waterfalls without manual effort.

## The Architecture & How It Works
This project uses the **LGTM Stack** (Loki, Grafana, Tempo) orchestrated alongside the OTel Collector.

1. **React Frontend (The Emitter):** The browser uses `@opentelemetry/sdk-trace-web` to observe interactions and Core Web Vitals. It batches these spans and pushes them via HTTP to the Collector.
2. **OpenTelemetry Collector (The Traffic Cop):** Acts as a middleman. It receives raw data from the frontend on port `4318`, processes it, and routes Traces to Tempo and Logs to Loki.
3. **Tempo & Loki (The Storage):** Tempo ingests traces via gRPC on port `4317`. Loki ingests logs via HTTP on port `3100`. Both store the data persistently.
4. **Grafana (The UI):** Connects to Tempo (port `3200`) and Loki to visualize the data, rendering waterfalls and correlating logs to traces using shared Trace IDs.

---

## How to Run the Project

### 1. Spin Up the Observability Infrastructure
From the root of the project, run the following Docker Compose command to boot the background telemetry services:

```bash
docker compose -f devops/observability/docker-compose.yml up -d

```

**What this command runs:**

* **`otel-collector-erp`:** Starts the OpenTelemetry Collector listening on `localhost:4318` (HTTP) for incoming React traces and `localhost:4317` (gRPC) for backend API traces.
* **`tempo-erp`:** Starts the distributed tracing database. It receives traces from the Collector and exposes a query UI on port `3200`.
* **`loki-erp`:** Starts the log aggregation system on port `3100`.
* **`grafana-erp`:** Starts the visualization dashboard on `http://localhost:4000` (mapped to internal port 3000), depending on Tempo to boot first.

### 2. Start the React Application

Install dependencies and boot the TanStack development server:

```bash
npm install
npm run dev
```

Navigate to `http://localhost:3000` and click around the application to generate some initial traffic, Core Web Vitals (LCP, INP, CLS), and network requests.

### 3. Configure Grafana to View Traces

With data flowing, configure Grafana to read it:

1. Open **http://localhost:4000** in your browser.
2. Log in using the default credentials:
* **Username:** `admin`
* **Password:** `admin`


3. Navigate to **Connections > Data Sources > Add data source**.
4. **Add Tempo (Traces):**
* Select **Tempo**.
* Set URL to: `http://tempo-erp:3200`
* Under *Trace to logs*, select your Loki data source and set tags to `service.name`.
* Click **Save & test**.


5. **Add Loki (Logs):**
* Select **Loki**.
* Set URL to: `http://loki-erp:3100`
* Click **Save & test**.



### 4. Explore the Data

1. Click the **Explore** (compass) icon in Grafana's left sidebar.
2. Select **Tempo** from the top-left data source dropdown.
3. Run a TraceQL query to find specific actions, such as:
* Find sluggish user interactions: `{ .web_vital.name = "INP" && .web_vital.rating = "needs-improvement" }`
* Find all loads of the home page: `{ .page.route = "/" }`


4. Click on any resulting trace ID to view the full waterfall breakdown of the page load or interaction.



## The Core Engine: `telemetry.ts`

### Why `telemetry.ts` Exists

In a React Single Page Application (SPA), OpenTelemetry does not work entirely out-of-the-box like it does in a backend Node or PHP environment. `telemetry.ts` is the custom configuration script required to boot the OpenTelemetry Web SDK inside the browser safely. It bridges the gap between TanStack Router's dynamic client-side navigation and standard OTel tracing specifications by sanitizing URLs, managing distributed trace context across async events, and piping Google's Web Vitals directly into actionable OTel Spans.

### Code Breakdown

Here is a block-by-block breakdown of what the configuration does and why each piece is necessary:

#### 1. The Imports

```typescript
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor, type SpanProcessor, type ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
// ... other OTel and web-vitals imports

```

Pulls in the core web tracing SDK, async context managers, network exporters, and auto-instrumentation libraries required to hook into standard browser APIs without manually writing traces for every network request.

#### 2. The Custom Span Processor (`TanStackPageProcessor`)

```typescript
class TanStackPageProcessor implements SpanProcessor {
    onStart(span: Span): void { 
        // ... path cleaning and user extraction logic
    }
}

```

This class acts as middleware, intercepting every trace (Span) the moment it is created but *before* it is batched and sent to the backend.

* **URL Sanitization (`cleanPath`):** Uses regex to find raw database IDs or UUIDs in the URL (e.g., `/users/123/edit`) and masks them into generic route templates (`/users/{id}/edit`). This prevents Grafana from treating every single user profile visit as a completely different webpage, allowing you to view aggregate performance metrics for the route as a whole.
* **User Context Injection:** Checks `localStorage` for an authenticated user session. If found, it attaches the user's ID and name to the trace as attributes (`user.id`). This allows you to search Tempo for all errors experienced by a specific customer.
* **Span Renaming:** Overrides generic HTTP span names (like just "GET") with descriptive, actionable names like `GET /users/{id}`.

#### 3. Initialization & Resource Definition

```typescript
export const initTelemetry = () => {
    const resource = resourceFromAttributes({
        'service.name': 'observable-react-frontend',
    });

```

Defines the `initTelemetry` function which is executed exactly once when the React client boots. The `Resource` tags every piece of data leaving the browser with the `service.name`, ensuring Loki and Tempo know exactly which application generated the traffic in a microservice environment.

#### 4. The Tracer Provider & Exporter

```typescript
    const exporter = new OTLPTraceExporter({
        url: 'http://localhost:4318/v1/traces',
    });

    const provider = new WebTracerProvider({ 
        resource,
        spanProcessors: [
            new TanStackPageProcessor(),
            new BatchSpanProcessor(exporter)
        ]
    });

```

* **`OTLPTraceExporter`:** Tells the SDK exactly where to send the data over the network (pointing to the local OTel Collector's HTTP port).
* **`WebTracerProvider`:** The central engine of the SDK that manages span creation.
* **`BatchSpanProcessor`:** Instead of making a separate network request for every single span (which would destroy browser performance), this processor batches traces in memory and sends them in compressed chunks.

#### 5. Context Management

```typescript
    provider.register({
        contextManager: new ZoneContextManager(),
    });

```

Browsers handle asynchronous tasks (Promises, timeouts, DOM events) differently than servers. `ZoneContextManager` ensures that if a user clicks a button, and that button triggers three asynchronous API calls, all three calls are successfully grouped under the single parent button-click trace.

#### 6. Auto-Instrumentations

```typescript
    registerInstrumentations({
        instrumentations: [
            new DocumentLoadInstrumentation(),
            new FetchInstrumentation({ propagateTraceHeaderCorsUrls: [/.+/g] }),
            new XMLHttpRequestInstrumentation({ propagateTraceHeaderCorsUrls: [/.+/g] }),
        ],
    });

```

Instructs the SDK to automatically hijack the browser's native `fetch` and `XHR` APIs, as well as the initial HTML document load.

* **`propagateTraceHeaderCorsUrls`:** This is the magic behind full-stack tracing. It allows the browser to inject `traceparent` HTTP headers into outbound API requests. The Laravel backend reads this header to continue the exact same trace on the server side, linking front-end clicks directly to back-end SQL queries.

#### 7. Core Web Vitals Integration

```typescript
    const sendToOpenTelemetry = (metric: any) => {
        const cwTracer = provider.getTracer('observable-react-frontend');
        const span = cwTracer.startSpan(`Web Vital: ${metric.name}`);
        
        span.setAttribute('web_vital.name', metric.name);
        span.setAttribute('web_vital.value', metric.value);
        span.setAttribute('web_vital.rating', metric.rating);
        // ... formatting and span.end()
    };

    onLCP(sendToOpenTelemetry);
    // ... onINP, onCLS, onFCP, onTTFB

```

Google's `web-vitals` library tracks real-world UX performance metrics like Largest Contentful Paint (LCP) and Interaction to Next Paint (INP). This block intercepts those metrics the moment the browser calculates them, creates a custom OpenTelemetry Span, attaches the score (e.g., `needs-improvement` or `good`), and fires it off to Grafana for continuous RUM tracking.