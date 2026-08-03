"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSupabaseContext } from "@/components/providers/SupabaseProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Shirt,
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  Clock,
  Package,
  MapPin,
  Save,
  Loader2,
  FilterX,
  ExternalLink,
  Plus,
  Trash2,
  Settings2,
  XCircle,
  Truck,
  Navigation,
  BadgeCheck,
  Ruler,
  CreditCard,
  Tag,
  Star,
  Heart,
  Award,
  Users,
  ShieldCheck,
  Maximize2,
  Upload,
  ArrowUp,
  ArrowDown,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Remera, RemeraItem } from "@/types/database";
import { TALLES_DISPONIBLES } from "@/types/database";
import {
  REMERA_CONTENT_DEFAULTS,
  REMERA_ICON_OPTIONS,
  mergeRemeraContent,
  uid,
  type JerseyFeature,
  type RemeraContentData,
} from "@/lib/remeraContent";

// ─── Helpers ─────────────────────────────────────────────────────────────────

type RemeraItemConGenero = RemeraItem & { genero?: "hombre" | "mujer" };
type EstadoConfirmacion = "pendiente" | "confirmado" | "anulado";

type RemeraAdmin = Remera & {
  email?: string | null;
  estado_confirmacion?: EstadoConfirmacion | null;
  entregado?: boolean | null;
  entregado_at?: string | null;
  pais?: string | null;
  provincia?: string | null;
  provincia_id?: string | null;
  ciudad?: string | null;
  localidad_id?: string | null;
  barrio?: string | null;
  codigo_postal?: string | null;
  destino_envio?: "domicilio" | "correo" | null;
  sucursal_correo?: string | null;
  calle?: string | null;
  altura?: string | null;
  sin_numero?: boolean | null;
  piso?: string | null;
  departamento?: string | null;
  entre_calles?: string | null;
  lugar_entrega?: string | null;
  indicaciones_entrega?: string | null;
  latitud?: number | null;
  longitud?: number | null;
};

function obtenerEstadoConfirmacion(pedido: RemeraAdmin): EstadoConfirmacion {
  if (pedido.estado_confirmacion === "confirmado") return "confirmado";
  if (pedido.estado_confirmacion === "anulado") return "anulado";
  if (pedido.estado_confirmacion === "pendiente") return "pendiente";

  // Compatibilidad con pedidos anteriores a la migración:
  // `estado` solo admite "pendiente" o "entregado".
  return pedido.estado === "entregado" ? "confirmado" : "pendiente";
}

function pedidoEntregado(pedido: RemeraAdmin) {
  return Boolean(pedido.entregado ?? pedido.estado === "entregado");
}

function etiquetaEstado(estado: EstadoConfirmacion) {
  if (estado === "confirmado") return "Confirmado";
  if (estado === "anulado") return "Anulado";
  return "Pendiente";
}

function claseEstado(estado: EstadoConfirmacion) {
  if (estado === "confirmado") {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }
  if (estado === "anulado") {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }
  return "border-yellow-400/20 bg-yellow-400/10 text-yellow-300";
}

function formatItemLabel(item: RemeraItemConGenero, compacto = false) {
  const modelo =
    item.genero === "mujer"
      ? compacto
        ? "Muj"
        : "Mujer"
      : item.genero === "hombre"
        ? compacto
          ? "Hom"
          : "Hombre"
        : compacto
          ? "Sin mod."
          : "Modelo sin especificar";

  return `${modelo} - ${item.talle} ×${item.cantidad}`;
}

function ordenarTalles(talles: string[]) {
  const ordenBase = new Map(
    TALLES_DISPONIBLES.map((talle, indice) => [talle.toUpperCase(), indice]),
  );

  return [...talles].sort((a, b) => {
    const ordenA = ordenBase.get(a.toUpperCase());
    const ordenB = ordenBase.get(b.toUpperCase());

    if (ordenA !== undefined && ordenB !== undefined) return ordenA - ordenB;
    if (ordenA !== undefined) return -1;
    if (ordenB !== undefined) return 1;
    return a.localeCompare(b, "es", { numeric: true });
  });
}

function formatFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function obtenerRutaComprobante(url: string) {
  const urlLimpia = url.trim();
  const marcadores = [
    "/storage/v1/object/public/comprobantes/",
    "/storage/v1/object/sign/comprobantes/",
  ];

  for (const marcador of marcadores) {
    const indice = urlLimpia.indexOf(marcador);
    if (indice !== -1) {
      return decodeURIComponent(
        urlLimpia.slice(indice + marcador.length).split("?")[0],
      );
    }
  }

  return null;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminRemeraPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useSupabaseContext();
  const { toast } = useToast();

  const [pedidos, setPedidos] = useState<RemeraAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroTalle, setFiltroTalle] = useState("todos");
  const [filtroEnvio, setFiltroEnvio] = useState("todos");

  // Modal comprobante
  const [pedidoSeleccionado, setPedidoSeleccionado] =
    useState<RemeraAdmin | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);

  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null);
  const [comprobanteOpen, setComprobanteOpen] = useState(false);
  const [comprobanteLoading, setComprobanteLoading] = useState(false);
  const [comprobanteError, setComprobanteError] = useState<string | null>(null);

  // Contenido editorial de la sección (antes en /admin/content > tab Remera)
  const [contenido, setContenido] = useState<RemeraContentData>(REMERA_CONTENT_DEFAULTS);
  const [savingContenido, setSavingContenido] = useState(false);
  const [contenidoOpen, setContenidoOpen] = useState(false);
  const [nuevoTalle, setNuevoTalle] = useState("");
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [subiendoTablaTalles, setSubiendoTablaTalles] = useState(false);
  const imagenesInputRef = useRef<HTMLInputElement>(null);
  const tallaChartInputRef = useRef<HTMLInputElement>(null);

  const canAccess = ["admin", "superadmin", "owner", "remera"].includes(userRole ?? "");

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?returnUrl=/admin/remera");
    } else if (!authLoading && user && !canAccess) {
      router.push("/");
    }
  }, [authLoading, user, canAccess, router]);

  const fetchPedidos = async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    else setRefreshing(true);

    setLoadError(null);

    try {
      const { data, error } = await supabase
        .from("remera")
        .select("*")
        .order("fecha_solicitud", { ascending: false });

      if (error) {
        console.error("Error cargando pedidos de remera:", error);
        setPedidos([]);
        setLoadError(error.message);
        toast({
          title: "No se pudieron cargar las inscripciones de remera",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setPedidos((data as RemeraAdmin[]) ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      console.error("Error inesperado cargando pedidos de remera:", error);
      setPedidos([]);
      setLoadError(message);
      toast({
        title: "No se pudieron cargar las inscripciones de remera",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchContenido = async () => {
    const { data } = await supabase
      .from("content_settings")
      .select("data")
      .eq("id", "remera")
      .maybeSingle();
    setContenido(mergeRemeraContent(data?.data as Partial<RemeraContentData>));
  };

  const abrirComprobante = async (url: string) => {
    const urlLimpia = url.trim();

    setComprobanteOpen(true);
    setComprobanteLoading(true);
    setComprobanteError(null);
    setComprobanteUrl(null);

    const rutaStorage = obtenerRutaComprobante(urlLimpia);

    // Para buckets privados, crea una URL temporal segura.
    // Si no es una URL de Supabase reconocible, usa la URL original.
    if (rutaStorage) {
      const { data, error } = await supabase.storage
        .from("comprobantes")
        .createSignedUrl(rutaStorage, 60 * 60);

      if (data?.signedUrl && !error) {
        setComprobanteUrl(data.signedUrl);
        setComprobanteLoading(false);
        return;
      }

      console.warn("No se pudo crear la URL firmada del comprobante:", error);
    }

    setComprobanteUrl(urlLimpia);
    setComprobanteLoading(false);
  };

  useEffect(() => {
    if (!user || !canAccess) return;
    fetchPedidos();
    fetchContenido();
  }, [user, canAccess]);

  const actualizarPedidoLocal = (id: string, cambios: Partial<RemeraAdmin>) => {
    setPedidos((actuales) =>
      actuales.map((pedido) =>
        pedido.id === id ? { ...pedido, ...cambios } : pedido,
      ),
    );
    setPedidoSeleccionado((actual) =>
      actual?.id === id ? { ...actual, ...cambios } : actual,
    );
  };

  const actualizarEstadoConfirmacion = async (
    pedido: RemeraAdmin,
    nuevoEstado: EstadoConfirmacion,
  ) => {
    const entregado = nuevoEstado === "confirmado" ? pedidoEntregado(pedido) : false;
    const { error } = await supabase
      .from("remera")
      .update({
        estado_confirmacion: nuevoEstado,
        entregado,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pedido.id);

    if (error) {
      toast({
        title: "No se pudo actualizar la confirmación",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    actualizarPedidoLocal(pedido.id, {
      estado_confirmacion: nuevoEstado,
      entregado,
      estado: entregado ? "entregado" : "pendiente",
    });
    toast({ title: `Pedido ${etiquetaEstado(nuevoEstado).toLowerCase()}` });
  };

  const cambiarEntrega = async (pedido: RemeraAdmin) => {
    if (obtenerEstadoConfirmacion(pedido) !== "confirmado") {
      toast({
        title: "Primero confirmá el pedido",
        description: "Solo un pedido confirmado puede marcarse como entregado.",
        variant: "destructive",
      });
      return;
    }

    const entregado = !pedidoEntregado(pedido);
    const { error } = await supabase
      .from("remera")
      .update({
        entregado,
        entregado_at: entregado ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pedido.id);

    if (error) {
      toast({
        title: "No se pudo actualizar la entrega",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    actualizarPedidoLocal(pedido.id, {
      entregado,
      entregado_at: entregado ? new Date().toISOString() : null,
      estado: entregado ? "entregado" : "pendiente",
    });
    toast({
      title: entregado ? "Marcado como entregado" : "Entrega desmarcada",
    });
  };

  // Guardar contenido editorial completo de la sección
  const guardarContenido = async () => {
    setSavingContenido(true);
    const { error } = await supabase
      .from("content_settings")
      .upsert({
        id: "remera",
        data: contenido as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      });

    setSavingContenido(false);
    if (error) {
      toast({ title: "Error al guardar", variant: "destructive" });
      return;
    }
    toast({ title: "Contenido de la sección Remera guardado" });
  };

  const subirImagenAlServidor = async (file: File): Promise<string | null> => {
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch("/api/remera-content/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        toast({
          title: `No se pudo subir ${file.name}`,
          description: json?.error ?? "Error desconocido",
          variant: "destructive",
        });
        return null;
      }
      return json.url as string;
    } catch {
      toast({ title: `No se pudo subir ${file.name}`, description: "Error de red", variant: "destructive" });
      return null;
    }
  };

  // Sube una o más fotos de remera/diseño y las agrega al final de la lista.
  const subirImagenesRemera = async (files: FileList) => {
    setSubiendoImagen(true);
    const nuevas: string[] = [];
    for (const file of Array.from(files)) {
      const url = await subirImagenAlServidor(file);
      if (url) nuevas.push(url);
    }
    if (nuevas.length > 0) {
      setContenido((prev) => ({ ...prev, images: [...prev.images, ...nuevas] }));
      toast({ title: `${nuevas.length} imagen(es) subida(s)`, description: "Acordate de guardar los cambios." });
    }
    setSubiendoImagen(false);
  };

  const eliminarImagenRemera = (index: number) => {
    setContenido((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const moverImagenRemera = (index: number, delta: number) => {
    setContenido((prev) => {
      const destino = index + delta;
      if (destino < 0 || destino >= prev.images.length) return prev;
      const copia = [...prev.images];
      const [item] = copia.splice(index, 1);
      copia.splice(destino, 0, item);
      return { ...prev, images: copia };
    });
  };

  // Sube (y reemplaza) la foto de la tabla de talles.
  const subirTablaTalles = async (file: File) => {
    setSubiendoTablaTalles(true);
    const url = await subirImagenAlServidor(file);
    if (url) setContenido((prev) => ({ ...prev, sizeChartImageUrl: url }));
    setSubiendoTablaTalles(false);
  };

  const agregarFeature = () => {
    setContenido((prev) => ({
      ...prev,
      features: [...prev.features, { id: uid(), title: "", description: "", icon: "BadgeCheck" }],
    }));
  };

  const actualizarFeature = (id: string, campo: keyof JerseyFeature, valor: string) => {
    setContenido((prev) => ({
      ...prev,
      features: prev.features.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)),
    }));
  };

  const eliminarFeature = (id: string) => {
    setContenido((prev) => ({ ...prev, features: prev.features.filter((f) => f.id !== id) }));
  };

  const agregarTalle = () => {
    const talle = nuevoTalle.trim().toUpperCase();
    if (!talle || contenido.talles.includes(talle)) {
      setNuevoTalle("");
      return;
    }
    setContenido((prev) => ({ ...prev, talles: [...prev.talles, talle] }));
    setNuevoTalle("");
  };

  const eliminarTalle = (talle: string) => {
    setContenido((prev) => ({ ...prev, talles: prev.talles.filter((t) => t !== talle) }));
  };

  // Filtros aplicados
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const textoBusqueda = busqueda.toLowerCase();
      if (
        textoBusqueda &&
        !p.nombre.toLowerCase().includes(textoBusqueda) &&
        !p.dni.includes(textoBusqueda) &&
        !(p.telefono ?? "").includes(textoBusqueda) &&
        !(p.email ?? "").toLowerCase().includes(textoBusqueda)
      )
        return false;
      if (filtroEstado === "entregado" && !pedidoEntregado(p)) return false;
      if (
        filtroEstado !== "todos" &&
        filtroEstado !== "entregado" &&
        obtenerEstadoConfirmacion(p) !== filtroEstado
      )
        return false;
      if (
        filtroTalle !== "todos" &&
        !p.items.some((i) => i.talle === filtroTalle)
      )
        return false;
      if (filtroEnvio !== "todos" && p.envio_tipo !== filtroEnvio) return false;
      return true;
    });
  }, [pedidos, busqueda, filtroEstado, filtroTalle, filtroEnvio]);

  // Resumen por modelo y talle
  const resumenPorTalle = useMemo(() => {
    const totales = {
      hombre: {} as Record<string, number>,
      mujer: {} as Record<string, number>,
      sinEspecificar: {} as Record<string, number>,
    };

    pedidosFiltrados.forEach((pedido) => {
      (pedido.items as RemeraItemConGenero[]).forEach((item) => {
        const grupo =
          item.genero === "hombre"
            ? "hombre"
            : item.genero === "mujer"
              ? "mujer"
              : "sinEspecificar";

        totales[grupo][item.talle] =
          (totales[grupo][item.talle] ?? 0) + item.cantidad;
      });
    });

    return totales;
  }, [pedidosFiltrados]);

  const abrirDetalle = (pedido: RemeraAdmin) => {
    setPedidoSeleccionado(pedido);
    setDetalleOpen(true);
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroEstado("todos");
    setFiltroTalle("todos");
    setFiltroEnvio("todos");
  };

  const hayFiltros =
    busqueda ||
    filtroEstado !== "todos" ||
    filtroTalle !== "todos" ||
    filtroEnvio !== "todos";

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 px-3 py-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Shirt className="w-8 h-8 text-yellow-400" />
            <h1 className="text-2xl sm:text-3xl font-bold text-yellow-400">
              Remeras
            </h1>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setContenidoOpen(true)}
              className="min-w-0 border-yellow-400/30 px-2 text-yellow-400 hover:bg-yellow-400/10 sm:px-3"
            >
              <Settings2 className="w-4 h-4 mr-1.5" />
              Editar contenido
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPedidos(true)}
              disabled={refreshing}
              className="min-w-0 border-zinc-700 px-2 text-zinc-300 hover:bg-zinc-800 sm:px-3"
            >
              <RefreshCw
                className={`w-4 h-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Actualizar
            </Button>
          </div>
        </div>

        {/* ─── Stats generales ─── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <StatCard
            label="Total pedidos"
            value={pedidos.length}
            icon={<Package className="w-5 h-5" />}
          />
          <StatCard
            label="Pendientes"
            value={pedidos.filter((p) => obtenerEstadoConfirmacion(p) === "pendiente").length}
            icon={<Clock className="w-5 h-5" />}
            color="text-yellow-400"
          />
          <StatCard
            label="Confirmados"
            value={pedidos.filter((p) => obtenerEstadoConfirmacion(p) === "confirmado").length}
            icon={<CheckCircle className="w-5 h-5" />}
            color="text-blue-300"
          />
          <StatCard
            label="Entregados"
            value={pedidos.filter(pedidoEntregado).length}
            icon={<Truck className="w-5 h-5" />}
            color="text-green-400"
          />
          <StatCard
            label="Anulados"
            value={pedidos.filter((p) => obtenerEstadoConfirmacion(p) === "anulado").length}
            icon={<XCircle className="w-5 h-5" />}
            color="text-red-400"
          />
        </div>

        {/* ─── Resumen por modelo y talle ─── */}
        {(Object.keys(resumenPorTalle.hombre).length > 0 ||
          Object.keys(resumenPorTalle.mujer).length > 0 ||
          Object.keys(resumenPorTalle.sinEspecificar).length > 0) && (
          <Card className="overflow-hidden border-yellow-400/20 bg-zinc-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-yellow-400 sm:text-lg">
                Resumen por talle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ResumenTallesComparado
                hombre={resumenPorTalle.hombre}
                mujer={resumenPorTalle.mujer}
              />

              {Object.keys(resumenPorTalle.sinEspecificar).length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-black/20 px-3 py-2">
                  <span className="text-xs font-semibold text-zinc-400">
                    Sin modelo:
                  </span>
                  {ordenarTalles(
                    Object.keys(resumenPorTalle.sinEspecificar),
                  ).map((talle) => (
                    <span
                      key={talle}
                      className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
                    >
                      {talle}: {resumenPorTalle.sinEspecificar[talle]}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── Búsqueda y filtros ─── */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="space-y-2 p-3 sm:p-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar nombre, DNI, teléfono o email"
                className="h-10 border-zinc-700 bg-zinc-800 pl-9 text-white"
              />
            </div>

            <div className="hidden grid-cols-3 gap-2 md:grid">
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="h-9 border-zinc-700 bg-zinc-800 text-sm text-white">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-800">
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                  <SelectItem value="confirmado">Confirmados</SelectItem>
                  <SelectItem value="anulado">Anulados</SelectItem>
                  <SelectItem value="entregado">Entregados</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroTalle} onValueChange={setFiltroTalle}>
                <SelectTrigger className="h-9 border-zinc-700 bg-zinc-800 text-sm text-white">
                  <SelectValue placeholder="Talle" />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-800">
                  <SelectItem value="todos">Todos los talles</SelectItem>
                  {TALLES_DISPONIBLES.map((talle) => (
                    <SelectItem key={talle} value={talle}>
                      {talle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroEnvio} onValueChange={setFiltroEnvio}>
                <SelectTrigger className="h-9 border-zinc-700 bg-zinc-800 text-sm text-white">
                  <SelectValue placeholder="Entrega" />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-800">
                  <SelectItem value="todos">Todas las entregas</SelectItem>
                  <SelectItem value="retiro">Retiro en evento</SelectItem>
                  <SelectItem value="envio">Envío a domicilio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hayFiltros && (
              <Button
                variant="ghost"
                size="sm"
                onClick={limpiarFiltros}
                className="h-8 px-2 text-xs text-zinc-400 hover:text-white"
              >
                <FilterX className="mr-1.5 h-3.5 w-3.5" />
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ─── Pedidos: móvil y escritorio ─── */}
        <Card className="overflow-hidden bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-0">
            {pedidosFiltrados.length === 0 ? (
              <div className="px-4 py-12 text-center">
                {loadError ? (
                  <div className="mx-auto max-w-xl space-y-2">
                    <p className="font-medium text-red-400">
                      No se pudieron cargar las inscripciones de remera
                    </p>
                    <p className="break-words text-xs text-red-300/80">
                      {loadError}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchPedidos(true)}
                      disabled={refreshing}
                      className="mt-2 border-red-400/30 text-red-300 hover:bg-red-400/10"
                    >
                      <RefreshCw
                        className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                      />
                      Reintentar
                    </Button>
                  </div>
                ) : (
                  <span className="text-zinc-500">
                    No hay pedidos
                    {hayFiltros ? " que coincidan con los filtros" : ""}
                  </span>
                )}
              </div>
            ) : (
              <>
                {/* Vista móvil: tarjetas sin scroll horizontal */}
                <div className="divide-y divide-zinc-800 lg:hidden">
                  {pedidosFiltrados.map((pedido) => (
                    <article key={pedido.id} className="p-4">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                        <div className="min-w-0 space-y-3">
                          <div>
                            <p className="truncate font-semibold text-white">
                              {pedido.nombre}
                            </p>
                            <p className="text-xs text-zinc-500">
                              DNI {pedido.dni}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              <Badge className={claseEstado(obtenerEstadoConfirmacion(pedido))}>
                                {etiquetaEstado(obtenerEstadoConfirmacion(pedido))}
                              </Badge>
                              {pedidoEntregado(pedido) && (
                                <Badge className="border-green-500/20 bg-green-500/10 text-green-300">
                                  Entregado
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-2">
                            <div className="min-w-0 rounded-lg border border-zinc-800 bg-black/20 px-3 py-2">
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                Teléfono / email
                              </p>
                              <p className="truncate text-sm text-zinc-200">
                                {pedido.telefono ?? "—"}
                              </p>
                              <p className="break-all text-xs text-yellow-400">
                                {pedido.email ?? "Sin email"}
                              </p>
                            </div>

                            <div className="min-w-0 rounded-lg border border-zinc-800 bg-black/20 px-3 py-2">
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                Talle
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {(pedido.items as RemeraItemConGenero[]).map(
                                  (item, index) => (
                                    <span
                                      key={`${pedido.id}-${item.genero ?? "sin"}-${item.talle}-${index}`}
                                      className="rounded-md border border-yellow-400/20 bg-yellow-400/10 px-2 py-1 text-xs font-medium text-yellow-300"
                                    >
                                      {formatItemLabel(item, true)}
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirDetalle(pedido)}
                          title="Ver todos los detalles"
                          aria-label={`Ver detalles del pedido de ${pedido.nombre}`}
                          className="h-10 w-10 shrink-0 border border-zinc-700 text-zinc-300 hover:border-yellow-400/40 hover:bg-yellow-400/10 hover:text-yellow-400"
                        >
                          <Eye className="h-5 w-5" />
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Vista escritorio: tabla compacta */}
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-black/20 text-zinc-400">
                        <th className="text-left px-5 py-3 font-medium">
                          Nombre / DNI
                        </th>
                        <th className="text-left px-5 py-3 font-medium">
                          Teléfono / email
                        </th>
                        <th className="text-left px-5 py-3 font-medium">Talle</th>
                        <th className="w-24 text-center px-5 py-3 font-medium">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidosFiltrados.map((pedido) => (
                        <tr
                          key={pedido.id}
                          className="border-b border-zinc-800/60 transition-colors hover:bg-zinc-800/30"
                        >
                          <td className="px-5 py-4">
                            <p className="font-medium text-white">
                              {pedido.nombre}
                            </p>
                            <p className="text-xs text-zinc-500">
                              DNI {pedido.dni}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-zinc-200">
                              {pedido.telefono ?? "—"}
                            </p>
                            <p className="max-w-[280px] break-all text-xs text-yellow-400">
                              {pedido.email ?? "Sin email"}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex max-w-xl flex-wrap gap-2">
                              {(pedido.items as RemeraItemConGenero[]).map(
                                (item, index) => (
                                  <span
                                    key={`${pedido.id}-${item.genero ?? "sin"}-${item.talle}-${index}`}
                                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200"
                                  >
                                    {formatItemLabel(item)}
                                  </span>
                                ),
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => abrirDetalle(pedido)}
                              title="Ver todos los detalles"
                              aria-label={`Ver detalles del pedido de ${pedido.nombre}`}
                              className="h-9 w-9 border border-zinc-700 text-zinc-300 hover:border-yellow-400/40 hover:bg-yellow-400/10 hover:text-yellow-400"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {pedidosFiltrados.length > 0 && (
              <div className="border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500 sm:px-5">
                {pedidosFiltrados.length} pedido
                {pedidosFiltrados.length !== 1 ? "s" : ""}
                {hayFiltros && ` de ${pedidos.length} total`}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Modal: detalle completo del pedido ─── */}
      <Dialog open={detalleOpen} onOpenChange={setDetalleOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-yellow-400/20 bg-zinc-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">
              Detalle del pedido de remera
            </DialogTitle>
          </DialogHeader>

          {pedidoSeleccionado && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetalleCampo
                  etiqueta="Nombre y apellido"
                  valor={pedidoSeleccionado.nombre}
                />
                <DetalleCampo
                  etiqueta="DNI"
                  valor={pedidoSeleccionado.dni}
                />
                <DetalleCampo
                  etiqueta="Teléfono"
                  valor={pedidoSeleccionado.telefono ?? "—"}
                />
                <DetalleCampo
                  etiqueta="Email"
                  valor={pedidoSeleccionado.email ?? "Sin email registrado"}
                  breakAll
                />
              </div>

              <div className="rounded-xl border border-zinc-700 bg-black/20 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Remeras solicitadas
                </p>
                <div className="space-y-2">
                  {(pedidoSeleccionado.items as RemeraItemConGenero[]).map(
                    (item, index) => (
                      <div
                        key={`${pedidoSeleccionado.id}-detalle-${index}`}
                        className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2"
                      >
                        <span className="font-medium text-zinc-200">
                          {formatItemLabel(item).replace(
                            ` ×${item.cantidad}`,
                            "",
                          )}
                        </span>
                        <Badge className="border-yellow-400/20 bg-yellow-400/10 text-yellow-400">
                          Cantidad: {item.cantidad}
                        </Badge>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetalleCampo
                  etiqueta="Método de entrega"
                  valor={
                    pedidoSeleccionado.envio_tipo === "envio"
                      ? pedidoSeleccionado.destino_envio === "correo"
                        ? "Retiro en Correo Argentino"
                        : "Envío a domicilio"
                      : "Retiro en el evento"
                  }
                />
                <DetalleCampo
                  etiqueta="Fecha del pedido"
                  valor={formatFecha(pedidoSeleccionado.fecha_solicitud)}
                />
                <DetalleCampo
                  etiqueta="Inscripto al evento"
                  valor={pedidoSeleccionado.esta_registrado ? "Sí" : "No"}
                />
              </div>

              {pedidoSeleccionado.envio_tipo === "envio" && (
                <div className="space-y-3 rounded-xl border border-yellow-400/20 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {pedidoSeleccionado.destino_envio === "correo"
                          ? "Entrega en Correo Argentino"
                          : "Dirección completa de entrega"}
                      </p>
                      <p className="mt-1 text-sm font-medium text-white">
                        {pedidoSeleccionado.destino_envio === "correo"
                          ? pedidoSeleccionado.sucursal_correo ??
                            "Sucursal no informada"
                          : pedidoSeleccionado.calle
                            ? `${pedidoSeleccionado.calle} ${pedidoSeleccionado.sin_numero ? "S/N" : pedidoSeleccionado.altura ?? ""}`
                            : pedidoSeleccionado.direccion ?? "Sin dirección"}
                      </p>
                    </div>
                    {pedidoSeleccionado.latitud != null &&
                      pedidoSeleccionado.longitud != null && (
                        <a
                          href={`https://www.google.com/maps?q=${pedidoSeleccionado.latitud},${pedidoSeleccionado.longitud}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-yellow-400/30 px-3 py-2 text-xs font-medium text-yellow-400 hover:bg-yellow-400/10"
                        >
                          <Navigation className="h-4 w-4" />
                          Ver mapa
                        </a>
                      )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <DetalleCampo
                      etiqueta="Modalidad"
                      valor={
                        pedidoSeleccionado.destino_envio === "correo"
                          ? "Retiro en sucursal"
                          : "Entrega a domicilio"
                      }
                    />
                    <DetalleCampo
                      etiqueta="País"
                      valor={pedidoSeleccionado.pais ?? "Argentina"}
                    />
                    <DetalleCampo
                      etiqueta="Provincia"
                      valor={pedidoSeleccionado.provincia ?? "—"}
                    />
                    <DetalleCampo
                      etiqueta="Localidad"
                      valor={pedidoSeleccionado.ciudad ?? "—"}
                    />
                    <DetalleCampo
                      etiqueta="Código postal"
                      valor={pedidoSeleccionado.codigo_postal ?? "—"}
                    />
                    {pedidoSeleccionado.destino_envio === "correo" ? (
                      <DetalleCampo
                        etiqueta="Sucursal elegida"
                        valor={
                          pedidoSeleccionado.sucursal_correo ?? "No informada"
                        }
                      />
                    ) : (
                      <>
                        <DetalleCampo
                          etiqueta="Barrio"
                          valor={pedidoSeleccionado.barrio ?? "No informado"}
                        />
                        <DetalleCampo
                          etiqueta="Lugar de entrega"
                          valor={pedidoSeleccionado.lugar_entrega ?? "—"}
                        />
                        <DetalleCampo
                          etiqueta="Piso"
                          valor={pedidoSeleccionado.piso ?? "No corresponde"}
                        />
                        <DetalleCampo
                          etiqueta="Departamento"
                          valor={
                            pedidoSeleccionado.departamento ?? "No corresponde"
                          }
                        />
                        <DetalleCampo
                          etiqueta="Entre calles"
                          valor={
                            pedidoSeleccionado.entre_calles ?? "No informado"
                          }
                        />
                      </>
                    )}
                  </div>

                  {pedidoSeleccionado.destino_envio !== "correo" && (
                    <DetalleCampo
                      etiqueta="Indicaciones de entrega"
                      valor={
                        pedidoSeleccionado.indicaciones_entrega ??
                        "Sin indicaciones"
                      }
                    />
                  )}
                  {pedidoSeleccionado.latitud != null &&
                    pedidoSeleccionado.longitud != null && (
                      <p className="text-xs text-zinc-500">
                        Coordenadas: {pedidoSeleccionado.latitud},{" "}
                        {pedidoSeleccionado.longitud}
                      </p>
                    )}
                </div>
              )}

              <div className="space-y-4 rounded-xl border border-zinc-700 bg-black/20 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <Label className="text-zinc-300 mb-1.5 block">Confirmación del pedido</Label>
                    <Select
                      value={obtenerEstadoConfirmacion(pedidoSeleccionado)}
                      onValueChange={(value) =>
                        void actualizarEstadoConfirmacion(
                          pedidoSeleccionado,
                          value as EstadoConfirmacion,
                        )
                      }
                    >
                      <SelectTrigger className="border-zinc-700 bg-zinc-800 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-700 bg-zinc-800">
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="confirmado">Confirmado</SelectItem>
                        <SelectItem value="anulado">Anulado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">Entrega</p>
                        <p className="text-xs text-zinc-500">
                          {pedidoEntregado(pedidoSeleccionado)
                            ? "Pedido entregado"
                            : "Todavía no entregado"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void cambiarEntrega(pedidoSeleccionado)}
                        disabled={obtenerEstadoConfirmacion(pedidoSeleccionado) !== "confirmado"}
                        className={
                          pedidoEntregado(pedidoSeleccionado)
                            ? "bg-zinc-700 text-white hover:bg-zinc-600"
                            : "bg-green-500 text-black hover:bg-green-400"
                        }
                      >
                        {pedidoEntregado(pedidoSeleccionado) ? "Desmarcar" : "Marcar entregado"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={claseEstado(obtenerEstadoConfirmacion(pedidoSeleccionado))}>
                    {etiquetaEstado(obtenerEstadoConfirmacion(pedidoSeleccionado))}
                  </Badge>
                  <Badge
                    className={
                      pedidoEntregado(pedidoSeleccionado)
                        ? "border-green-500/20 bg-green-500/10 text-green-300"
                        : "border-zinc-700 bg-zinc-800 text-zinc-400"
                    }
                  >
                    {pedidoEntregado(pedidoSeleccionado) ? "Entregado" : "Sin entregar"}
                  </Badge>

                  {pedidoSeleccionado.comprobante_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        abrirComprobante(
                          pedidoSeleccionado.comprobante_url as string,
                        )
                      }
                      className="ml-auto border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver comprobante
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Modal: comprobante ─── */}
      <Dialog open={comprobanteOpen} onOpenChange={setComprobanteOpen}>
        <DialogContent className="bg-zinc-900 border-yellow-400/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">
              Comprobante de pago
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {comprobanteLoading && (
              <div className="h-64 flex items-center justify-center rounded border border-zinc-700 bg-black/20">
                <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
              </div>
            )}

            {!comprobanteLoading && comprobanteUrl && (
              <>
                {comprobanteUrl.toLowerCase().split("?")[0].endsWith(".pdf") ? (
                  <iframe
                    src={comprobanteUrl}
                    title="Comprobante de pago"
                    className="w-full h-96 rounded border border-zinc-700 bg-white"
                  />
                ) : (
                  <img
                    src={comprobanteUrl}
                    alt="Comprobante de pago"
                    className="w-full max-h-96 object-contain rounded border border-zinc-700 bg-white"
                    onLoad={() => setComprobanteError(null)}
                    onError={() =>
                      setComprobanteError(
                        "No se pudo mostrar la imagen. Abrila en una pestaña nueva o revisá los permisos del bucket comprobantes.",
                      )
                    }
                  />
                )}

                {comprobanteError && (
                  <p className="text-sm text-red-400 rounded border border-red-500/20 bg-red-500/10 p-3">
                    {comprobanteError}
                  </p>
                )}

                <a
                  href={comprobanteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-yellow-400 hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir en nueva pestaña
                </a>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: contenido de la sección remera ─── */}
      <Dialog open={contenidoOpen} onOpenChange={setContenidoOpen}>
        <DialogContent className="bg-zinc-900 border-yellow-400/20 w-[calc(100%-1.5rem)] sm:w-full max-w-[calc(100%-1.5rem)] sm:max-w-6xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">
              Editar contenido de /pedir-remera
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
            {/* ─── Columna de edición (pestañas) ─── */}
            <div className="min-w-0">
              <Tabs defaultValue="visibles" className="w-full">
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-zinc-800 p-1">
                  <TabsTrigger value="visibles" className="flex-1 min-w-[80px]">Textos</TabsTrigger>
                  <TabsTrigger value="precio" className="flex-1 min-w-[110px]">Alias y precio</TabsTrigger>
                  <TabsTrigger value="imagenes" className="flex-1 min-w-[90px]">Imágenes</TabsTrigger>
                  <TabsTrigger value="talles" className="flex-1 min-w-[80px]">Talles</TabsTrigger>
                </TabsList>

                {/* ── Datos visibles: lo que se ve en el home ── */}
                <TabsContent value="visibles" className="space-y-5 pt-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                    <div>
                      <p className="text-white font-medium text-sm">Mostrar sección en el sitio</p>
                      <p className="text-xs text-zinc-400">Si está desactivada, /pedir-remera no se accede desde el menú</p>
                    </div>
                    <Switch
                      checked={contenido.showSection}
                      onCheckedChange={(v) => setContenido((prev) => ({ ...prev, showSection: v }))}
                    />
                  </div>

                  <div>
                    <Label className="text-zinc-300 mb-1.5 block">Texto de la insignia (badge)</Label>
                    <Input
                      value={contenido.badgeText}
                      onChange={(e) => setContenido((p) => ({ ...p, badgeText: e.target.value }))}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="Merch oficial del evento"
                    />
                  </div>

                  <div>
                    <Label className="text-zinc-300 mb-1.5 block">Título de la sección</Label>
                    <Input
                      value={contenido.title}
                      onChange={(e) => setContenido((p) => ({ ...p, title: e.target.value }))}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="Remera Oficial"
                    />
                  </div>

                  <div>
                    <Label className="text-zinc-300 mb-1.5 block">Descripción general</Label>
                    <Textarea
                      value={contenido.description}
                      onChange={(e) => setContenido((p) => ({ ...p, description: e.target.value }))}
                      rows={3}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-zinc-300 mb-1.5 block">Características</Label>
                      <Button type="button" variant="outline" size="sm" onClick={agregarFeature} className="border-yellow-400/30 text-yellow-400">
                        <Plus className="w-4 h-4 mr-1" />Agregar
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {contenido.features.map((feat) => (
                        <div key={feat.id} className="flex flex-col sm:flex-row gap-2 sm:items-start p-2 rounded-lg bg-zinc-800/50 border border-zinc-700">
                          <div className="flex gap-2">
                            <Select
                              value={feat.icon ?? "BadgeCheck"}
                              onValueChange={(v) => actualizarFeature(feat.id, "icon", v)}
                            >
                              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white w-full sm:w-[120px] flex-shrink-0">
                                <SelectValue placeholder="Ícono" />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-800 border-zinc-700">
                                {REMERA_ICON_OPTIONS.map((iconName) => (
                                  <SelectItem key={iconName} value={iconName} className="text-white focus:bg-zinc-700">
                                    {iconName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button type="button" variant="ghost" size="icon" onClick={() => eliminarFeature(feat.id)} className="text-red-400 hover:bg-red-400/10 flex-shrink-0 sm:hidden">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input value={feat.title} onChange={(e) => actualizarFeature(feat.id, "title", e.target.value)} placeholder="Título" className="bg-zinc-800 border-zinc-700 text-white" />
                            <Input value={feat.description} onChange={(e) => actualizarFeature(feat.id, "description", e.target.value)} placeholder="Descripción" className="bg-zinc-800 border-zinc-700 text-white" />
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => eliminarFeature(feat.id)} className="text-red-400 hover:bg-red-400/10 flex-shrink-0 hidden sm:inline-flex">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* ── Alias y precio ── */}
                <TabsContent value="precio" className="space-y-5 pt-4">
                  <div>
                    <Label className="text-zinc-300 mb-1.5 block">Precio de la remera</Label>
                    <Input
                      value={contenido.price}
                      onChange={(e) => setContenido((p) => ({ ...p, price: e.target.value }))}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="$15.000"
                    />
                    <p className="text-xs text-zinc-500 mt-1">Se muestra afuera (público) y dentro del formulario de pedido.</p>
                  </div>

                  <div>
                    <Label className="text-zinc-300 mb-1.5 block">Datos de pago (alias, CBU, etc.)</Label>
                    <Textarea
                      value={contenido.aliasInfo}
                      onChange={(e) => setContenido((p) => ({ ...p, aliasInfo: e.target.value }))}
                      rows={4}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder={"Alias: grandteam.remera\nCBU: 0000000000000000000000\nTitular: Juan Pérez"}
                    />
                    <p className="text-xs text-zinc-500 mt-1">Aparece solo dentro del formulario público de pedido de remera.</p>
                  </div>
                </TabsContent>

                {/* ── Imágenes ── */}
                <TabsContent value="imagenes" className="space-y-6 pt-4">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <Label className="text-zinc-300">Imágenes de las remeras</Label>
                      <input
                        ref={imagenesInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.length) subirImagenesRemera(e.target.files);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => imagenesInputRef.current?.click()}
                        disabled={subiendoImagen}
                        className="bg-yellow-400 text-black hover:bg-yellow-500 font-semibold"
                      >
                        {subiendoImagen ? (
                          <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Subiendo...</>
                        ) : (
                          <><Upload className="w-4 h-4 mr-1.5" />Subir imagen</>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-zinc-500 mb-3">
                      Subí una foto por cada diseño/modelo de remera (hasta 6MB, JPG/PNG/WEBP/AVIF). La
                      primera es la que se muestra por defecto en el sitio.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {contenido.images.map((url, index) => (
                        <div
                          key={url + index}
                          className="group relative aspect-square rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Diseño ${index + 1}`} className="w-full h-full object-contain p-2" />
                          {index === 0 && (
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-yellow-400 text-black text-[10px] font-bold">
                              Principal
                            </span>
                          )}
                          <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 p-1 bg-black/70 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => moverImagenRemera(index, -1)}
                              disabled={index === 0}
                              aria-label="Mover antes"
                              className="h-7 w-7 text-zinc-200 hover:bg-white/10 disabled:opacity-30"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => moverImagenRemera(index, 1)}
                              disabled={index === contenido.images.length - 1}
                              aria-label="Mover después"
                              className="h-7 w-7 text-zinc-200 hover:bg-white/10 disabled:opacity-30"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => eliminarImagenRemera(index)}
                              aria-label="Eliminar imagen"
                              className="h-7 w-7 text-red-400 hover:bg-red-400/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {contenido.images.length === 0 && (
                        <p className="col-span-full text-zinc-500 text-sm py-6 text-center">
                          No hay imágenes cargadas todavía.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <Label className="text-zinc-300">Foto de la tabla de talles</Label>
                      <input
                        ref={tallaChartInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) subirTablaTalles(e.target.files[0]);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => tallaChartInputRef.current?.click()}
                        disabled={subiendoTablaTalles}
                        className="border-yellow-400/30 text-yellow-400"
                      >
                        {subiendoTablaTalles ? (
                          <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Subiendo...</>
                        ) : (
                          <><Upload className="w-4 h-4 mr-1.5" />{contenido.sizeChartImageUrl ? "Reemplazar" : "Subir foto"}</>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-zinc-500 mb-2">
                      Si hay una foto cargada, en el sitio público aparece un botón "Ver tabla de talles"
                      que la abre en un modal.
                    </p>
                    {contenido.sizeChartImageUrl && (
                      <div className="relative w-full max-w-[220px] rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={contenido.sizeChartImageUrl} alt="Tabla de talles" className="w-full h-auto" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setContenido((p) => ({ ...p, sizeChartImageUrl: "" }))}
                          aria-label="Quitar tabla de talles"
                          className="absolute top-1 right-1 h-7 w-7 bg-black/60 text-red-400 hover:bg-black/80"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ── Talles ── */}
                <TabsContent value="talles" className="space-y-3 pt-4">
                  <Label className="text-zinc-300 block">Talles disponibles</Label>
                  <div className="flex flex-wrap gap-2">
                    {contenido.talles.map((talle) => (
                      <span
                        key={talle}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm"
                      >
                        {talle}
                        <button
                          type="button"
                          onClick={() => eliminarTalle(talle)}
                          className="text-red-400 hover:text-red-300"
                          aria-label={`Quitar talle ${talle}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      value={nuevoTalle}
                      onChange={(e) => setNuevoTalle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          agregarTalle();
                        }
                      }}
                      placeholder="Ej: 6XL"
                      className="bg-zinc-800 border-zinc-700 text-white w-full sm:max-w-[160px]"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={agregarTalle} className="border-yellow-400/30 text-yellow-400">
                      <Plus className="w-4 h-4 mr-1" />Agregar talle
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              <Button
                onClick={guardarContenido}
                disabled={savingContenido}
                className="w-full mt-6 bg-yellow-400 text-black hover:bg-yellow-500 font-semibold"
              >
                {savingContenido ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Guardar cambios
              </Button>
            </div>

            {/* ─── Vista previa en vivo (solo en PC) ─── */}
            <div className="hidden self-start lg:block lg:sticky lg:top-0">
              <PreviewRemera contenido={contenido} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Íconos disponibles para las características (mismo set que la sección pública).
const REMERA_FEATURE_ICONS: Record<string, LucideIcon> = {
  BadgeCheck,
  Ruler,
  Truck,
  CreditCard,
  Shirt,
  Tag,
  Package,
  MapPin,
  CheckCircle,
  Star,
  Heart,
  Award,
  Clock,
  Users,
  ShieldCheck,
};

// Vista previa de la sección tal como la ve el cliente en /pedir-remera.
// Es una versión compacta (no interactiva) del componente RemeraSection.
function PreviewRemera({ contenido }: { contenido: RemeraContentData }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-black via-zinc-900 to-black p-5">
      <p className="mb-4 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Vista previa (como lo ve el cliente)
      </p>

      {/* Encabezado */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-medium mb-3">
          <Shirt className="w-3.5 h-3.5" />
          {contenido.badgeText}
        </span>
        <h2 className="text-2xl font-black text-white tracking-tight">
          {contenido.title}
        </h2>
        <p className="text-sm text-zinc-400 mt-2 max-w-md mx-auto">
          {contenido.description}
        </p>
        {contenido.price && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-lg font-bold text-yellow-400">
            <Tag className="w-4 h-4" />
            {contenido.price}
          </p>
        )}
      </div>

      {/* Imagen */}
      <div className="relative aspect-square max-w-[220px] mx-auto rounded-2xl bg-gradient-to-b from-zinc-800/60 to-zinc-900/60 border border-white/10 overflow-hidden shadow-2xl mb-6">
        {contenido.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL arbitraria del admin
          <img
            src={contenido.images[0]}
            alt={contenido.title}
            className="absolute inset-0 w-full h-full object-contain p-5"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs">
            Sin imagen
          </div>
        )}
        <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-yellow-400 text-black text-[10px] font-bold shadow-lg">
          Edición 2026
        </div>
      </div>

      {/* Características */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {contenido.features.map((feat) => {
          const Icon =
            (feat.icon && REMERA_FEATURE_ICONS[feat.icon]) || BadgeCheck;
          return (
            <div
              key={feat.id}
              className="p-3 rounded-xl bg-white/5 border border-white/10"
            >
              <div className="w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center mb-2">
                <Icon className="w-4 h-4 text-yellow-400" />
              </div>
              <h3 className="text-white font-semibold text-xs">{feat.title}</h3>
              <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                {feat.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Talles */}
      <div className="mb-4">
        <p className="text-zinc-300 font-semibold text-xs mb-2 flex items-center gap-1.5">
          <Ruler className="w-3.5 h-3.5 text-yellow-400" />
          Talles disponibles
        </p>
        <div className="flex flex-wrap gap-1.5">
          {contenido.talles.map((talle) => (
            <span
              key={talle}
              className="min-w-[2.5rem] text-center px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700 text-zinc-200 text-xs font-medium"
            >
              {talle}
            </span>
          ))}
        </div>
      </div>

      {contenido.sizeChartImageUrl && (
        <span className="inline-flex items-center gap-1.5 text-yellow-400 text-xs font-medium mb-4">
          <Maximize2 className="w-3.5 h-3.5" />
          Ver tabla de talles
        </span>
      )}

      {/* CTA (texto fijo, no editable) */}
      <div className="pt-2">
        <div className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 text-black font-bold text-sm px-6 h-11">
          <Shirt className="w-4 h-4" />
          Pedir mi remera
        </div>
      </div>
    </div>
  );
}

function ResumenTallesComparado({
  hombre,
  mujer,
}: {
  hombre: Record<string, number>;
  mujer: Record<string, number>;
}) {
  const talles = ordenarTalles(
    Array.from(new Set([...Object.keys(hombre), ...Object.keys(mujer)])),
  );

  return (
    <>
      {/* Celular: dos columnas verticales y alineadas por talle. */}
      <div className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950/60 md:hidden">
        <div className="grid grid-cols-2 border-b border-zinc-700 bg-zinc-900">
          <p className="px-3 py-2 text-center text-sm font-semibold text-white">
            Hombre
          </p>
          <p className="border-l border-zinc-700 px-3 py-2 text-center text-sm font-semibold text-white">
            Mujer
          </p>
        </div>
        {talles.map((talle) => (
          <div key={talle} className="grid grid-cols-2 border-b border-zinc-800 last:border-b-0">
            <ResumenCelda talle={talle} cantidad={hombre[talle]} />
            <ResumenCelda talle={talle} cantidad={mujer[talle]} divisoria />
          </div>
        ))}
      </div>

      {/* PC/tablet: cada modelo en una fila horizontal compacta. */}
      <div className="hidden grid-cols-2 gap-3 md:grid">
        <ResumenHorizontal titulo="Hombre" totales={hombre} />
        <ResumenHorizontal titulo="Mujer" totales={mujer} />
      </div>
    </>
  );
}

function ResumenCelda({
  talle,
  cantidad,
  divisoria = false,
}: {
  talle: string;
  cantidad?: number;
  divisoria?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 text-sm ${divisoria ? "border-l border-zinc-700" : ""}`}
    >
      <span className="font-medium text-zinc-300">{talle}</span>
      <span className={cantidad ? "font-bold text-yellow-400" : "text-zinc-700"}>
        {cantidad ?? "—"}
      </span>
    </div>
  );
}

function ResumenHorizontal({
  titulo,
  totales,
}: {
  titulo: "Hombre" | "Mujer";
  totales: Record<string, number>;
}) {
  const talles = ordenarTalles(Object.keys(totales));
  const total = Object.values(totales).reduce(
    (acumulado, cantidad) => acumulado + cantidad,
    0,
  );

  return (
    <section className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-semibold text-white">{titulo}</h3>
        <Badge className="border-yellow-400/20 bg-yellow-400/10 text-yellow-400">
          {total}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {talles.length > 0 ? (
          talles.map((talle) => (
            <span
              key={talle}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
            >
              <strong className="text-white">{talle}</strong>: {totales[talle]}
            </span>
          ))
        ) : (
          <span className="text-xs text-zinc-600">Sin pedidos</span>
        )}
      </div>
    </section>
  );
}

function DetalleCampo({
  etiqueta,
  valor,
  breakAll = false,
}: {
  etiqueta: string;
  valor: string;
  breakAll?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-800 bg-black/20 p-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {etiqueta}
      </p>
      <p className={`text-sm text-zinc-200 ${breakAll ? "break-all" : "break-words"}`}>
        {valor}
      </p>
    </div>
  );
}

// ─── Sub-componente StatCard ──────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color = "text-white",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={`text-yellow-400 ${color === "text-white" ? "" : color}`}
        >
          {icon}
        </div>
        <div>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}