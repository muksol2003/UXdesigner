const GEMINI_MODEL = "gemini-2.0-flash";

const GEMINI_API_KEY_STORAGE_KEY = "heurivision_user_gemini_api_key";

function getStoredGeminiApiKey() {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || "";
}

function saveGeminiApiKey(apiKey) {
    localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, apiKey);
}

function clearGeminiApiKey() {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
}

function buildGeminiApiUrl(apiKey) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
}
