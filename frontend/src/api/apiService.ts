import { auth } from '../lib/firebase';

function normalizeBaseUrl(baseUrl: string) {
    return baseUrl.endsWith('/')
        ? baseUrl.slice(0, -1)
        : baseUrl;
}

function resolveBaseUrl() {
    const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

    if (configuredBaseUrl) {
        return normalizeBaseUrl(configuredBaseUrl);
    }

    // Em build/preview local nao existe o proxy do Vite, entao apontamos direto para a API.
    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    return normalizeBaseUrl(isLocalhost ? 'http://localhost:8000/api' : '/api');
}

const BASE_URL = resolveBaseUrl();

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;

    const headers = {
        ...options.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erro na requisição');
    }

    return response.json();
};

export const processAudio = async (audioBlob: Blob, originalText: string) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'reading.webm');
    formData.append('original_text', originalText);

    // Note: For multipart/form-data, fetch handles the Content-Type header and boundary
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;

    const response = await fetch(`${BASE_URL}/process-audio`, {
        method: 'POST',
        headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erro no processamento do áudio');
    }

    return response.json();
};
