import { useState, useEffect, useCallback } from "react";
import api from "../api/client";
import {
    Shield, CheckCircle2, XCircle, RefreshCw, Upload, Save,
    Zap, Building2, FileCheck, AlertTriangle, Wifi, WifiOff
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface ArcaConfig {
    id?: number;
    cuit: string;
    razon_social: string;
    condicion_iva: number;
    punto_vta: number;
    domicilio_comercial: string;
    inicio_actividades: string;
    cert_path: string;
    key_path: string;
    environment: string;
    is_active: boolean;
}

interface SalePoint {
    nro: number;
    emision_tipo: string;
    bloqueado: string;
    fecha_baja: string | null;
}

const IVA_CONDITIONS: Record<number, string> = {
    1: "Responsable Inscripto",
    4: "Exento",
    5: "Consumidor Final",
    6: "Monotributo",
    8: "Proveedor del Exterior",
    9: "Cliente del Exterior",
    10: "IVA Liberado – Ley Nº 19.640",
    11: "Responsable Inscripto – Agente de Percepción",
};

export default function ArcaConfigPanel() {
    const { t } = useTranslation();
    const [config, setConfig] = useState<ArcaConfig>({
        cuit: "",
        razon_social: "",
        condicion_iva: 1,
        punto_vta: 2,
        domicilio_comercial: "",
        inicio_actividades: "",
        cert_path: "arca/certs/certificado.crt",
        key_path: "arca/certs/clave_privada.key",
        environment: "homologacion",
        is_active: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
    const [connectionMsg, setConnectionMsg] = useState("");
    const [salePoints, setSalePoints] = useState<SalePoint[]>([]);
    const [hasConfig, setHasConfig] = useState(false);
    const [certFile, setCertFile] = useState<File | null>(null);
    const [keyFile, setKeyFile] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState<string>("");

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await api.get("/arca/config");
            setConfig(res.data);
            setHasConfig(true);
            // Also fetch sale points
            try {
                const spRes = await api.get("/arca/sale-points");
                setSalePoints(spRes.data);
            } catch { /* ignore */ }
        } catch {
            setHasConfig(false);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (hasConfig && config.id) {
                await api.put(`/arca/config/${config.id}`, config);
            } else {
                const res = await api.post("/arca/config", config);
                setConfig(res.data);
                setHasConfig(true);
            }
        } catch (err) {
            console.error("Error saving ARCA config", err);
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setConnectionStatus("testing");
        setConnectionMsg("");
        try {
            const res = await api.post("/arca/test-connection");
            setConnectionStatus(res.data.success ? "ok" : "error");
            setConnectionMsg(res.data.message);
            if (res.data.success) {
                // Refresh sale points
                try {
                    const spRes = await api.get("/arca/sale-points");
                    setSalePoints(spRes.data);
                } catch { /* ignore */ }
            }
        } catch (err: any) {
            setConnectionStatus("error");
            setConnectionMsg(err.response?.data?.detail || "Connection failed");
        }
    };

    const handleUploadCert = async () => {
        if (!certFile) return;
        setUploadStatus("Subiendo certificado...");
        const fd = new FormData();
        fd.append("cert_file", certFile);
        try {
            await api.post("/arca/config/upload-cert", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setUploadStatus("✅ Certificado subido correctamente");
            setCertFile(null);
        } catch {
            setUploadStatus("❌ Error al subir certificado");
        }
    };

    const handleUploadKey = async () => {
        if (!keyFile) return;
        setUploadStatus("Subiendo clave privada...");
        const fd = new FormData();
        fd.append("key_file", keyFile);
        try {
            await api.post("/arca/config/upload-key", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setUploadStatus("✅ Clave privada subida correctamente");
            setKeyFile(null);
        } catch {
            setUploadStatus("❌ Error al subir clave privada");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="animate-spin text-blue-500 mr-2" size={20} />
                <span className="text-gray-500">Cargando configuración ARCA...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Connection Status Banner */}
            <div className={`rounded-xl border p-4 flex items-center justify-between transition-all ${connectionStatus === "ok"
                    ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
                    : connectionStatus === "error"
                        ? "bg-gradient-to-r from-red-50 to-orange-50 border-red-200"
                        : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
                }`}>
                <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-xl ${connectionStatus === "ok" ? "bg-green-100" : connectionStatus === "error" ? "bg-red-100" : "bg-blue-100"
                        }`}>
                        {connectionStatus === "ok" ? (
                            <Wifi className="text-green-600" size={22} />
                        ) : connectionStatus === "error" ? (
                            <WifiOff className="text-red-600" size={22} />
                        ) : (
                            <Shield className="text-blue-600" size={22} />
                        )}
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900">
                            {connectionStatus === "ok" ? "Conectado a ARCA"
                                : connectionStatus === "error" ? "Error de Conexión"
                                    : "Estado de Conexión ARCA"}
                        </h4>
                        <p className="text-sm text-gray-600">
                            {connectionMsg || `Ambiente: ${config.environment === "produccion" ? "🔴 Producción" : "🟡 Homologación (Testing)"}`}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleTestConnection}
                    disabled={connectionStatus === "testing"}
                    className="flex items-center px-4 py-2.5 bg-white rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
                >
                    <Zap size={16} className={`mr-2 ${connectionStatus === "testing" ? "animate-pulse text-yellow-500" : "text-blue-500"}`} />
                    {connectionStatus === "testing" ? "Probando..." : "Probar Conexión"}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Datos del Emisor */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="p-5 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg bg-indigo-50">
                                <Building2 size={20} className="text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Datos del Emisor</h3>
                                <p className="text-xs text-gray-500">Información fiscal principal</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">CUIT</label>
                                <input
                                    type="text"
                                    value={config.cuit}
                                    onChange={(e) => setConfig({ ...config, cuit: e.target.value })}
                                    placeholder="20-12345678-9"
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Punto de Venta</label>
                                <input
                                    type="number"
                                    value={config.punto_vta}
                                    onChange={(e) => setConfig({ ...config, punto_vta: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Razón Social</label>
                            <input
                                type="text"
                                value={config.razon_social}
                                onChange={(e) => setConfig({ ...config, razon_social: e.target.value })}
                                placeholder="Mi Empresa S.R.L."
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Condición de IVA</label>
                            <select
                                value={config.condicion_iva}
                                onChange={(e) => setConfig({ ...config, condicion_iva: parseInt(e.target.value) })}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                            >
                                {Object.entries(IVA_CONDITIONS).map(([id, name]) => (
                                    <option key={id} value={id}>{name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Domicilio Comercial</label>
                            <input
                                type="text"
                                value={config.domicilio_comercial || ""}
                                onChange={(e) => setConfig({ ...config, domicilio_comercial: e.target.value })}
                                placeholder="Av. Corrientes 1234, CABA"
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Inicio Actividades</label>
                                <input
                                    type="date"
                                    value={config.inicio_actividades || ""}
                                    onChange={(e) => setConfig({ ...config, inicio_actividades: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Ambiente</label>
                                <select
                                    value={config.environment}
                                    onChange={(e) => setConfig({ ...config, environment: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                >
                                    <option value="homologacion">🟡 Homologación (Testing)</option>
                                    <option value="produccion">🔴 Producción</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Certificados */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="p-5 border-b border-gray-100">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-amber-50">
                                    <FileCheck size={20} className="text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Certificados Digitales</h3>
                                    <p className="text-xs text-gray-500">Certificado y clave para firma digital ARCA</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Certificado (.crt)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="file"
                                        accept=".crt,.pem,.cer"
                                        onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    <button
                                        onClick={handleUploadCert}
                                        disabled={!certFile}
                                        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-all flex items-center"
                                    >
                                        <Upload size={14} className="mr-1" /> Subir
                                    </button>
                                </div>
                                {config.cert_path && (
                                    <p className="text-xs text-green-600 mt-1 flex items-center">
                                        <CheckCircle2 size={12} className="mr-1" />
                                        Ruta: {config.cert_path}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Clave Privada (.key)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="file"
                                        accept=".key,.pem"
                                        onChange={(e) => setKeyFile(e.target.files?.[0] || null)}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    <button
                                        onClick={handleUploadKey}
                                        disabled={!keyFile}
                                        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-all flex items-center"
                                    >
                                        <Upload size={14} className="mr-1" /> Subir
                                    </button>
                                </div>
                                {config.key_path && (
                                    <p className="text-xs text-green-600 mt-1 flex items-center">
                                        <CheckCircle2 size={12} className="mr-1" />
                                        Ruta: {config.key_path}
                                    </p>
                                )}
                            </div>

                            {uploadStatus && (
                                <p className={`text-sm font-medium ${uploadStatus.includes("✅") ? "text-green-600" : uploadStatus.includes("❌") ? "text-red-600" : "text-blue-600"}`}>
                                    {uploadStatus}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Puntos de Venta */}
                    {salePoints.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                            <div className="p-5 border-b border-gray-100">
                                <h3 className="font-semibold text-gray-900 text-sm">Puntos de Venta Autorizados</h3>
                            </div>
                            <div className="p-4">
                                <div className="space-y-2">
                                    {salePoints.map((sp) => (
                                        <div
                                            key={sp.nro}
                                            className={`flex items-center justify-between p-3 rounded-lg border ${sp.nro === config.punto_vta
                                                    ? "bg-blue-50 border-blue-200"
                                                    : "bg-gray-50 border-gray-100"
                                                }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <span className="font-mono font-bold text-gray-900 text-lg">
                                                    {String(sp.nro).padStart(4, "0")}
                                                </span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                                                    {sp.emision_tipo}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {sp.bloqueado === "N" ? (
                                                    <span className="text-xs text-green-600 flex items-center">
                                                        <CheckCircle2 size={12} className="mr-1" /> Activo
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-red-600 flex items-center">
                                                        <XCircle size={12} className="mr-1" /> Bloqueado
                                                    </span>
                                                )}
                                                {sp.nro === config.punto_vta && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                                        En uso
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
                >
                    <Save size={18} className="mr-2" />
                    {saving ? "Guardando..." : "Guardar Configuración ARCA"}
                </button>
            </div>

            {/* Warning for production */}
            {config.environment === "produccion" && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start space-x-3">
                    <AlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" size={20} />
                    <div>
                        <h4 className="font-semibold text-red-800 text-sm">Ambiente de Producción Activo</h4>
                        <p className="text-red-700 text-xs mt-1">
                            Las facturas emitidas en este ambiente son <strong>fiscalmente válidas</strong> y tendrán efecto legal ante ARCA (AFIP).
                            Asegurate de tener los datos correctos antes de emitir.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
