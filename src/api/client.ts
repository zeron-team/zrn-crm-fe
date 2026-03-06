import axios from "axios";

// In production, the API is served via Apache reverse proxy at /api/v1
// In development (Vite dev server), proxy to localhost:8000
const baseURL = import.meta.env.DEV
    ? `http://${window.location.hostname || "localhost"}:8000/api/v1`
    : "/api/v1";

const api = axios.create({
    baseURL,
    headers: {
        "Content-Type": "application/json",
    },
});

export default api;
