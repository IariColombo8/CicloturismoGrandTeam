"use client";

import { useEffect, useState, useMemo } from "react";
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
type RemeraConEmail = Remera & { email?: string | null };

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

  const [pedidos, setPedidos] = useState<RemeraConEmail[]>([]);
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
    useState<RemeraConEmail | null>(null);
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

      setPedidos((data as RemeraConEmail[]) ?? []);
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

  // Cambiar estado del pedido
  const toggleEstado = async (pedido: Remera) => {
    const nuevoEstado =
      pedido.estado === "pendiente" ? "entregado" : "pendiente";
    const { error } = await supabase
      .from("remera")
      .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
      .eq("id", pedido.id);

    if (error) {
      toast({ title: "Error al actualizar el estado", variant: "destructive" });
      return;
    }

    setPedidos((prev) =>
      prev.map((p) => (p.id === pedido.id ? { ...p, estado: nuevoEstado } : p)),
    );
    toast({
      title:
        nuevoEstado === "entregado"
          ? "Marcado como entregado"
          : "Revertido a pendiente",
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
      if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false;
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

  const abrirDetalle = (pedido: RemeraConEmail) => {
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Total pedidos"
            value={pedidos.length}
            icon={<Package className="w-5 h-5" />}
          />
          <StatCard
            label="Pendientes"
            value={pedidos.filter((p) => p.estado === "pendiente").length}
            icon={<Clock className="w-5 h-5" />}
            color="text-yellow-400"
          />
          <StatCard
            label="Entregados"
            value={pedidos.filter((p) => p.estado === "entregado").length}
            icon={<CheckCircle className="w-5 h-5" />}
            color="text-green-400"
          />
          <StatCard
            label="Con envío"
            value={pedidos.filter((p) => p.envio_tipo === "envio").length}
            icon={<MapPin className="w-5 h-5" />}
          />
        </div>

        {/* ─── Resumen por modelo y talle ─── */}
        {(Object.keys(resumenPorTalle.hombre).length > 0 ||
          Object.keys(resumenPorTalle.mujer).length > 0 ||
          Object.keys(resumenPorTalle.sinEspecificar).length > 0) && (
          <Card className="overflow-hidden bg-zinc-900/60 border-yellow-400/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-yellow-400 text-base sm:text-lg">
                Resumen por talle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ResumenModelo
                  titulo="Hombre"
                  totales={resumenPorTalle.hombre}
                />
                <ResumenModelo
                  titulo="Mujer"
                  totales={resumenPorTalle.mujer}
                />
              </div>

              {Object.keys(resumenPorTalle.sinEspecificar).length > 0 && (
                <div className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-4">
                  <p className="mb-3 text-sm font-semibold text-zinc-300">
                    Pedidos anteriores sin modelo especificado
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                    {ordenarTalles(
                      Object.keys(resumenPorTalle.sinEspecificar),
                    ).map((talle) => (
                      <div
                        key={talle}
                        className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2"
                      >
                        <span className="font-medium text-zinc-200">{talle}</span>
                        <span className="font-bold text-yellow-400">
                          {resumenPorTalle.sinEspecificar[talle]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── Filtros ─── */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar nombre, DNI, tel..."
                  className="pl-9 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="entregado">Entregado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroTalle} onValueChange={setFiltroTalle}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Talle" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="todos">Todos los talles</SelectItem>
                  {TALLES_DISPONIBLES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroEnvio} onValueChange={setFiltroEnvio}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Entrega" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
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
                className="mt-2 text-zinc-400 hover:text-white"
              >
                <FilterX className="w-4 h-4 mr-1.5" />
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
                      ? "Envío a domicilio"
                      : "Retiro en el evento"
                  }
                />
                <DetalleCampo
                  etiqueta="Dirección"
                  valor={pedidoSeleccionado.direccion ?? "No corresponde"}
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

              <div className="flex flex-col gap-3 rounded-xl border border-zinc-700 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Estado
                  </p>
                  <Badge
                    className={`mt-2 ${
                      pedidoSeleccionado.estado === "entregado"
                        ? "border-green-500/20 bg-green-500/10 text-green-400"
                        : "border-yellow-400/20 bg-yellow-400/10 text-yellow-400"
                    }`}
                  >
                    {pedidoSeleccionado.estado === "entregado"
                      ? "Entregado"
                      : "Pendiente"}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  {pedidoSeleccionado.comprobante_url && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        abrirComprobante(
                          pedidoSeleccionado.comprobante_url as string,
                        )
                      }
                      className="border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver comprobante
                    </Button>
                  )}

                  <Button
                    type="button"
                    onClick={() => {
                      toggleEstado(pedidoSeleccionado);
                      setPedidoSeleccionado((actual) =>
                        actual
                          ? {
                              ...actual,
                              estado:
                                actual.estado === "pendiente"
                                  ? "entregado"
                                  : "pendiente",
                            }
                          : actual,
                      );
                    }}
                    className={
                      pedidoSeleccionado.estado === "pendiente"
                        ? "bg-green-500 text-black hover:bg-green-400"
                        : "bg-zinc-700 text-white hover:bg-zinc-600"
                    }
                  >
                    {pedidoSeleccionado.estado === "pendiente" ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Marcar entregado
                      </>
                    ) : (
                      <>
                        <Clock className="mr-2 h-4 w-4" />
                        Volver a pendiente
                      </>
                    )}
                  </Button>
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
        <DialogContent className="bg-zinc-900 border-yellow-400/20 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">
              Editar contenido de /pedir-remera
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
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
              <Label className="text-zinc-300">Texto de la insignia (badge)</Label>
              <Input
                value={contenido.badgeText}
                onChange={(e) => setContenido((p) => ({ ...p, badgeText: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 text-white"
                placeholder="Merch oficial del evento"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-300">Título de la sección</Label>
                <Input
                  value={contenido.title}
                  onChange={(e) => setContenido((p) => ({ ...p, title: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="Remera Oficial"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Precio de la remera</Label>
                <Input
                  value={contenido.price}
                  onChange={(e) => setContenido((p) => ({ ...p, price: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="$15.000"
                />
                <p className="text-xs text-zinc-500 mt-1">Se muestra afuera (público) y dentro del formulario de pedido.</p>
              </div>
            </div>

            <div>
              <Label className="text-zinc-300">URL de la imagen de la remera</Label>
              <Input
                value={contenido.imageUrl}
                onChange={(e) => setContenido((p) => ({ ...p, imageUrl: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 text-white"
                placeholder="https://..."
              />
            </div>

            <div>
              <Label className="text-zinc-300">Descripción general</Label>
              <Textarea
                value={contenido.description}
                onChange={(e) => setContenido((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div>
              <Label className="text-zinc-300 block mb-2">Talles disponibles</Label>
              <div className="flex flex-wrap gap-2 mb-2">
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
              <div className="flex gap-2">
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
                  className="bg-zinc-800 border-zinc-700 text-white max-w-[160px]"
                />
                <Button type="button" variant="outline" size="sm" onClick={agregarTalle} className="border-yellow-400/30 text-yellow-400">
                  <Plus className="w-4 h-4 mr-1" />Agregar talle
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-zinc-300">URL de la foto de la tabla de talles</Label>
              <Input
                value={contenido.sizeChartImageUrl}
                onChange={(e) => setContenido((p) => ({ ...p, sizeChartImageUrl: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 text-white"
                placeholder="https://..."
              />
              <p className="text-xs text-zinc-500 mt-1">
                Si se completa, en el sitio público aparece un botón "Ver tabla de talles" que abre esta foto en un modal.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-300">Título del CTA</Label>
                <Input
                  value={contenido.callToActionTitle}
                  onChange={(e) => setContenido((p) => ({ ...p, callToActionTitle: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Descripción del CTA</Label>
                <Input
                  value={contenido.callToActionDescription}
                  onChange={(e) => setContenido((p) => ({ ...p, callToActionDescription: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-zinc-300">Datos de pago (alias, CBU, etc.)</Label>
              <Textarea
                value={contenido.aliasInfo}
                onChange={(e) => setContenido((p) => ({ ...p, aliasInfo: e.target.value }))}
                rows={4}
                className="bg-zinc-800 border-zinc-700 text-white"
                placeholder={"Alias: grandteam.remera\nCBU: 0000000000000000000000\nTitular: Juan Pérez"}
              />
              <p className="text-xs text-zinc-500 mt-1">Aparece solo dentro del formulario público de pedido de remera.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-zinc-300">Características</Label>
                <Button type="button" variant="outline" size="sm" onClick={agregarFeature} className="border-yellow-400/30 text-yellow-400">
                  <Plus className="w-4 h-4 mr-1" />Agregar
                </Button>
              </div>
              <div className="space-y-2">
                {contenido.features.map((feat) => (
                  <div key={feat.id} className="flex gap-2 items-start p-2 rounded-lg bg-zinc-800/50 border border-zinc-700">
                    <Select
                      value={feat.icon ?? "BadgeCheck"}
                      onValueChange={(v) => actualizarFeature(feat.id, "icon", v)}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white w-[120px] flex-shrink-0">
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
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input value={feat.title} onChange={(e) => actualizarFeature(feat.id, "title", e.target.value)} placeholder="Título" className="bg-zinc-800 border-zinc-700 text-white" />
                      <Input value={feat.description} onChange={(e) => actualizarFeature(feat.id, "description", e.target.value)} placeholder="Descripción" className="bg-zinc-800 border-zinc-700 text-white" />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => eliminarFeature(feat.id)} className="text-red-400 hover:bg-red-400/10 flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={guardarContenido}
              disabled={savingContenido}
              className="w-full bg-yellow-400 text-black hover:bg-yellow-500 font-semibold"
            >
              {savingContenido ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResumenModelo({
  titulo,
  totales,
}: {
  titulo: "Hombre" | "Mujer";
  totales: Record<string, number>;
}) {
  const talles = ordenarTalles(Object.keys(totales));

  return (
    <section className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-white">{titulo}</h3>
        <Badge className="border-yellow-400/20 bg-yellow-400/10 text-yellow-400">
          {Object.values(totales).reduce((total, cantidad) => total + cantidad, 0)}
        </Badge>
      </div>

      {talles.length > 0 ? (
        <div className="space-y-2">
          {talles.map((talle) => (
            <div
              key={talle}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2"
            >
              <span className="font-medium text-zinc-200">{talle}</span>
              <span className="font-bold text-yellow-400">{totales[talle]}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-5 text-center text-sm text-zinc-500">
          Sin pedidos
        </p>
      )}
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