import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Layers,
  Loader2,
  Plus,
  Copy,
  ExternalLink,
  Edit,
  Trash2,
} from "lucide-react";
import api from "../../api/axiosConfig";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

const SurveyGroupManager = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const fetchGroups = async (currentUser) => {
    try {
      const res = await api.get("/api/survey-groups", {
        params: { userId: currentUser.id, userRole: currentUser.role },
      });
      setGroups(res.data);
    } catch {
      toast.error("Error al cargar los grupos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user_data");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      fetchGroups(parsed);
    }
  }, []);

  const copyLink = (accessLink) => {
    const fullLink = `${window.location.origin}/grupo/${accessLink}`;
    navigator.clipboard.writeText(fullLink);
    toast.success("Enlace copiado al portapapeles", { icon: "🔗" });
  };

  const handleDelete = async (id, name) => {
    const result = await Swal.fire({
      title: "¿Eliminar grupo?",
      text: `Se eliminará el grupo "${name}" y su enlace dejará de funcionar.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#3b82f6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/survey-groups/${id}`, {
          data: { userId: user.id, userRole: user.role },
        });
        setGroups(groups.filter((g) => g.id !== id));
        toast.success("Grupo eliminado.");
      } catch (error) {
        Swal.fire(
          "Error",
          error.response?.data?.error || "No se pudo eliminar el grupo",
          "error",
        );
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-blue-600">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      <div className="max-w-6xl mx-auto pt-8 px-6">
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-6 font-medium transition-colors"
        >
          <ArrowLeft size={20} /> Volver al Panel
        </Link>

        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Layers className="text-green-600" size={32} /> Grupos de
              Encuestas
            </h1>
            <p className="text-gray-500 mt-2">
              Un enlace único para evaluar a todos los profesores de un año.
            </p>
          </div>
          <Link
            to="/admin/grupos/nuevo"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5"
          >
            <Plus size={20} /> Nuevo Grupo
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {groups.length === 0 ? (
            <div className="p-12 text-center">
              <Layers size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">
                Aún no has creado ningún grupo de encuestas.
              </p>
              <Link
                to="/admin/grupos/nuevo"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all"
              >
                <Plus size={18} /> Crea tu primer grupo
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Nombre</th>
                    <th className="px-6 py-4">Año</th>
                    <th className="px-6 py-4">N° Profesores</th>
                    <th className="px-6 py-4">Activo</th>
                    <th className="px-6 py-4">Expiración</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {groups.map((group) => (
                    <tr
                      key={group.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {group.name}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {group.year_level}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {group.survey_count}
                      </td>
                      <td className="px-6 py-4">
                        {group.is_active ? (
                          <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
                            Activo
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {group.expiration_date
                          ? new Date(group.expiration_date).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => copyLink(group.access_link)}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Copiar Link"
                          >
                            <Copy size={18} />
                          </button>
                          <a
                            href={`/grupo/${group.access_link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Ver"
                          >
                            <ExternalLink size={18} />
                          </a>
                          <Link
                            to={`/admin/grupos/editar/${group.id}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </Link>
                          <button
                            onClick={() => handleDelete(group.id, group.name)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveyGroupManager;
