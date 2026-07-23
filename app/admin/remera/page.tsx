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

function formatItems(items: RemeraItem[]) {
  return items.map((i) => `${i.talle}×${i.cantidad}`).join(", ");
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

  const [pedidos, setPedidos] = useState<Remera[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroTalle, setFiltroTalle] = useState("todos");
  const [filtroEnvio, setFiltroEnvio] = useState("todos");

  // Modal comprobante
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

      setPedidos((data as Remera[]) ?? []);
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
        !(p.telefono ?? "").includes(textoBusqueda)
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

  // Resumen por talle
  const resumenPorTalle = useMemo(() => {
    const totales: Record<string, number> = {};
    pedidosFiltrados.forEach((p) => {
      p.items.forEach((i) => {
        totales[i.talle] = (totales[i.talle] ?? 0) + i.cantidad;
      });
    });
    return totales;
  }, [pedidosFiltrados]);

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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setContenidoOpen(true)}
              className="border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
            >
              <Settings2 className="w-4 h-4 mr-1.5" />
              Editar contenido
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPedidos(true)}
              disabled={refreshing}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
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

        {/* ─── Resumen por talle ─── */}
        {Object.keys(resumenPorTalle).length > 0 && (
          <Card className="bg-zinc-900/50 border-yellow-400/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-yellow-400 text-base">
                Resumen por talle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {TALLES_DISPONIBLES.filter((t) => resumenPorTalle[t]).map(
                  (talle) => (
                    <div
                      key={talle}
                      className="px-3 py-1.5 bg-zinc-800 rounded-lg border border-zinc-700 text-center"
                    >
                      <span className="text-white font-semibold text-sm">
                        {talle}
                      </span>
                      <span className="text-yellow-400 text-sm ml-2">
                        ×{resumenPorTalle[talle]}
                      </span>
                    </div>
                  ),
                )}
              </div>
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

        {/* ─── Tabla ─── */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="text-left px-4 py-3 font-medium">
                      Nombre / DNI
                    </th>
                    <th className="text-left px-4 py-3 font-medium">
                      Teléfono
                    </th>
                    <th className="text-left px-4 py-3 font-medium">Talles</th>
                    <th className="text-left px-4 py-3 font-medium">Entrega</th>
                    <th className="text-left px-4 py-3 font-medium">
                      Inscripto
                    </th>
                    <th className="text-left px-4 py-3 font-medium">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium">Estado</th>
                    <th className="text-right px-4 py-3 font-medium">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center">
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
                      </td>
                    </tr>
                  ) : (
                    pedidosFiltrados.map((pedido) => (
                      <tr
                        key={pedido.id}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="text-white font-medium">
                            {pedido.nombre}
                          </p>
                          <p className="text-zinc-500 text-xs">{pedido.dni}</p>
                        </td>
                        <td className="px-4 py-3 text-zinc-300">
                          {pedido.telefono ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">
                          {formatItems(pedido.items)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-zinc-300">
                            {pedido.envio_tipo === "envio" ? (
                              <>
                                <MapPin className="w-3 h-3 text-yellow-400" />
                                <span className="text-xs">
                                  Envío
                                  {pedido.direccion && (
                                    <span className="text-zinc-500 block">
                                      {pedido.direccion}
                                    </span>
                                  )}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs">Retiro</span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {pedido.esta_registrado ? (
                            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                              Sí
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-zinc-500 border-zinc-700 text-xs"
                            >
                              No
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                          {formatFecha(pedido.fecha_solicitud)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              pedido.estado === "entregado"
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : "bg-yellow-400/10 text-yellow-400 border-yellow-400/20"
                            }
                          >
                            {pedido.estado === "entregado"
                              ? "Entregado"
                              : "Pendiente"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {pedido.comprobante_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  abrirComprobante(pedido.comprobante_url!)
                                }
                                title="Ver comprobante"
                                className="h-8 w-8 text-zinc-400 hover:text-yellow-400"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleEstado(pedido)}
                              className={`h-8 text-xs ${
                                pedido.estado === "pendiente"
                                  ? "text-green-400 hover:bg-green-400/10"
                                  : "text-zinc-400 hover:bg-zinc-700"
                              }`}
                            >
                              {pedido.estado === "pendiente" ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                  Entregar
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5 mr-1" />
                                  Revertir
                                </>
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pedidosFiltrados.length > 0 && (
              <div className="px-4 py-3 border-t border-zinc-800 text-xs text-zinc-500">
                {pedidosFiltrados.length} pedido
                {pedidosFiltrados.length !== 1 ? "s" : ""}
                {hayFiltros && ` de ${pedidos.length} total`}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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