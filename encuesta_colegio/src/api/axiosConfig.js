import axios from "axios";

// Creamos una instancia con la configuración base
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Toma la URL del archivo .env
});

// Interceptor (Opcional pero recomendado nivel Senior):
// Si ya tienes un token guardado, lo inyecta automáticamente en todas las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    // config.headers.Authorization = `Bearer ${token}`; // Descomentar si implementas JWT en el futuro
  }
  return config;
});

export default api;
