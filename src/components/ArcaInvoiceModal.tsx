import { useState, useEffect } from "react";
import api from "../api/client";
import {
    X, Zap, FileText, CheckCircle2, AlertTriangle,
    Calculator, Plus, Trash2, ArrowRight, BadgeCheck, RefreshCw, Search, CreditCard, Clock
} from "lucide-react";

interface ArcaInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoiceId: number;
    invoiceNumber: string;
    invoiceAmount: number;
    clientName: string;
    clientCuit: string;
    onSuccess: () => void;
    // Direct mode props (generate from ARCA without pre-existing invoice)
    directMode?: boolean;
    clients?: { id: number; name: string; cuit_dni?: string; address?: string }[];
    products?: { id: number; name: string; description: string; price: number; type: string }[];
    quotes?: { id: number; quote_number: string; client_id: number | null; status: string; currency: string; total_amount: number; items: { id: number; product_id: number | null; description: string; quantity: number; unit_price: number; total_price: number }[] }[];
}

interface IvaItem {
    iva_id: number;
    base_imp: number;
    importe: number;
}

interface LineItem {
    codigo: string;
    descripcion: string;
    unidad: string;
    cantidad: number;
    precio_unitario: number;
    total: number;
    product_id?: number | null;
}

const UNIT_TYPES = [
    "unidades", "horas", "servicios", "metros", "kg", "litros", "paquetes", "otros"
];

const ALL_CBTE_TYPES = [
    { id: 1, desc: "Factura A", letter: "A" },
    { id: 2, desc: "Nota de Débito A", letter: "A" },
    { id: 3, desc: "Nota de Crédito A", letter: "A" },
    { id: 6, desc: "Factura B", letter: "B" },
    { id: 7, desc: "Nota de Débito B", letter: "B" },
    { id: 8, desc: "Nota de Crédito B", letter: "B" },
    { id: 11, desc: "Factura C", letter: "C" },
    { id: 12, desc: "Nota de Débito C", letter: "C" },
    { id: 13, desc: "Nota de Crédito C", letter: "C" },
];

// Filter voucher types based on emitter's IVA condition
// Monotributo (6) / Exento (4) → only C
// Resp. Inscripto (1) → A and B
function getAllowedCbteTypes(condicionIva: number) {
    switch (condicionIva) {
        case 1:  // Responsable Inscripto
        case 11: // Resp. Inscripto - Ag. Percepción
            return ALL_CBTE_TYPES.filter(c => c.letter === "A" || c.letter === "B");
        case 6:  // Monotributo
        case 4:  // Exento
        case 5:  // Consumidor Final
        default:
            return ALL_CBTE_TYPES.filter(c => c.letter === "C");
    }
}

// Check if emitter discriminates IVA
function discriminatesIva(condicionIva: number): boolean {
    return condicionIva === 1 || condicionIva === 11;
}

const DOC_TYPES = [
    { id: 80, desc: "CUIT" },
    { id: 96, desc: "DNI" },
    { id: 99, desc: "Consumidor Final" },
];

const IVA_CONDITIONS_RECEPTOR = [
    { id: 1, desc: "Responsable Inscripto" },
    { id: 4, desc: "Exento" },
    { id: 5, desc: "Consumidor Final" },
    { id: 6, desc: "Monotributo" },
    { id: 8, desc: "Proveedor del Exterior" },
    { id: 9, desc: "Cliente del Exterior" },
    { id: 10, desc: "IVA Liberado" },
    { id: 11, desc: "Resp. Inscripto - Ag. Percepción" },
];

const IVA_RATES = [
    { id: 3, desc: "0%", rate: 0 },
    { id: 4, desc: "10.5%", rate: 0.105 },
    { id: 5, desc: "21%", rate: 0.21 },
    { id: 6, desc: "27%", rate: 0.27 },
    { id: 8, desc: "5%", rate: 0.05 },
    { id: 9, desc: "2.5%", rate: 0.025 },
];

const CONCEPTO_TYPES = [
    { id: 1, desc: "Productos" },
    { id: 2, desc: "Servicios" },
    { id: 3, desc: "Productos y Servicios" },
];

