// lib/transferencia.ts
// Datos de la cuenta donde se cobra la inscripcion. Viven en la tabla `eventos`
// (uno por edicion) y se editan en /admin/configuraciones.

export interface DatosTransferencia {
  banco: string
  alias: string
  cbu: string
  titular: string
  /** Aclaracion opcional que se muestra abajo de los datos. */
  nota?: string
}

export const DATOS_TRANSFERENCIA_VACIOS: DatosTransferencia = {
  banco: "",
  alias: "",
  cbu: "",
  titular: "",
  nota: "",
}

/** Armado desde una fila de `eventos` (los nombres de columna son otros). */
export function datosDesdeEvento(fila: Record<string, any> | null | undefined): DatosTransferencia {
  if (!fila) return DATOS_TRANSFERENCIA_VACIOS

  const datos: DatosTransferencia = {
    banco: fila.banco || "",
    alias: fila.alias_transferencia || "",
    cbu: fila.cbu || "",
    titular: fila.titular_cuenta || "",
    nota: fila.nota_transferencia || "",
  }

  // Respaldo para ediciones viejas, que solo tienen el texto libre.
  if (!datos.banco && !datos.cbu && !datos.titular && fila.datos_transferencia) {
    return { ...datos, ...parsearTextoLibre(fila.datos_transferencia) }
  }

  return datos
}

/**
 * Lee el formato viejo ("Banco: X\nCBU: Y\nNombre: Z"). Solo se usa como
 * respaldo: la fuente de verdad son las columnas separadas.
 */
export function parsearTextoLibre(texto: string): Partial<DatosTransferencia> {
  const buscar = (etiquetas: string[]): string => {
    for (const etiqueta of etiquetas) {
      const m = texto.match(new RegExp(`${etiqueta}\\s*:\\s*(.+)`, "i"))
      if (m?.[1]) return m[1].trim()
    }
    return ""
  }

  return {
    banco: buscar(["banco"]),
    alias: buscar(["alias"]),
    cbu: buscar(["cbu", "cvu"]),
    titular: buscar(["titular", "nombre"]),
  }
}

/** Texto para el boton "copiar todo" y para guardar en `datos_transferencia`. */
export function textoCompleto(datos: DatosTransferencia): string {
  return [
    datos.banco && `Banco: ${datos.banco}`,
    datos.alias && `Alias: ${datos.alias}`,
    datos.cbu && `CBU: ${datos.cbu}`,
    datos.titular && `Titular: ${datos.titular}`,
  ]
    .filter(Boolean)
    .join("\n")
}

/** True si hay al menos un dato cargado. */
export function tieneDatos(datos: DatosTransferencia): boolean {
  return Boolean(datos.banco || datos.alias || datos.cbu || datos.titular)
}

/** CBU en grupos de 4 para que se pueda leer y chequear de a pedazos. */
export function cbuLegible(cbu: string): string {
  const limpio = cbu.replace(/\s+/g, "")
  if (limpio.length < 8) return cbu
  return limpio.replace(/(.{4})/g, "$1 ").trim()
}
