import { type Span } from '@opentelemetry/api';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, type ReadableSpan, type SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';


class TanStackPageProcessor implements SpanProcessor {
    forceFlush(): Promise<void> { return Promise.resolve(); }
    onEnd(span: ReadableSpan): void {}
    shutdown(): Promise<void> { return Promise.resolve(); }
    
    onStart(span: Span): void {
        const rawPath = window.location.pathname;

        const cleanPath = rawPath
            .replace(/\/\d+(?=\/|$)/g, '/{id}')
            .replace(/\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(?=\/|$)/g, '/{uuid}');

        span.setAttribute('page.route', cleanPath);
        span.setAttribute('page.url', window.location.href);

        try {
            const authUserStr = localStorage.getItem('auth_user');
            if (authUserStr) {
                const user = JSON.parse(authUserStr);
                if (user?.id) {
                    span.setAttribute('user.id', String(user.id));
                    span.setAttribute('user.name', user.name || 'Unknown');
                }
            }
        } catch (e) {
            // Ignore parse errors on load
        }

        // Safely extract the span name to bypass TS2339
        const spanName = (span as unknown as ReadableSpan).name;

        if (spanName === 'GET' || spanName === 'POST' || spanName === 'PUT' || spanName === 'DELETE') {
            span.updateName(`${spanName} ${cleanPath}`);
        } else if (spanName === 'documentLoad') {
            span.updateName(`documentLoad ${cleanPath}`);
        }
    }
}
export const initTelemetry = () => {
    const resource = resourceFromAttributes({
        'service.name': 'observable-react-frontend',
    });

    const exporter = new OTLPTraceExporter({
        url: 'http://localhost:4318/v1/traces',
    });

    // Pass processors directly into the constructor
    const provider = new WebTracerProvider({ 
        resource,
        spanProcessors: [
            new TanStackPageProcessor(),
            new BatchSpanProcessor(exporter)
        ]
    });

    provider.register({
        contextManager: new ZoneContextManager(),
    });

    registerInstrumentations({
        instrumentations: [
            new DocumentLoadInstrumentation(),
            new FetchInstrumentation({
                propagateTraceHeaderCorsUrls: [/.+/g],
                clearTimingResources: true,
            }),
            new XMLHttpRequestInstrumentation({
                propagateTraceHeaderCorsUrls: [/.+/g],
            }),
        ],
    });

    const sendToOpenTelemetry = (metric: any) => {
        const cwTracer = provider.getTracer('observable-react-frontend');
        const span = cwTracer.startSpan(`Web Vital: ${metric.name}`);
        
        span.setAttribute('web_vital.name', metric.name);
        span.setAttribute('web_vital.value', metric.value);
        span.setAttribute('web_vital.rating', metric.rating);
        
        const cleanPath = window.location.pathname
            .replace(/\/\d+(?=\/|$)/g, '/{id}')
            .replace(/\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(?=\/|$)/g, '/{uuid}');
            
        span.setAttribute('page.route', cleanPath);
        span.end();
    };

    onLCP(sendToOpenTelemetry);
    onINP(sendToOpenTelemetry);
    onCLS(sendToOpenTelemetry);
    onFCP(sendToOpenTelemetry);
    onTTFB(sendToOpenTelemetry);
};