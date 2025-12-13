import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2, ChevronRight } from "lucide-react";
import api from "../api/axiosConfig";

const AdminLogin = () => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Petición real al backend configurado
      const res = await api.post("/api/admin/login", { pin });

      if (res.data.success) {
        localStorage.setItem("admin_token", "session_valid");
        localStorage.setItem("last_activity", Date.now().toString());
        navigate("/admin/dashboard");
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 401) {
        setError("El PIN ingresado es incorrecto.");
      } else {
        setError("No hay conexión con el servidor.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    // FONDO: Degradado moderno (Slate a Blue)
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-50 px-4">
      <div className="w-full max-w-md">
        {/* LOGO / ICONO FLOTANTE */}
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-200 text-white transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <ShieldCheck size={40} />
          </div>
        </div>

        {/* TARJETA PRINCIPAL */}
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl border border-gray-100 backdrop-blur-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
              Panel de Control
            </h1>
            <p className="text-slate-500 mt-2 text-sm">
              Introduce tus credenciales de seguridad para gestionar las
              encuestas.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                PIN de Acceso
              </label>
              <input
                type="password"
                maxLength={5}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="w-full text-center text-3xl font-mono tracking-[0.5em] p-4 border border-gray-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all placeholder-gray-300 text-slate-700"
                placeholder="•••••"
                disabled={loading}
                autoFocus
              />
            </div>

            {/* MENSAJE DE ERROR ANIMADO */}
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 animate-pulse border border-red-100">
                <span>🚫</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || pin.length < 1}
              className="group w-full bg-slate-900 hover:bg-blue-600 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl transition-all duration-300 flex justify-center items-center gap-2 shadow-lg shadow-slate-200 hover:shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> Verificando...
                </>
              ) : (
                <>
                  Ingresar al Sistema
                  <ChevronRight
                    size={20}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </button>
          </form>
        </div>

        {/* FOOTER */}
        <p className="text-center text-slate-400 text-xs mt-8">
          &copy; {new Date().getFullYear()} Sistema de Gestión Académica
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
