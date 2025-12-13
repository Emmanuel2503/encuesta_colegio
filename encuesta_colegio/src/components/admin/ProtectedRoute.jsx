import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";

// TIEMPO MÁXIMO DE INACTIVIDAD: 5 Minutos (en milisegundos)
const MAX_INACTIVITY_TIME = 5 * 60 * 1000;

const ProtectedRoute = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("admin_token");
  const lastActivity = localStorage.getItem("last_activity");

  // Función para verificar expiración
  const checkSession = () => {
    const now = Date.now();

    // Si no hay última actividad registrada, la marcamos ahora
    if (!lastActivity) {
      localStorage.setItem("last_activity", now.toString());
      return true;
    }

    const timeDiff = now - parseInt(lastActivity);

    if (timeDiff > MAX_INACTIVITY_TIME) {
      // TIEMPO EXPIRADO: Limpiamos y echamos al usuario
      localStorage.removeItem("admin_token");
      localStorage.removeItem("last_activity");
      return false; // Sesión inválida
    }

    // SESIÓN VÁLIDA: Actualizamos el contador de tiempo
    localStorage.setItem("last_activity", now.toString());
    return true;
  };

  // Verificamos al intentar renderizar la ruta
  if (!token || !checkSession()) {
    return <Navigate to="/login" replace />;
  }

  // Listener global: Si el usuario mueve el mouse o teclea, reiniciamos el contador
  // Esto hace que la sesión solo expire si REALMENTE no está haciendo nada
  useEffect(() => {
    const updateActivity = () => {
      localStorage.setItem("last_activity", Date.now().toString());
    };

    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keypress", updateActivity);
    window.addEventListener("click", updateActivity);

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keypress", updateActivity);
      window.removeEventListener("click", updateActivity);
    };
  }, []);

  // Si pasa todas las pruebas, muestra el contenido (Outlet)
  return <Outlet />;
};

export default ProtectedRoute;