export default function ArcaInvoiceModal({
    isOpen, onClose, invoiceId, invoiceNumber, invoiceAmount,
    clientName, clientCuit, onSuccess,
    directMode = false, clients = [], products = [], quotes = [],
}: ArcaInvoiceModalProps) {
    const [step, setStep] = useState(1); // 1: Form, 2: Confirm, 3: Result
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);

    // Direct mode state
    const [dmClientId, setDmClientId] = useState<string>("");
    const [dmClientName, setDmClientName] = useState("");
    const [dmClientCuit, setDmClientCuit] = useState("");
    const [dmQuoteId, setDmQuoteId] = useState<string>("");
    const [autoNumber, setAutoNumber] = useState<number | null>(null);
    const [fetchingNumber, setFetchingNumber] = useState(false);

    // Installments state
    const [pendingInstallments, setPendingInstallments] = useState<any[]>([]);
    const [selectedInstallmentId, setSelectedInstallmentId] = useState<number | null>(null);
    const [installmentsLoading, setInstallmentsLoading] = useState(false);

    // CUIT Lookup state
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupResult, setLookupResult] = useState<any>(null);
    const [lookupError, setLookupError] = useState("");

    // Emitter config (auto-detected from ARCA config)
    const [emitterCondicionIva, setEmitterCondicionIva] = useState<number>(6); // Default Monotributo
    const [emitterRazonSocial, setEmitterRazonSocial] = useState("");
    const [emitterCuit, setEmitterCuit] = useState("");
    const [emitterDomicilio, setEmitterDomicilio] = useState("");
    const [emitterInicioActividades, setEmitterInicioActividades] = useState("");
    const [emitterPuntoVta, setEmitterPuntoVta] = useState<number>(2);
    const [configLoaded, setConfigLoaded] = useState(false);

    // Derived: allowed voucher types and IVA discrimination
    const allowedCbteTypes = getAllowedCbteTypes(emitterCondicionIva);
    const showIvaBreakdown = discriminatesIva(emitterCondicionIva);

    // Form state
    const [cbteTipo, setCbteTipo] = useState(11); // Default Factura C (Monotributo)
    const [concepto, setConcepto] = useState(1);
    const [tipoDoc, setTipoDoc] = useState(80); // CUIT
    const [nroDoc, setNroDoc] = useState(clientCuit || "");
    const [condicionIvaReceptor, setCondicionIvaReceptor] = useState(1);
    const [monId, setMonId] = useState("PES");
    const [monCotiz, setMonCotiz] = useState(1);
    const [fechaCbte, setFechaCbte] = useState(new Date().toISOString().split("T")[0]);
    const [fechaVencPago, setFechaVencPago] = useState(new Date().toISOString().split("T")[0]);
    const [fechaServDesde, setFechaServDesde] = useState("");
    const [fechaServHasta, setFechaServHasta] = useState("");

    // Associated invoice for NC/ND
    const [cbtAsocInvoiceId, setCbtAsocInvoiceId] = useState<string>("");
    const [arcaInvoices, setArcaInvoices] = useState<any[]>([]); // Invoices with CAE for NC association
    const isNCOrND = [3, 8, 13, 2, 7, 12].includes(cbteTipo);
    const isCreditNote = [3, 8, 13].includes(cbteTipo);

    // Line items (detalle del comprobante)
    const [lineItems, setLineItems] = useState<LineItem[]>([
        { codigo: "001", descripcion: "", unidad: "servicios", cantidad: 1, precio_unitario: directMode ? 0 : invoiceAmount, total: directMode ? 0 : invoiceAmount },
    ]);

    // IVA items (only used for Resp. Inscripto)
    const [ivaItems, setIvaItems] = useState<IvaItem[]>([
        { iva_id: 5, base_imp: (directMode ? 0 : invoiceAmount) / 1.21, importe: (directMode ? 0 : invoiceAmount) - (directMode ? 0 : invoiceAmount) / 1.21 },
    ]);

    // Line items total
    const lineItemsTotal = lineItems.reduce((s, i) => s + i.total, 0);

    // Calculated amounts
    const impNeto = showIvaBreakdown
        ? ivaItems.reduce((s, i) => s + i.base_imp, 0)
        : lineItemsTotal;
    const impIva = showIvaBreakdown
        ? ivaItems.reduce((s, i) => s + i.importe, 0)
        : 0;
    const impTotal = impNeto + impIva;

    // Line item helpers
    const addLineItem = () => {
        setLineItems([...lineItems, {
            codigo: String(lineItems.length + 1).padStart(3, "0"),
            descripcion: "",
            unidad: "servicios",
            cantidad: 1,
            precio_unitario: 0,
            total: 0,
            product_id: null,
        }]);
    };

    // Add a product from the catalog as a line item
    const addProductToLineItems = (productId: number) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        const price = Number(product.price) || 0;
        const newItem: LineItem = {
            codigo: String(lineItems.length + 1).padStart(3, "0"),
            descripcion: product.name,
            unidad: product.type === "service" ? "servicios" : product.type === "manpower" ? "horas" : "unidades",
            cantidad: 1,
            precio_unitario: price,
            total: price,
            product_id: product.id,
        };
        // If we have just the default empty row, replace it
        if (lineItems.length === 1 && !lineItems[0].descripcion && lineItems[0].precio_unitario === 0) {
            setLineItems([newItem]);
        } else {
            setLineItems([...lineItems, newItem]);
        }
        setShowProductPicker(false);
        setProductSearch("");
    };

    const [showProductPicker, setShowProductPicker] = useState(false);
    const [productSearch, setProductSearch] = useState("");
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.description?.toLowerCase().includes(productSearch.toLowerCase())
    );

    const removeLineItem = (idx: number) => {
        setLineItems(lineItems.filter((_, i) => i !== idx));
    };

    const updateLineItem = (idx: number, field: keyof LineItem, value: string | number) => {
        const items = [...lineItems];
        items[idx] = { ...items[idx], [field]: value };
        // Auto-calculate total
        if (field === "cantidad" || field === "precio_unitario") {
            items[idx].total = Number((items[idx].cantidad * items[idx].precio_unitario).toFixed(2));
        }
        setLineItems(items);
    };

    // Fetch ARCA config to detect emitter's IVA condition
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await api.get("/arca/config");
                const cfg = res.data;
                setEmitterCondicionIva(cfg.condicion_iva || 6);
                setEmitterRazonSocial(cfg.razon_social || "");
                setEmitterCuit(cfg.cuit || "");
                setEmitterDomicilio(cfg.domicilio_comercial || "");
                setEmitterInicioActividades(cfg.inicio_actividades || "");
                const pv = cfg.punto_vta || 2;
                setEmitterPuntoVta(pv);
                // Set default voucher type based on IVA condition
                const allowed = getAllowedCbteTypes(cfg.condicion_iva || 6);
                setCbteTipo(allowed[0]?.id || 11);
                setConfigLoaded(true);

                // Always fetch the next correlative number
                fetchNextNumber(pv, allowed[0]?.id || 11);
            } catch {
                setConfigLoaded(true); // proceed with defaults
                fetchNextNumber(2, 11);
            }
        };
        if (isOpen) fetchConfig();
    }, [isOpen]);

    // Fetch ARCA invoices for NC/ND association
    useEffect(() => {
        if (isNCOrND && isOpen) {
            const fetchArcaInvoices = async () => {
                try {
                    const res = await api.get('/invoices/');
                    const withCae = (res.data as any[]).filter((inv: any) => inv.cae && inv.type === 'issued');
                    setArcaInvoices(withCae);
                } catch (e) {
                    console.error('Failed to fetch ARCA invoices for NC', e);
                }
            };
            fetchArcaInvoices();
        }
    }, [isNCOrND, isOpen]);

    // Fetch next correlative number from ARCA
    const fetchNextNumber = async (ptoVta: number, cbteType: number) => {
        setFetchingNumber(true);
        try {
            const res = await api.get(`/arca/last-voucher/${ptoVta}/${cbteType}`);
            setAutoNumber((res.data.cbte_nro || 0) + 1);
        } catch {
            setAutoNumber(null);
        } finally {
            setFetchingNumber(false);
        }
    };

    // Re-fetch number when voucher type changes
    useEffect(() => {
        if (configLoaded) {
            fetchNextNumber(emitterPuntoVta, cbteTipo);
        }
    }, [cbteTipo, configLoaded]);

    // Auto-fetch next number when entering Step 2
    useEffect(() => {
        if (step === 2 && autoNumber === null && configLoaded && !fetchingNumber) {
            fetchNextNumber(emitterPuntoVta, cbteTipo);
        }
    }, [step]);

    // Map tax_condition text to ARCA IVA code
    const mapTaxConditionToCode = (taxCond: string | null | undefined): number | null => {
        if (!taxCond) return null;
        const lower = taxCond.toLowerCase().trim();
        if (lower.includes('responsable inscripto') && lower.includes('agente')) return 11;
        if (lower.includes('responsable inscripto')) return 1;
        if (lower.includes('exento')) return 4;
        if (lower.includes('consumidor final')) return 5;
        if (lower.includes('monotributo')) return 6;
        if (lower.includes('exterior') && lower.includes('proveedor')) return 8;
        if (lower.includes('exterior') && lower.includes('cliente')) return 9;
        if (lower.includes('liberado')) return 10;
        return null;
    };

    // In direct mode, set client info when dmClientId changes
    useEffect(() => {
        if (directMode && dmClientId) {
            const client = clients.find(c => c.id === Number(dmClientId));
            if (client) {
                setDmClientName(client.name);
                setDmClientCuit(client.cuit_dni || "");
                setNroDoc(client.cuit_dni?.replace(/-/g, "") || "");
                // Auto-set IVA condition from client's tax_condition
                const ivaCode = mapTaxConditionToCode((client as any).tax_condition);
                if (ivaCode !== null) {
                    setCondicionIvaReceptor(ivaCode);
                }
            }
        }
    }, [dmClientId, directMode, clients]);

    // Handle quote selection in direct mode
    const handleDmQuoteSelect = async (quoteId: string) => {
        setDmQuoteId(quoteId);
        setSelectedInstallmentId(null);
        setPendingInstallments([]);
        if (!quoteId) return;
        const quote = quotes.find(q => q.id === Number(quoteId));
        if (quote) {
            // Populate line items from quote items
            const newLineItems: LineItem[] = quote.items.map((qi, idx) => {
                const product = products.find(p => p.id === qi.product_id);
                return {
                    codigo: String(idx + 1).padStart(3, "0"),
                    descripcion: qi.description || product?.name || "",
                    unidad: "servicios",
                    cantidad: Number(qi.quantity),
                    precio_unitario: Number(qi.unit_price),
                    total: Number(qi.total_price),
                };
            });
            if (newLineItems.length > 0) {
                setLineItems(newLineItems);
            }
            if (quote.client_id && !dmClientId) {
                setDmClientId(String(quote.client_id));
            }

            // Fetch installments for this quote
            setInstallmentsLoading(true);
            try {
                const instRes = await api.get(`/quotes/${quoteId}/installments`);
                const pending = instRes.data.filter((i: any) => i.status === 'pending' || i.status === 'invoiced');
                setPendingInstallments(instRes.data);
            } catch (err) {
                console.error('Failed to fetch installments', err);
            } finally {
                setInstallmentsLoading(false);
            }
        }
    };

    // Handle installment selection
    const handleInstallmentSelect = (inst: any) => {
        if (selectedInstallmentId === inst.id) {
            setSelectedInstallmentId(null);
            // Reset to quote items
            if (dmQuoteId) {
                const quote = quotes.find(q => q.id === Number(dmQuoteId));
                if (quote && quote.items.length > 0) {
                    setLineItems(quote.items.map((qi, idx) => ({
                        codigo: String(idx + 1).padStart(3, "0"),
                        descripcion: qi.description || "",
                        unidad: "servicios",
                        cantidad: Number(qi.quantity),
                        precio_unitario: Number(qi.unit_price),
                        total: Number(qi.total_price),
                    })));
                }
            }
            return;
        }
        setSelectedInstallmentId(inst.id);
        const quote = quotes.find(q => q.id === Number(dmQuoteId));
        const qnum = quote?.quote_number || dmQuoteId;
        setLineItems([{
            codigo: "001",
            descripcion: `${qnum} — Cuota ${inst.installment_number} (Vto: ${new Date(inst.due_date).toLocaleDateString('es-AR')})`,
            unidad: "servicios",
            cantidad: 1,
            precio_unitario: Number(inst.amount),
            total: Number(inst.amount),
        }]);
    };

    useEffect(() => {
        setNroDoc(clientCuit || "");
    }, [clientCuit]);

    useEffect(() => {
        // Auto-calculate IVA when using default 21%
        if (ivaItems.length === 1 && ivaItems[0].iva_id === 5) {
            const baseImp = Number((invoiceAmount / 1.21).toFixed(2));
            const ivaAmt = Number((invoiceAmount - baseImp).toFixed(2));
            setIvaItems([{ iva_id: 5, base_imp: baseImp, importe: ivaAmt }]);
        }
    }, [invoiceAmount]);

    const addIvaItem = () => {
        setIvaItems([...ivaItems, { iva_id: 5, base_imp: 0, importe: 0 }]);
    };

    const removeIvaItem = (idx: number) => {
        setIvaItems(ivaItems.filter((_, i) => i !== idx));
    };

    const updateIvaItem = (idx: number, field: keyof IvaItem, value: number) => {
        const items = [...ivaItems];
        items[idx] = { ...items[idx], [field]: value };

        // Auto-calculate importe when base_imp or iva_id changes
        if (field === "base_imp" || field === "iva_id") {
            const rate = IVA_RATES.find((r) => r.id === items[idx].iva_id)?.rate || 0.21;
            items[idx].importe = Number((items[idx].base_imp * rate).toFixed(2));
        }

        setIvaItems(items);
    };

    // CUIT Lookup handler
    const handleCuitLookup = async (cuitToLookup?: string) => {
        const searchCuit = cuitToLookup || nroDoc || dmClientCuit;
        if (!searchCuit || searchCuit.replace(/-/g, '').length < 11) {
            setLookupError('Ingresá un CUIT válido de 11 dígitos');
            return;
        }
        setLookupLoading(true);
        setLookupError('');
        setLookupResult(null);
        try {
            const res = await api.get(`/arca/lookup-cuit/${searchCuit.replace(/-/g, '')}`);
            if (res.data.success) {
                setLookupResult(res.data);
                // Auto-fill condición IVA
                if (res.data.condicion_iva) {
                    setCondicionIvaReceptor(res.data.condicion_iva);
                }
                // Auto-fill client name in direct mode
                if (directMode && res.data.razon_social) {
                    setDmClientName(res.data.razon_social);
                }
            } else {
                setLookupError(res.data.error || 'No se encontró el CUIT');
            }
        } catch (err: any) {
            setLookupError(err.response?.data?.detail || 'Error consultando CUIT');
        } finally {
            setLookupLoading(false);
        }
    };

    const formatDate = (dateStr: string) => dateStr.replace(/-/g, "");

    const handleSubmit = async () => {
        // Validate NC/ND requires associated invoice
        if (isNCOrND && !cbtAsocInvoiceId) {
            alert('⚠️ Debe seleccionar un comprobante asociado para emitir una Nota de Crédito/Débito. Es un requisito legal obligatorio de ARCA.');
            return;
        }
        setSubmitting(true);
        try {
            // Determine effective values
            const effectiveInvoiceId = directMode ? 0 : invoiceId;

            const body: any = {
                invoice_id: effectiveInvoiceId || null,
                cbte_tipo: cbteTipo,
                concepto,
                tipo_doc: tipoDoc,
                nro_doc: (directMode ? dmClientCuit : nroDoc).replace(/-/g, ""),
                condicion_iva_receptor: condicionIvaReceptor,
                imp_neto: Number(impNeto.toFixed(2)),
                imp_iva: Number(impIva.toFixed(2)),
                imp_total: Number(impTotal.toFixed(2)),
                imp_tot_conc: 0,
                imp_op_ex: 0,
                imp_trib: 0,
                fecha_cbte: formatDate(fechaCbte),
                fecha_venc_pago: formatDate(fechaVencPago),
                mon_id: monId,
                mon_cotiz: monCotiz,
                ...(concepto >= 2 && {
                    fecha_serv_desde: formatDate(fechaServDesde),
                    fecha_serv_hasta: formatDate(fechaServHasta),
                }),
                // Associated invoice for NC/ND
                ...(isNCOrND && cbtAsocInvoiceId && (() => {
                    const asocInv = arcaInvoices.find(i => i.id === Number(cbtAsocInvoiceId));
                    if (asocInv) {
                        return {
                            cbte_asoc_tipo: asocInv.arca_cbte_tipo || 11,
                            cbte_asoc_pto_vta: asocInv.arca_punto_vta || emitterPuntoVta,
                            cbte_asoc_nro: asocInv.arca_cbte_nro || 0,
                            cbte_asoc_cuit: emitterCuit.replace(/-/g, ''),
                            cbte_asoc_fecha: asocInv.issue_date ? asocInv.issue_date.split('T')[0].replace(/-/g, '') : formatDate(fechaCbte),
                        };
                    }
                    return {};
                })()),
            };

            // Only include IVA items for Resp. Inscripto
            if (showIvaBreakdown) {
                body.iva_items = ivaItems.map((i) => ({
                    iva_id: i.iva_id,
                    base_imp: Number(i.base_imp.toFixed(2)),
                    importe: Number(i.importe.toFixed(2)),
                }));
            } else {
                body.iva_items = [];
            }

            // In direct mode, if invoice_id is 0, create the CRM invoice first
            if (directMode && (!effectiveInvoiceId || effectiveInvoiceId === 0)) {
                try {
                    const cbteName = ALL_CBTE_TYPES.find(c => c.id === cbteTipo)?.desc || "FC";
                    const ptoVtaStr = String(emitterPuntoVta).padStart(5, '0');
                    const nroStr = autoNumber ? String(autoNumber).padStart(8, '0') : String(Date.now()).slice(-8);
                    // Prefix with type code to avoid collision (NC, ND share different ARCA sequences)
                    const typePrefix = cbteTipo === 3 || cbteTipo === 8 || cbteTipo === 13 ? 'NC-'
                        : cbteTipo === 2 || cbteTipo === 7 || cbteTipo === 12 ? 'ND-' : '';
                    const invNumber = `${typePrefix}${ptoVtaStr}-${nroStr}`;
                    const invRes = await api.post("/invoices/", {
                        invoice_number: invNumber,
                        type: "issued",
                        client_id: dmClientId ? Number(dmClientId) : null,
                        quote_id: dmQuoteId ? Number(dmQuoteId) : null,
                        amount: Number(impTotal.toFixed(2)),
                        currency: monId === "PES" ? "ARS" : monId === "DOL" ? "USD" : "EUR",
                        issue_date: fechaCbte,
                        due_date: fechaVencPago,
                        notes: lineItems.map(li => li.descripcion).join(' | ') || `Generada desde ARCA - ${cbteName}`,
                        items: lineItems.map(li => ({
                            product_id: li.product_id || null,
                            description: li.descripcion,
                            quantity: li.cantidad,
                            unit_price: li.precio_unitario,
                            total_price: li.total,
                        })),
                    });
                    body.invoice_id = invRes.data.id;
                } catch (err: any) {
                    console.error("Failed to create CRM invoice for ARCA direct mode", err);
                    const detail = err.response?.data?.detail;
                    const errMsg = typeof detail === 'string' ? detail
                        : Array.isArray(detail) ? detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ')
                            : typeof detail === 'object' ? JSON.stringify(detail)
                                : "Error al crear la factura en el CRM";
                    setResult({
                        success: false,
                        errores: `Error al crear factura CRM: ${errMsg}`,
                        invoice_id: 0,
                    });
                    setStep(3);
                    return;
                }
            }

            const res = await api.post("/arca/emit", body);
            setResult(res.data);
            setStep(3);

            if (res.data.success) {
                // If an installment was selected, mark it as invoiced
                if (selectedInstallmentId) {
                    try {
                        await api.put(`/quotes/installments/${selectedInstallmentId}`, {
                            invoice_id: body.invoice_id || null,
                            status: 'invoiced',
                        });
                    } catch (linkErr) {
                        console.error('Failed to link installment to invoice', linkErr);
                    }
                }
                onSuccess();
            }
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            const errMsg = typeof detail === 'string' ? detail
                : Array.isArray(detail) ? detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ')
                    : typeof detail === 'object' ? JSON.stringify(detail)
                        : err.message || "Error de conexión con el servidor";
            setResult({
                success: false,
                errores: errMsg,
                invoice_id: invoiceId,
            });
            setStep(3);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setResult(null);
        onClose();
    };

    if (!isOpen) return null;

    const cbteName = ALL_CBTE_TYPES.find((c) => c.id === cbteTipo)?.desc || "";
    const cbteLetterObj = ALL_CBTE_TYPES.find((c) => c.id === cbteTipo);
    const cbteLetter = cbteLetterObj?.letter || "";

    // Effective client info for display
    const effectiveClientName = directMode ? dmClientName : clientName;

    // IVA condition label for the emitter
    const emitterIvaLabel = emitterCondicionIva === 6 ? "Monotributo"
        : emitterCondicionIva === 1 ? "Responsable Inscripto"
            : emitterCondicionIva === 4 ? "Exento"
                : emitterCondicionIva === 11 ? "Resp. Inscripto - Ag. Percepción"
                    : "Otro";

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 text-white flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Zap size={22} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">
                                    {step === 1 && (directMode ? "Generar Comprobante desde ARCA" : "Emitir Comprobante Electrónico")}
                                    {step === 2 && "Confirmar Emisión"}
                                    {step === 3 && (result?.success ? "¡Comprobante Emitido!" : "Error en Emisión")}
                                </h2>
                                <p className="text-blue-100 text-sm">
                                    {step < 3 && (directMode
                                        ? (effectiveClientName ? `Cliente: ${effectiveClientName}` : 'Seleccioná un cliente para continuar')
                                        : `Factura CRM: ${invoiceNumber} — ${clientName}`
                                    )}
                                    {step === 3 && result?.success && `CAE: ${result.cae}`}
                                </p>
                                {directMode && autoNumber && step < 3 && (
                                    <p className="text-blue-200 text-xs mt-0.5">Próximo Nº: {String(autoNumber).padStart(8, '0')}</p>
                                )}
                                {directMode && fetchingNumber && step < 3 && (
                                    <p className="text-blue-200 text-xs mt-0.5 flex items-center gap-1">
                                        <RefreshCw size={10} className="animate-spin" /> Consultando último número...
                                    </p>
                                )}
                            </div>
                        </div>
                        <button onClick={handleClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Step Indicator */}
                    <div className="flex items-center space-x-2 mt-4">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex items-center">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? "bg-white text-blue-600" : "bg-white/30 text-white/60"
                                    }`}>
                                    {s}
                                </div>
                                {s < 3 && <div className={`w-12 h-0.5 mx-1 ${step > s ? "bg-white" : "bg-white/30"}`} />}
                            </div>
                        ))}
                        <span className="text-xs text-blue-100 ml-2">
                            {step === 1 && "Datos del comprobante"}
                            {step === 2 && "Revisión final"}
                            {step === 3 && "Resultado"}
                        </span>
                    </div>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-6">
                    {/* STEP 1: Form */}
                    {step === 1 && (
                        <div className="space-y-6">
                            {/* Direct Mode: Client & Quote Selector */}
                            {directMode && (
                                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-4">
                                    <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center">
                                        <FileText size={14} className="mr-1.5" /> Cliente y Presupuesto
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Cliente *</label>
                                            <select
                                                value={dmClientId}
                                                onChange={(e) => setDmClientId(e.target.value)}
                                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                                                required
                                            >
                                                <option value="">Seleccionar cliente...</option>
                                                {clients.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}{c.cuit_dni ? ` (${c.cuit_dni})` : ''}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {dmClientId && (
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">Presupuesto Asociado (Opcional)</label>
                                                <select
                                                    value={dmQuoteId}
                                                    onChange={(e) => handleDmQuoteSelect(e.target.value)}
                                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                                                >
                                                    <option value="">— Sin presupuesto —</option>
                                                    {quotes
                                                        .filter(q => q.client_id === Number(dmClientId))
                                                        .map(q => (
                                                            <option key={q.id} value={q.id}>
                                                                {q.quote_number} — {q.status} — ${Number(q.total_amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })} {q.currency}
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Pending Installments */}
                                    {dmQuoteId && (
                                        <div className="mt-3">
                                            <label className="block text-xs text-indigo-700 font-semibold mb-2 flex items-center gap-1">
                                                <CreditCard size={12} /> Cuotas del Presupuesto
                                            </label>
                                            {installmentsLoading ? (
                                                <div className="text-xs text-gray-500 flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Cargando cuotas...</div>
                                            ) : pendingInstallments.length === 0 ? (
                                                <div className="text-xs text-gray-400 bg-white rounded-lg p-3 border border-dashed border-gray-200">Sin cuotas generadas para este presupuesto</div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {pendingInstallments.map(inst => {
                                                        const isPending = inst.status === 'pending';
                                                        const isSelected = selectedInstallmentId === inst.id;
                                                        const isOverdue = isPending && new Date(inst.due_date) < new Date();
                                                        return (
                                                            <button
                                                                key={inst.id}
                                                                type="button"
                                                                onClick={() => isPending && handleInstallmentSelect(inst)}
                                                                disabled={!isPending}
                                                                className={`text-left p-3 rounded-lg border-2 transition-all text-xs ${isSelected
                                                                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                                                                    : isPending
                                                                        ? 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer'
                                                                        : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-bold text-gray-900">Cuota {inst.installment_number}</span>
                                                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${inst.status === 'paid' ? 'bg-green-100 text-green-700'
                                                                        : inst.status === 'invoiced' ? 'bg-blue-100 text-blue-700'
                                                                            : isOverdue ? 'bg-red-100 text-red-600'
                                                                                : 'bg-amber-50 text-amber-700'
                                                                        }`}>
                                                                        {inst.status === 'paid' ? '✓ Pagada' : inst.status === 'invoiced' ? '✓ Facturada' : isOverdue ? '⚠ Vencida' : 'Pendiente'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between mt-1">
                                                                    <span className="text-gray-500 flex items-center gap-1"><Clock size={10} /> {new Date(inst.due_date).toLocaleDateString('es-AR')}</span>
                                                                    <span className="font-bold text-gray-900">${Number(inst.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                                                                </div>
                                                                {isSelected && <div className="mt-1.5 text-[10px] text-indigo-600 font-semibold">✓ Seleccionada — se usará como concepto</div>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Emitter IVA condition banner */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <CheckCircle2 size={16} className="text-blue-500" />
                                    <span className="text-sm text-blue-800">
                                        <strong>Emisor:</strong> {emitterRazonSocial || "—"} · <strong>{emitterIvaLabel}</strong>
                                    </span>
                                </div>
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                    Solo {cbteLetter || "C"}
                                </span>
                            </div>

                            {/* Tipo de Comprobante */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                                        Tipo de Comprobante
                                    </label>
                                    <select
                                        value={cbteTipo}
                                        onChange={(e) => setCbteTipo(parseInt(e.target.value))}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                    >
                                        {allowedCbteTypes.map((ct) => (
                                            <option key={ct.id} value={ct.id}>{ct.desc}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                                        Concepto
                                    </label>
                                    <select
                                        value={concepto}
                                        onChange={(e) => setConcepto(parseInt(e.target.value))}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                    >
                                        {CONCEPTO_TYPES.map((c) => (
                                            <option key={c.id} value={c.id}>{c.desc}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Associated Invoice for NC/ND */}
                            {isNCOrND && (
                                <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                                    <h4 className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-3 flex items-center">
                                        <FileText size={14} className="mr-1.5" /> Comprobante Asociado (Obligatorio)
                                    </h4>
                                    <p className="text-xs text-orange-600 mb-2">
                                        {isCreditNote ? 'Seleccioná la factura original que se desea anular/acreditar.' : 'Seleccioná el comprobante asociado.'}
                                    </p>
                                    <select
                                        value={cbtAsocInvoiceId}
                                        onChange={(e) => {
                                            setCbtAsocInvoiceId(e.target.value);
                                            // Auto-fill receptor data from associated invoice
                                            if (e.target.value) {
                                                const asocInv = arcaInvoices.find((i: any) => i.id === Number(e.target.value));
                                                if (asocInv) {
                                                    // Fill receptor CUIT/doc
                                                    if (asocInv.arca_nro_doc_receptor) {
                                                        setNroDoc(asocInv.arca_nro_doc_receptor);
                                                        if (directMode) setDmClientCuit(asocInv.arca_nro_doc_receptor);
                                                    }
                                                    if (asocInv.arca_tipo_doc_receptor) setTipoDoc(asocInv.arca_tipo_doc_receptor);
                                                    if (asocInv.arca_condicion_iva_receptor) setCondicionIvaReceptor(asocInv.arca_condicion_iva_receptor);
                                                    // Fill client
                                                    if (asocInv.client_id && directMode) setDmClientId(String(asocInv.client_id));
                                                    // Fill amounts from original invoice
                                                    const origAmount = Number(asocInv.amount) || 0;
                                                    setLineItems([{
                                                        codigo: '001',
                                                        descripcion: `Anulacion Factura ${asocInv.invoice_number}`,
                                                        unidad: 'servicios',
                                                        cantidad: 1,
                                                        precio_unitario: origAmount,
                                                        total: origAmount,
                                                        product_id: null,
                                                    }]);
                                                    // Fill concepto from original
                                                    if (asocInv.arca_concepto) setConcepto(asocInv.arca_concepto);
                                                }
                                            }
                                        }}
                                        className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white ${!cbtAsocInvoiceId ? 'border-red-400' : 'border-orange-300'}`}
                                    >
                                        <option value="">-- Seleccionar factura asociada --</option>
                                        {arcaInvoices.map((inv) => (
                                            <option key={inv.id} value={inv.id}>
                                                {inv.invoice_number} — ${Number(inv.amount).toLocaleString('es-AR')} — CAE: {inv.cae}
                                            </option>
                                        ))}
                                    </select>
                                    {isNCOrND && !cbtAsocInvoiceId && (
                                        <p className="text-xs text-red-600 mt-1 font-semibold">⚠️ OBLIGATORIO: Debe asociar un comprobante. Es un requisito legal de ARCA para emitir NC/ND.</p>
                                    )}
                                    {cbtAsocInvoiceId && (() => {
                                        const asocInv = arcaInvoices.find((i: any) => i.id === Number(cbtAsocInvoiceId));
                                        if (asocInv) {
                                            return (
                                                <div className="mt-2 p-2 bg-white rounded border border-orange-200 text-xs">
                                                    <p><strong>Factura asociada:</strong> {asocInv.invoice_number}</p>
                                                    <p><strong>Monto original:</strong> ${Number(asocInv.amount).toLocaleString('es-AR')}</p>
                                                    <p><strong>CAE:</strong> {asocInv.cae}</p>
                                                    <p><strong>Receptor:</strong> {asocInv.arca_nro_doc_receptor}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            )}

                            {/* Receptor */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center">
                                    <FileText size={14} className="mr-1.5" /> Datos del Receptor
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Tipo Documento</label>
                                        <select
                                            value={tipoDoc}
                                            onChange={(e) => setTipoDoc(parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                        >
                                            {DOC_TYPES.map((d) => (
                                                <option key={d.id} value={d.id}>{d.desc}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Nro. Documento</label>
                                        <div className="flex gap-1">
                                            <input
                                                type="text"
                                                value={nroDoc}
                                                onChange={(e) => setNroDoc(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' && tipoDoc === 80) handleCuitLookup(nroDoc); }}
                                                placeholder="20123456789"
                                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                                            />
                                            {tipoDoc === 80 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCuitLookup(nroDoc)}
                                                    disabled={lookupLoading}
                                                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                                    title="Buscar CUIT en AFIP"
                                                >
                                                    {lookupLoading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Condición IVA</label>
                                        <select
                                            value={condicionIvaReceptor}
                                            onChange={(e) => setCondicionIvaReceptor(parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                        >
                                            {IVA_CONDITIONS_RECEPTOR.map((c) => (
                                                <option key={c.id} value={c.id}>{c.desc}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* CUIT Lookup Result */}
                            {lookupResult && (
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 animate-fade-in">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 space-y-1">
                                            <p className="font-semibold text-green-900 text-sm">{lookupResult.razon_social}</p>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-green-800">
                                                <span><strong>CUIT:</strong> {lookupResult.cuit}</span>
                                                <span><strong>Condición IVA:</strong> {lookupResult.condicion_iva_desc}</span>
                                                {lookupResult.domicilio && (
                                                    <span className="col-span-2"><strong>Domicilio:</strong> {lookupResult.domicilio}</span>
                                                )}
                                                {lookupResult.actividad_principal && (
                                                    <span className="col-span-2"><strong>Actividad:</strong> {lookupResult.actividad_principal}</span>
                                                )}
                                                <span><strong>Tipo:</strong> {lookupResult.tipo_persona}</span>
                                            </div>
                                            <p className="text-xs text-green-600 mt-1 italic">✓ Condición IVA actualizada automáticamente</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {lookupError && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                                    <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                                    <p className="text-sm text-red-700">{lookupError}</p>
                                </div>
                            )}


                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Fecha Comprobante</label>
                                    <input type="date" value={fechaCbte} onChange={(e) => setFechaCbte(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Vto. Pago</label>
                                    <input type="date" value={fechaVencPago} onChange={(e) => setFechaVencPago(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                                </div>
                                {concepto >= 2 && (
                                    <>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Desde (Servicio)</label>
                                            <input type="date" value={fechaServDesde} onChange={(e) => setFechaServDesde(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Hasta (Servicio)</label>
                                            <input type="date" value={fechaServHasta} onChange={(e) => setFechaServHasta(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Currency */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Moneda</label>
                                    <select value={monId} onChange={(e) => setMonId(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                                        <option value="PES">ARS (Peso Argentino)</option>
                                        <option value="DOL">USD (Dólar)</option>
                                        <option value="060">EUR (Euro)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Cotización</label>
                                    <input type="number" step="0.001" value={monCotiz}
                                        onChange={(e) => setMonCotiz(parseFloat(e.target.value) || 1)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                                        disabled={monId === "PES"} />
                                </div>
                            </div>

                            {/* Line Items Detail */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 flex-wrap gap-2">
                                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center">
                                        <FileText size={14} className="mr-1.5" /> Detalle del Comprobante
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        {products.length > 0 && (
                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowProductPicker(!showProductPicker)}
                                                    className="flex items-center text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                                                >
                                                    <Plus size={12} className="mr-1" /> Agregar del Catálogo
                                                </button>
                                                {showProductPicker && (
                                                    <div className="absolute right-0 mt-1 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                                                        <div className="p-2 border-b border-gray-100">
                                                            <input
                                                                type="text"
                                                                value={productSearch}
                                                                onChange={(e) => setProductSearch(e.target.value)}
                                                                placeholder="Buscar producto o servicio..."
                                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <div className="max-h-48 overflow-y-auto">
                                                            {filteredProducts.length === 0 ? (
                                                                <p className="p-3 text-sm text-gray-400 text-center">No se encontraron productos</p>
                                                            ) : (
                                                                filteredProducts.map(p => (
                                                                    <button
                                                                        key={p.id}
                                                                        onClick={() => addProductToLineItems(p.id)}
                                                                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-green-50 transition-colors text-left border-b border-gray-50 last:border-0"
                                                                    >
                                                                        <div>
                                                                            <p className="text-sm font-medium text-gray-900">{p.name}</p>
                                                                            <p className="text-xs text-gray-400 capitalize">{p.type}</p>
                                                                        </div>
                                                                        <span className="text-sm font-mono font-semibold text-green-700">
                                                                            ${Number(p.price).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                                                        </span>
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <button onClick={addLineItem}
                                            className="flex items-center text-xs px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium">
                                            <Plus size={12} className="mr-1" /> Ítem Manual
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                                                <th className="px-3 py-2 text-left w-20">Código</th>
                                                <th className="px-3 py-2 text-left">Descripción</th>
                                                <th className="px-3 py-2 text-left w-24">Unidad</th>
                                                <th className="px-3 py-2 text-right w-20">Cant.</th>
                                                <th className="px-3 py-2 text-right w-28">P. Unitario</th>
                                                <th className="px-3 py-2 text-right w-28">Total</th>
                                                <th className="px-3 py-2 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {lineItems.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/50">
                                                    <td className="px-3 py-2">
                                                        <input type="text" value={item.codigo}
                                                            onChange={(e) => updateLineItem(idx, "codigo", e.target.value)}
                                                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm font-mono text-center" />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input type="text" value={item.descripcion}
                                                            onChange={(e) => updateLineItem(idx, "descripcion", e.target.value)}
                                                            placeholder="Descripción del servicio o producto"
                                                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <select value={item.unidad}
                                                            onChange={(e) => updateLineItem(idx, "unidad", e.target.value)}
                                                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white">
                                                            {UNIT_TYPES.map((u) => (
                                                                <option key={u} value={u}>{u}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input type="number" min="0" step="1" value={item.cantidad}
                                                            onChange={(e) => updateLineItem(idx, "cantidad", parseFloat(e.target.value) || 0)}
                                                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm font-mono text-right" />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input type="number" min="0" step="0.01" value={item.precio_unitario}
                                                            onChange={(e) => updateLineItem(idx, "precio_unitario", parseFloat(e.target.value) || 0)}
                                                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm font-mono text-right" />
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">
                                                        ${item.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        {lineItems.length > 1 && (
                                                            <button onClick={() => removeLineItem(idx)} className="p-1 text-red-400 hover:text-red-600">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-gray-50 font-semibold">
                                                <td colSpan={5} className="px-3 py-2.5 text-right text-sm text-gray-600 uppercase tracking-wide">
                                                    Subtotal
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-mono text-gray-900">
                                                    ${lineItemsTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* IVA Breakdown - only for Resp. Inscripto */}
                            {showIvaBreakdown ? (
                                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center">
                                            <Calculator size={14} className="mr-1.5" /> Desglose de IVA
                                        </h4>
                                        <button onClick={addIvaItem}
                                            className="flex items-center text-xs px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors font-medium">
                                            <Plus size={12} className="mr-1" /> Agregar Alícuota
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {ivaItems.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-indigo-100">
                                                <div className="flex-1">
                                                    <label className="block text-xs text-gray-500 mb-0.5">Alícuota</label>
                                                    <select value={item.iva_id}
                                                        onChange={(e) => updateIvaItem(idx, "iva_id", parseInt(e.target.value))}
                                                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white">
                                                        {IVA_RATES.map((r) => (
                                                            <option key={r.id} value={r.id}>{r.desc}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-xs text-gray-500 mb-0.5">Base Imponible</label>
                                                    <input type="number" step="0.01" value={item.base_imp}
                                                        onChange={(e) => updateIvaItem(idx, "base_imp", parseFloat(e.target.value) || 0)}
                                                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm font-mono" />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-xs text-gray-500 mb-0.5">Importe IVA</label>
                                                    <input type="number" step="0.01" value={item.importe}
                                                        onChange={(e) => updateIvaItem(idx, "importe", parseFloat(e.target.value) || 0)}
                                                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm font-mono bg-gray-50" readOnly />
                                                </div>
                                                {ivaItems.length > 1 && (
                                                    <button onClick={() => removeIvaItem(idx)} className="p-1.5 text-red-400 hover:text-red-600 mt-4">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Totals */}
                                    <div className="grid grid-cols-3 gap-3 mt-4">
                                        <div className="bg-white rounded-lg p-3 border border-indigo-100 text-center">
                                            <p className="text-xs text-gray-500">Neto Gravado</p>
                                            <p className="text-lg font-bold text-gray-900 font-mono">
                                                ${impNeto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div className="bg-white rounded-lg p-3 border border-indigo-100 text-center">
                                            <p className="text-xs text-gray-500">IVA</p>
                                            <p className="text-lg font-bold text-indigo-600 font-mono">
                                                ${impIva.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div className="bg-indigo-600 rounded-lg p-3 text-center">
                                            <p className="text-xs text-indigo-200">Total</p>
                                            <p className="text-lg font-bold text-white font-mono">
                                                ${impTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Monotributo / Exento - Simple total, no IVA */
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                                    <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3 flex items-center">
                                        <Calculator size={14} className="mr-1.5" /> Total del Comprobante
                                    </h4>
                                    <p className="text-xs text-green-600 mb-3">
                                        Como {emitterIvaLabel}, no se discrimina IVA. El total del comprobante es el monto de la factura.
                                    </p>
                                    <div className="bg-green-600 rounded-lg p-4 text-center">
                                        <p className="text-xs text-green-200">Total</p>
                                        <p className="text-2xl font-bold text-white font-mono">
                                            ${impTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: Confirm */}
                    {step === 2 && (
                        <div className="space-y-5">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3">
                                <AlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={20} />
                                <div>
                                    <h4 className="font-semibold text-amber-800 text-sm">Revisá los datos antes de confirmar</h4>
                                    <p className="text-amber-700 text-xs mt-1">
                                        Una vez emitido, el comprobante no se puede modificar. Solo podrás anularlo con una Nota de Crédito.
                                    </p>
                                </div>
                            </div>

                            {/* ── Invoice Preview (Argentina fiscal format) ── */}
                            <div className="bg-white rounded-xl border-2 border-gray-300 overflow-hidden shadow-sm">

                                {/* ── Top bar: Invoice type letter + number ── */}
                                <div className="flex items-stretch border-b-2 border-gray-300">
                                    {/* Left: Emitter info */}
                                    <div className="flex-1 p-4 border-r-2 border-gray-300">
                                        <p className="text-lg font-bold text-gray-900 uppercase">{emitterRazonSocial || '—'}</p>
                                        <div className="mt-2 space-y-0.5 text-xs text-gray-600">
                                            <p><span className="font-semibold text-gray-700">Razón Social:</span> {emitterRazonSocial || '—'}</p>
                                            <p><span className="font-semibold text-gray-700">Domicilio Comercial:</span> {emitterDomicilio || '—'}</p>
                                            <p><span className="font-semibold text-gray-700">Condición frente al IVA:</span> {emitterIvaLabel}</p>
                                        </div>
                                    </div>
                                    {/* Center: Invoice type letter */}
                                    <div className="flex flex-col items-center justify-center px-5 py-3 border-r-2 border-gray-300 bg-gray-50">
                                        <div className="w-14 h-14 border-2 border-gray-800 rounded-md flex items-center justify-center bg-white">
                                            <span className="text-3xl font-black text-gray-900">{cbteLetter || 'C'}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-1 text-center">CÓD. {String(cbteTipo).padStart(2, '0')}</p>
                                    </div>
                                    {/* Right: Number + date */}
                                    <div className="flex-1 p-4">
                                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">{cbteName}</p>
                                        <p className="text-xl font-bold text-gray-900 font-mono mt-1">
                                            Nº {String(emitterPuntoVta).padStart(5, '0')}-{autoNumber ? String(autoNumber).padStart(8, '0') : '--------'}
                                        </p>
                                        {fetchingNumber && (
                                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><RefreshCw size={10} className="animate-spin" /> Consultando...</p>
                                        )}
                                        <div className="mt-2 space-y-0.5 text-xs text-gray-600">
                                            <p><span className="font-semibold text-gray-700">Fecha de Emisión:</span> {fechaCbte}</p>
                                            <p><span className="font-semibold text-gray-700">CUIT:</span> {emitterCuit ? `${emitterCuit.slice(0, 2)}-${emitterCuit.slice(2, -1)}-${emitterCuit.slice(-1)}` : '—'}</p>
                                            <p><span className="font-semibold text-gray-700">Pto. de Venta:</span> {String(emitterPuntoVta).padStart(5, '0')}</p>
                                            {emitterInicioActividades && <p><span className="font-semibold text-gray-700">Inicio Actividades:</span> {emitterInicioActividades}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Receptor section ── */}
                                <div className="p-4 border-b-2 border-gray-300 bg-gray-50/50">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xs font-semibold text-gray-500 uppercase">CUIT/DNI:</span>
                                                <span className="text-sm font-bold text-gray-900 font-mono">{nroDoc || '—'}</span>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xs font-semibold text-gray-500 uppercase">Razón Social:</span>
                                                <span className="text-sm font-bold text-gray-900">{effectiveClientName || clientName || '—'}</span>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xs font-semibold text-gray-500 uppercase">Condición IVA:</span>
                                                <span className="text-sm text-gray-800">{IVA_CONDITIONS_RECEPTOR.find(c => c.id === condicionIvaReceptor)?.desc || '—'}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xs font-semibold text-gray-500 uppercase">Domicilio:</span>
                                                <span className="text-sm text-gray-800">
                                                    {directMode
                                                        ? (clients.find(c => c.id === Number(dmClientId))?.address || '—')
                                                        : '—'
                                                    }
                                                </span>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xs font-semibold text-gray-500 uppercase">Concepto:</span>
                                                <span className="text-sm text-gray-800">{CONCEPTO_TYPES.find(c => c.id === concepto)?.desc}</span>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xs font-semibold text-gray-500 uppercase">Moneda:</span>
                                                <span className="text-sm text-gray-800">{monId === 'PES' ? 'ARS - Peso Argentino' : monId === 'DOL' ? 'USD - Dólar' : 'EUR - Euro'} (Cot: {monCotiz})</span>
                                            </div>
                                            {fechaVencPago && (
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-xs font-semibold text-gray-500 uppercase">Vto. Pago:</span>
                                                    <span className="text-sm text-gray-800">{fechaVencPago}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Line items table ── */}
                                <div className="border-b-2 border-gray-300">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-gray-100 text-gray-600 uppercase text-[10px] tracking-wider">
                                                <th className="text-left px-3 py-2">Código</th>
                                                <th className="text-left px-3 py-2">Descripción</th>
                                                <th className="text-left px-3 py-2">Unidad</th>
                                                <th className="text-right px-3 py-2">Cantidad</th>
                                                <th className="text-right px-3 py-2">Precio Unit.</th>
                                                <th className="text-right px-3 py-2">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lineItems.map((item, idx) => (
                                                <tr key={idx} className="border-t border-gray-100">
                                                    <td className="px-3 py-1.5 font-mono text-gray-600">{item.codigo}</td>
                                                    <td className="px-3 py-1.5 font-medium text-gray-900">
                                                        <input
                                                            type="text"
                                                            value={item.descripcion}
                                                            onChange={(e) => updateLineItem(idx, "descripcion", e.target.value)}
                                                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:bg-white focus:outline-none px-1 py-0.5 rounded transition-colors text-xs"
                                                            placeholder="Descripción"
                                                        />
                                                        {selectedInstallmentId && idx === 0 && (
                                                            <span className="inline-flex items-center gap-1 text-[9px] text-indigo-600 mt-0.5"><CreditCard size={8} />Cuota vinculada</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-gray-600">{item.unidad}</td>
                                                    <td className="px-3 py-1.5 text-right font-mono">{item.cantidad}</td>
                                                    <td className="px-3 py-1.5 text-right font-mono">${item.precio_unitario.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                                    <td className="px-3 py-1.5 text-right font-mono font-semibold">${item.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* ── Totals section ── */}
                                <div className="p-4">
                                    <div className="flex justify-end">
                                        <div className="w-64 space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Importe Neto Gravado:</span>
                                                <span className="font-mono font-semibold">${impNeto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            {showIvaBreakdown && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">IVA:</span>
                                                    <span className="font-mono font-semibold text-indigo-600">${impIva.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Imp. No Gravado:</span>
                                                <span className="font-mono">$0,00</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Imp. Exento:</span>
                                                <span className="font-mono">$0,00</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Otros Tributos:</span>
                                                <span className="font-mono">$0,00</span>
                                            </div>
                                            <div className="border-t-2 border-gray-900 pt-2 mt-2 flex justify-between">
                                                <span className="text-base font-bold text-gray-900">Importe Total:</span>
                                                <span className="text-lg font-bold text-green-700 font-mono">${impTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Result */}
                    {step === 3 && result && (
                        <div className="text-center py-8">
                            {result.success ? (
                                <div className="space-y-6">
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                        <BadgeCheck size={44} className="text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900">Comprobante Autorizado</h3>
                                        <p className="text-gray-500 mt-1">El CAE fue otorgado exitosamente por ARCA</p>
                                    </div>

                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6 max-w-sm mx-auto">
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-xs text-green-600 font-medium uppercase tracking-wide">CAE</p>
                                                <p className="text-2xl font-bold text-green-800 font-mono tracking-wider">
                                                    {result.cae}
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 text-left">
                                                <div>
                                                    <p className="text-xs text-green-600">Vencimiento CAE</p>
                                                    <p className="font-semibold text-green-800 text-sm">{result.cae_vto}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-green-600">Nro. Comprobante</p>
                                                    <p className="font-semibold text-green-800 text-sm font-mono">{result.cbte_nro}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {result.observaciones && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-left max-w-md mx-auto">
                                            <p className="text-xs font-medium text-yellow-700">Observaciones:</p>
                                            <p className="text-sm text-yellow-800">{result.observaciones}</p>
                                        </div>
                                    )}

                                    {/* Download fiscal PDF button */}
                                    <button
                                        onClick={() => {
                                            const url = `${import.meta.env.VITE_API_URL || '/api/v1'}/arca/invoice-pdf/${result.invoice_id}`;
                                            window.open(url, '_blank');
                                        }}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg shadow-indigo-200 mx-auto"
                                    >
                                        <FileText size={18} />
                                        Descargar Factura PDF
                                        <span className="text-xs opacity-75">(Original + Duplicado + Triplicado)</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                                        <AlertTriangle size={44} className="text-red-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900">Comprobante Rechazado</h3>
                                        <p className="text-gray-500 mt-1">ARCA rechazó la solicitud</p>
                                    </div>
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-5 max-w-md mx-auto text-left">
                                        <p className="text-sm text-red-800 font-medium">Errores:</p>
                                        <p className="text-sm text-red-700 mt-1">{result.errores || result.observaciones || "Error desconocido"}</p>
                                        {typeof result.errores === 'string' && result.errores.toLowerCase().includes('computador no autorizado') && (
                                            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
                                                <p className="font-semibold text-amber-800">💡 Posibles causas:</p>
                                                <ul className="mt-1 space-y-1 text-amber-700 list-disc list-inside">
                                                    <li>El certificado digital no está asociado al punto de venta configurado</li>
                                                    <li>El ambiente (Producción/Homologación) no coincide con el certificado</li>
                                                    <li>El CUIT emisor no tiene habilitado el punto de venta en ARCA</li>
                                                    <li>El certificado expiró o fue revocado</li>
                                                </ul>
                                                <p className="mt-2 text-amber-800">Verificá la configuración en <strong>Configuración → ARCA</strong></p>
                                            </div>
                                        )}
                                        {typeof result.errores === 'string' && result.errores.toLowerCase().includes('token') && (
                                            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
                                                <p className="font-semibold text-amber-800">💡 Error de autenticación</p>
                                                <p className="mt-1 text-amber-700">El token de acceso expiró o es inválido. Intentá nuevamente en unos segundos.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 flex justify-between items-center flex-shrink-0 bg-gray-50">
                    {step === 1 && (
                        <>
                            <button onClick={handleClose} className="px-4 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-medium">
                                Cancelar
                            </button>
                            <button
                                onClick={() => setStep(2)}
                                disabled={!nroDoc}
                                className="flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-40"
                            >
                                Revisar y Confirmar <ArrowRight size={16} className="ml-2" />
                            </button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <button onClick={() => setStep(1)} className="px-4 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-medium">
                                ← Volver a Editar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex items-center px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-200 transition-all disabled:opacity-50"
                            >
                                {submitting ? (
                                    <>
                                        <RefreshCw size={16} className="mr-2 animate-spin" /> Emitiendo en ARCA...
                                    </>
                                ) : (
                                    <>
                                        <Zap size={16} className="mr-2" /> Emitir Comprobante
                                    </>
                                )}
                            </button>
                        </>
                    )}

                    {step === 3 && (
                        <div className="w-full flex justify-center">
                            <button
                                onClick={handleClose}
                                className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all"
                            >
                                Cerrar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
