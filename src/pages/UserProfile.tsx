import { useState, useEffect, useRef } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Camera, Save, User, Phone, MapPin, Heart, AlertTriangle, FileText, Trash2, CheckCircle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL?.replace("/api/v1", "") || "";

// ─── Stable sub-component (defined OUTSIDE to avoid re-mount on parent re-render) ───
function InputField({ label, name, value, onChange, type = "text", placeholder = "", icon }: {
    label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string; placeholder?: string; icon?: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">{label}</label>
            <div className="relative">
                {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">{icon}</span>}
                <input
                    type={type} name={name} value={value}
                    onChange={onChange} placeholder={placeholder}
                    className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-all`}
                />
            </div>
        </div>
    );
}

export default function UserProfile() {
    const { user, refreshUser } = useAuth();
    const fileRef = useRef<HTMLInputElement>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState({
        full_name: "", phone: "", mobile: "",
        dni: "", cuil: "", birth_date: "",
        gender: "", nationality: "", marital_status: "",
        address: "", city: "", state: "",
        zip_code: "", country: "", emergency_contact: "",
        emergency_phone: "", blood_type: "", bio: "",
    });

    useEffect(() => {
        api.get("/profile").then(r => {
            setProfile(r.data);
            setForm({
                full_name: r.data.full_name || "",
                phone: r.data.phone || "",
                mobile: r.data.mobile || "",
                dni: r.data.dni || "",
                cuil: r.data.cuil || "",
                birth_date: r.data.birth_date || "",
                gender: r.data.gender || "",
                nationality: r.data.nationality || "",
                marital_status: r.data.marital_status || "",
                address: r.data.address || "",
                city: r.data.city || "",
                state: r.data.state || "",
                zip_code: r.data.zip_code || "",
                country: r.data.country || "Argentina",
                emergency_contact: r.data.emergency_contact || "",
                emergency_phone: r.data.emergency_phone || "",
                blood_type: r.data.blood_type || "",
                bio: r.data.bio || "",
            });
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await api.put("/profile", form);
            setProfile(res.data);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
            if (refreshUser) refreshUser();
        } catch (err) {
            console.error(err);
        }
        setSaving(false);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append("file", file);
        try {
            const res = await api.post("/profile/avatar", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setProfile((p: any) => ({ ...p, avatar_url: res.data.avatar_url }));
            if (refreshUser) refreshUser();
        } catch (err: any) {
            console.error(err);
            const detail = err?.response?.data?.detail;
            alert(typeof detail === 'string' ? detail : JSON.stringify(detail) || "Error al subir la foto. Intentá de nuevo.");
        }
        setUploading(false);
    };

    const handleDeleteAvatar = async () => {
        await api.delete("/profile/avatar");
        setProfile((p: any) => ({ ...p, avatar_url: null }));
        if (refreshUser) refreshUser();
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
        </div>
    );

    const avatarUrl = profile?.avatar_url ? `${API_BASE}${profile.avatar_url}` : null;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Avatar */}
                    <div className="relative group flex-shrink-0">
                        <div className="w-28 h-28 rounded-full border-4 border-white/30 shadow-lg overflow-hidden bg-white/10 backdrop-blur-sm">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl font-black text-white/60">
                                    {(form.full_name || user?.email || "?").charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => fileRef.current?.click()}
                            className="absolute bottom-0 right-0 w-9 h-9 bg-white text-indigo-600 rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-50 transition-all transform group-hover:scale-110"
                            title="Cambiar foto"
                        >
                            {uploading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent" />
                            ) : (
                                <Camera size={16} />
                            )}
                        </button>
                        {avatarUrl && (
                            <button
                                onClick={handleDeleteAvatar}
                                className="absolute top-0 right-0 w-7 h-7 bg-red-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                                title="Eliminar foto"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </div>

                    {/* User Info Header */}
                    <div className="text-center sm:text-left flex-1">
                        <h1 className="text-2xl font-black">{form.full_name || profile?.email}</h1>
                        <p className="text-indigo-100 text-sm mt-1">{profile?.email}</p>
                        <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                            {(profile?.role || "").split(",").map((r: string) => r.trim()).filter(Boolean).map((r: string) => (
                                <span key={r} className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase">
                                    {r}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Datos Personales */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <User size={16} className="text-indigo-500" /> Datos Personales
                        </h2>
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <InputField label="Nombre Completo" name="full_name" value={form.full_name} onChange={handleChange} placeholder="Juan Pérez" />
                        </div>
                        <InputField label="DNI" name="dni" value={form.dni} onChange={handleChange} placeholder="12.345.678" />
                        <InputField label="CUIL" name="cuil" value={form.cuil} onChange={handleChange} placeholder="20-12345678-9" />
                        <InputField label="Fecha de Nacimiento" name="birth_date" value={form.birth_date} onChange={handleChange} type="date" />
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">Género</label>
                            <select name="gender" value={form.gender} onChange={handleChange}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                                <option value="">Seleccionar...</option>
                                <option value="M">Masculino</option>
                                <option value="F">Femenino</option>
                                <option value="X">No Binario</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                        <InputField label="Nacionalidad" name="nationality" value={form.nationality} onChange={handleChange} placeholder="Argentina" />
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">Estado Civil</label>
                            <select name="marital_status" value={form.marital_status} onChange={handleChange}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                                <option value="">Seleccionar...</option>
                                <option value="Soltero/a">Soltero/a</option>
                                <option value="Casado/a">Casado/a</option>
                                <option value="Divorciado/a">Divorciado/a</option>
                                <option value="Viudo/a">Viudo/a</option>
                                <option value="Unión de hecho">Unión de hecho</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Contacto */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-100">
                        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <Phone size={16} className="text-emerald-500" /> Contacto
                        </h2>
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label="Teléfono Fijo" name="phone" value={form.phone} onChange={handleChange} placeholder="+54 11 1234-5678" />
                        <InputField label="Celular" name="mobile" value={form.mobile} onChange={handleChange} placeholder="+54 9 11 1234-5678" />
                        <div className="sm:col-span-2">
                            <label className="block text-xs text-gray-500 mb-1 font-medium">Email</label>
                            <input type="email" value={profile?.email || ""} disabled
                                className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                            <p className="text-[10px] text-gray-400 mt-1">El email se modifica desde Usuarios</p>
                        </div>
                    </div>
                </div>

                {/* Dirección */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-100">
                        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <MapPin size={16} className="text-amber-500" /> Dirección
                        </h2>
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <InputField label="Dirección" name="address" value={form.address} onChange={handleChange} placeholder="Av. Corrientes 1234, Piso 5" />
                        </div>
                        <InputField label="Ciudad" name="city" value={form.city} onChange={handleChange} placeholder="Buenos Aires" />
                        <InputField label="Provincia" name="state" value={form.state} onChange={handleChange} placeholder="CABA" />
                        <InputField label="Código Postal" name="zip_code" value={form.zip_code} onChange={handleChange} placeholder="C1043" />
                        <InputField label="País" name="country" value={form.country} onChange={handleChange} placeholder="Argentina" />
                    </div>
                </div>

                {/* Emergencia */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-r from-red-50 to-pink-50 border-b border-gray-100">
                        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <AlertTriangle size={16} className="text-red-500" /> Emergencia
                        </h2>
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label="Contacto de Emergencia" name="emergency_contact" value={form.emergency_contact} onChange={handleChange} placeholder="María López" />
                        <InputField label="Teléfono de Emergencia" name="emergency_phone" value={form.emergency_phone} onChange={handleChange} placeholder="+54 9 11 5555-1234" />
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">Grupo Sanguíneo</label>
                            <select name="blood_type" value={form.blood_type} onChange={handleChange}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                                <option value="">Seleccionar...</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Observaciones */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-100">
                    <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <FileText size={16} className="text-purple-500" /> Observaciones
                    </h2>
                </div>
                <div className="p-5">
                    <textarea
                        name="bio" value={form.bio} onChange={handleChange}
                        rows={3} placeholder="Notas adicionales, alergias, información relevante..."
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                    />
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pb-6">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
                >
                    {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : saved ? (
                        <CheckCircle size={18} />
                    ) : (
                        <Save size={18} />
                    )}
                    {saved ? "¡Guardado!" : saving ? "Guardando..." : "Guardar Perfil"}
                </button>
            </div>
        </div>
    );
}
