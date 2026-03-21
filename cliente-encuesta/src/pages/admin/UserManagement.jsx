import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  Users,
  Loader2,
  Trash2,
  Edit,
  ShieldAlert,
  ShieldCheck,
  Plus
} from "lucide-react";
import api from "../../api/axiosConfig";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

const UserManagement = () => {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm();

  // Load the current active user from local storage
  useEffect(() => {
    const storedUser = localStorage.getItem("user_data");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setCurrentUser(parsedUser);
      if (parsedUser.role !== "ADMIN") {
        toast.error("No tienes permisos para ver esta página.");
        navigate("/admin/dashboard");
      } else {
        fetchUsers(parsedUser);
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const fetchUsers = async (userSession) => {
    try {
      const res = await api.get("/api/admin/users", {
        params: { userRole: userSession.role }
      });
      setUsersList(res.data);
    } catch (error) {
      toast.error("Error al cargar la lista de usuarios.");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (userToEdit = null) => {
    setEditingUser(userToEdit);
    if (userToEdit) {
      setValue("username", userToEdit.username);
      setValue("full_name", userToEdit.full_name);
      setValue("role", userToEdit.role);
      setValue("password_hash", ""); // Empty indicating no change unless typed
    } else {
      reset();
      setValue("role", "EDITOR"); // default
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    reset();
  };

  const onSubmit = async (data) => {
    try {
      if (editingUser) {
        // Enviar userId de quien edita para RBAC audit
        const payload = { ...data, adminUserId: currentUser.id };
        await api.put(`/api/admin/users/${editingUser.id}`, payload);
        toast.success("Usuario actualizado correctamente.");
      } else {
        if (!data.password_hash) {
          toast.error("La contraseña es obligatoria para nuevos usuarios.");
          return;
        }
        await api.post("/api/admin/users", { ...data, adminUserId: currentUser.id });
        toast.success("Usuario creado exitosamente.");
      }
      closeModal();
      fetchUsers(currentUser);
    } catch (error) {
      const msg = error.response?.data?.error || "Error al procesar la solicitud.";
      Swal.fire("Error", msg, "error");
    }
  };

  const handleDelete = async (id, username) => {
    if (username === "admin") {
      Swal.fire("Acción bloqueada", "El usuario admin principal no puede ser eliminado.", "error");
      return;
    }

    if (id === currentUser.id) {
      Swal.fire("Acción bloqueada", "No puedes eliminar tu propia cuenta.", "error");
      return;
    }

    const confirm = await Swal.fire({
      title: "¿Estás seguro?",
      text: "Se eliminará el acceso de este usuario al sistema.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#3b82f6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    });

    if (confirm.isConfirmed) {
      try {
        await api.delete(`/api/admin/users/${id}`, {
          data: { adminUserId: currentUser.id }
        });
        toast.success("Usuario eliminado.");
        fetchUsers(currentUser);
      } catch (error) {
        Swal.fire("Error", error.response?.data?.error || "No se pudo eliminar el usuario", "error");
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
          <ArrowLeft size={20} /> Volver al Panel Principal
        </Link>

        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="text-blue-600" size={32} /> Gestión de Usuarios
            </h1>
            <p className="text-gray-500 mt-2">
              Crea o edita cuentas de administradores y editores.
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5"
          >
            <Plus size={20} /> Nuevo Usuario
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Nombre Completo</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Creado el</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {usersList.map((usr) => (
                <tr key={usr.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-800">{usr.username}</span>
                    {usr.username === "admin" && (
                      <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider" title="Cuenta Maestra (Intocable)">
                        Root
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{usr.full_name}</td>
                  <td className="px-6 py-4">
                    {usr.role === "ADMIN" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                        <ShieldAlert size={14} /> ADMIN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                        <ShieldCheck size={14} /> EDITOR
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(usr.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openModal(usr)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar Usuario"
                      >
                        <Edit size={18} />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(usr.id, usr.username)}
                        disabled={usr.id === currentUser?.id || usr.username === "admin"}
                        className={`p-2 rounded-lg transition-colors ${
                          usr.id === currentUser?.id || usr.username === "admin"
                            ? "text-slate-200 cursor-not-allowed"
                            : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                        }`}
                        title={usr.id === currentUser?.id ? "No puedes borrarte a ti mismo" : (usr.username === "admin" ? "Inborrable" : "Eliminar Usuario")}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {usersList.length === 0 && (
            <div className="p-8 text-center text-slate-500">No hay usuarios registrados.</div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">
                {editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Usuario (Username) *</label>
                <input
                  {...register("username", { required: true })}
                  disabled={editingUser?.username === "admin"}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-colors disabled:opacity-60"
                  placeholder="ej: juanperez"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  {...register("full_name", { required: true })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-colors"
                  placeholder="Juan Perez"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Rol en el Sistema *</label>
                <select
                  {...register("role")}
                  disabled={editingUser?.username === "admin"}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-colors disabled:opacity-60"
                >
                  <option value="EDITOR">Editor (Solo encuestas)</option>
                  <option value="ADMIN">Administrador (Control total)</option>
                </select>
                {editingUser?.username === "admin" && (
                  <p className="text-xs text-orange-500 mt-1">El rol del usuario Root no puede degradarse.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  {editingUser ? "Contraseña (déjalo en blanco para no cambiarla)" : "Contraseña *"}
                </label>
                <input
                  type="password"
                  {...register("password_hash")}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-colors"
                  placeholder="********"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all hover:-translate-y-0.5"
                >
                  {editingUser ? "Guardar Cambios" : "Crear Cuenta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
