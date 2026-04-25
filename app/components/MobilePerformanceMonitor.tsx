"use client";

import { useEffect } from "react";
import { useMobileExperience } from "./MobileExperienceProvider";

type MetricName =
  | "ttfb"
  | "domContentLoaded"
  | "load"
  | "fcp"
  | "lcp"
  | "cls"
  | "longTaskCount"
  | "resourceCount";

type MetricEntry = {
  name: MetricName;
  value: number;
  unit: "ms" | "count" | "score";
  rating: "good" | "needs-improvement" | "poor";
  deviceProfile: "mobile" | "desktop";
  timestamp: number;
};

type MetricThreshold = {
  good: number;
  poor: number;
};

const metricThresholds: Record<MetricName, MetricThreshold> = {
  ttfb: { good: 800, poor: 1800 },
  domContentLoaded: { good: 1800, poor: 3200 },
  load: { good: 2500, poor: 4500 },
  fcp: { good: 1800, poor: 3000 },
  lcp: { good: 2500, poor: 4000 },
  cls: { good: 0.1, poor: 0.25 },
  longTaskCount: { good: 2, poor: 6 },
  resourceCount: { good: 60, poor: 120 },
};

function getMetricRating(name: MetricName, value: number) {
  const threshold = metricThresholds[name];

  if (value <= threshold.good) {
    return "good";
  }

  if (value <= threshold.poor) {
    return "needs-improvement";
  }

  return "poor";
}

function persistMetrics(metrics: Record<string, MetricEntry>) {
  const payload = {
    updatedAt: new Date().toISOString(),
    metrics: Object.values(metrics),
  };

  window.localStorage.setItem(
    "leitura-mobile-performance",
    JSON.stringify(payload)
  );
}

export default function MobilePerformanceMonitor() {
  const { isMobile, prefersReducedData, hasSlowConnection } = useMobileExperience();

  useEffect(() => {
    if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") {
      return;
    }

    const metricStore: Record<string, MetricEntry> = {};
    const observers: PerformanceObserver[] = [];
    const deviceProfile = isMobile ? "mobile" : "desktop";

    const reportMetric = (
      name: MetricName,
      value: number,
      unit: MetricEntry["unit"]
    ) => {
      const metric: MetricEntry = {
        name,
        value: Number(value.toFixed(name === "cls" ? 3 : 0)),
        unit,
        rating: getMetricRating(name, value),
        deviceProfile,
        timestamp: Date.now(),
      };

      metricStore[name] = metric;
      persistMetrics(metricStore);

      const root = document.documentElement;
      root.dataset.mobilePerformance = Object.values(metricStore).some(
        (entry) => entry.rating === "poor"
      )
        ? "poor"
        : "good";

      window.dispatchEvent(
        new CustomEvent("leitura:mobile-metric", { detail: metric })
      );
    };

    const navigationEntry = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming | undefined;

    if (navigationEntry) {
      reportMetric("ttfb", navigationEntry.responseStart, "ms");
      reportMetric(
        "domContentLoaded",
        navigationEntry.domContentLoadedEventEnd,
        "ms"
      );
      reportMetric("load", navigationEntry.loadEventEnd, "ms");
    }

    // Garante um snapshot inicial para testes e monitoramento logo no primeiro paint.
    reportMetric(
      "resourceCount",
      performance.getEntriesByType("resource").length,
      "count"
    );

    try {
      const paintObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name === "first-contentful-paint") {
            reportMetric("fcp", entry.startTime, "ms");
          }
        });
      });
      paintObserver.observe({ type: "paint", buffered: true });
      observers.push(paintObserver);
    } catch {
      // Ignora browsers que nao suportam a observacao detalhada de paint.
    }

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          reportMetric("lcp", lastEntry.startTime, "ms");
        }
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      observers.push(lcpObserver);
    } catch {
      // Ignora browsers sem suporte a LCP.
    }

    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const shift = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value?: number;
          };

          if (!shift.hadRecentInput) {
            clsValue += shift.value || 0;
            reportMetric("cls", clsValue, "score");
          }
        });
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
      observers.push(clsObserver);
    } catch {
      // Ignora browsers sem suporte a CLS.
    }

    try {
      let longTaskCount = 0;
      const longTaskObserver = new PerformanceObserver((list) => {
        longTaskCount += list.getEntries().length;
        reportMetric("longTaskCount", longTaskCount, "count");
      });
      longTaskObserver.observe({ type: "longtask", buffered: true });
      observers.push(longTaskObserver);
    } catch {
      // Ignora browsers sem suporte a Long Tasks.
    }

    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const totalResources =
          performance.getEntriesByType("resource").length + list.getEntries().length;
        reportMetric("resourceCount", totalResources, "count");
      });
      resourceObserver.observe({ type: "resource", buffered: true });
      observers.push(resourceObserver);
    } catch {
      // Ignora browsers sem suporte a resource timing buffered.
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        persistMetrics(metricStore);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Em redes lentas ou com economia de dados, reduzimos ruído visual e registramos o perfil.
    document.documentElement.dataset.networkProfile =
      prefersReducedData || hasSlowConnection ? "constrained" : "standard";

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      observers.forEach((observer) => observer.disconnect());
      persistMetrics(metricStore);
    };
  }, [hasSlowConnection, isMobile, prefersReducedData]);

  return null;
}
