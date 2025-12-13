import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";

const AdminLogin = () => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // NOTA: Esto es validación temporal frontend.
    // Luego lo conectaremos con el Backend real.
    if (pin === "12345") {
      localStorage.setItem("admin_token", "demo-token");
      navigate("/admin/dashboard");
    } else {
      setError("PIN incorrecto. Acceso denegado.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm border border-gray-200">
        <div className="flex justify-center mb-4 text-blue-600">
          <div className="p-3 bg-blue-50 rounded-full">
            <Lock size={32} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Acceso Directora
        </h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PIN de Seguridad
            </label>
            <input
              type="password"
              maxLength={5}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} // Solo números
              className="w-full text-center text-2xl tracking-widest p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="•••••"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center font-medium">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
