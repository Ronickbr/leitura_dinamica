"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;
const MOBILE_USER_AGENT_PATTERN =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;

type ConnectionWithPreferences = {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

export type MobileExperienceState = {
  isMobile: boolean;
  isTablet: boolean;
  isTouchDevice: boolean;
  prefersReducedData: boolean;
  prefersReducedMotion: boolean;
  hasSlowConnection: boolean;
  viewportWidth: number;
  viewportHeight: number;
  orientation: "portrait" | "landscape";
  connectionType: string;
};

const defaultState: MobileExperienceState = {
  isMobile: false,
  isTablet: false,
  isTouchDevice: false,
  prefersReducedData: false,
  prefersReducedMotion: false,
  hasSlowConnection: false,
  viewportWidth: 1280,
  viewportHeight: 720,
  orientation: "landscape",
  connectionType: "unknown",
};

const MobileExperienceContext = createContext<MobileExperienceState>(defaultState);

function getConnectionState() {
  const connection = (navigator as Navigator & { connection?: ConnectionWithPreferences })
    .connection;
  const connectionType = connection?.effectiveType || "unknown";
  const prefersReducedData = Boolean(connection?.saveData);

  return {
    connection,
    connectionType,
    prefersReducedData,
    hasSlowConnection: ["slow-2g", "2g", "3g"].includes(connectionType),
  };
}

function detectMobileExperience(): MobileExperienceState {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const touchPoints = navigator.maxTouchPoints || 0;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const mobileUserAgent = MOBILE_USER_AGENT_PATTERN.test(navigator.userAgent);
  const isTouchDevice =
    coarsePointer ||
    touchPoints > 0 ||
    "ontouchstart" in window;
  const isMobile = viewportWidth <= MOBILE_BREAKPOINT || (mobileUserAgent && isTouchDevice);
  const isTablet =
    !isMobile &&
    viewportWidth <= TABLET_BREAKPOINT &&
    (mobileUserAgent || isTouchDevice);
  const { connectionType, prefersReducedData, hasSlowConnection } =
    getConnectionState();

  return {
    isMobile,
    isTablet,
    isTouchDevice,
    prefersReducedData,
    prefersReducedMotion,
    hasSlowConnection,
    viewportWidth,
    viewportHeight,
    orientation: viewportWidth > viewportHeight ? "landscape" : "portrait",
    connectionType,
  };
}

export function MobileExperienceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<MobileExperienceState>(defaultState);

  const syncState = useCallback(() => {
    setState(detectMobileExperience());
  }, []);

  useEffect(() => {
    syncState();

    const connection = getConnectionState().connection;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    window.addEventListener("resize", syncState, { passive: true });
    window.addEventListener("orientationchange", syncState, { passive: true });
    mediaQuery.addEventListener("change", syncState);
    connection?.addEventListener?.("change", syncState);

    return () => {
      window.removeEventListener("resize", syncState);
      window.removeEventListener("orientationchange", syncState);
      mediaQuery.removeEventListener("change", syncState);
      connection?.removeEventListener?.("change", syncState);
    };
  }, [syncState]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.dataset.mobile = String(state.isMobile);
    root.dataset.tablet = String(state.isTablet);
    root.dataset.touch = String(state.isTouchDevice);
    root.dataset.reducedData = String(state.prefersReducedData || state.hasSlowConnection);
    root.dataset.orientation = state.orientation;
    root.style.setProperty("--app-viewport-height", `${state.viewportHeight}px`);
    root.style.setProperty("--app-viewport-width", `${state.viewportWidth}px`);

    body.dataset.mobile = String(state.isMobile);

    // Expõe o estado para debug rápido e para ferramentas de monitoramento no navegador.
    (window as Window & { __leituraMobileExperience?: MobileExperienceState }).__leituraMobileExperience =
      state;
  }, [state]);

  const value = useMemo(() => state, [state]);

  return (
    <MobileExperienceContext.Provider value={value}>
      {children}
    </MobileExperienceContext.Provider>
  );
}

export function useMobileExperience() {
  return useContext(MobileExperienceContext);
}
