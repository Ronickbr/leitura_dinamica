import { auth } from '../lib/firebase';

const BASE_URL = window.location.hostname === 'localhost' && window.location.port === '5173'
    ? 'http://localhost:8000/api'
    : '/api';

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
