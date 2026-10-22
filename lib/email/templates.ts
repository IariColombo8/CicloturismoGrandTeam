// lib/email/templates.ts
// Plantillas HTML de los emails transaccionales, versionadas en el repo.
// Antes vivian en EmailJS; ahora se renderizan aca y se envian por Gmail API.
//
// Reglas de los clientes de correo que respetan estas plantillas:
// - Layout con <table>, estilos inline (nada de clases ni <style> externo).
// - URLs absolutas en toda imagen o link (Gmail no resuelve rutas relativas).
// - Se usa el dominio de Vercel a proposito: grandteambike.com.ar todavia no
//   resuelve.

import { EVENTO, LIMITE_MEDALLAS } from "@/lib/constants"

/** Dominio publico desde el que se sirven las imagenes del email. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://grand-team.vercel.app").replace(
  /\/$/,
  ""
)

/** Version liviana del logo (~94 KB). El /logo.png original pesa 830 KB y Gmail suele no cargarlo. */
const LOGO_URL = `${SITE_URL}/email/logo.png`
const LOGO_GRANDTEAM_URL = `${SITE_URL}/email/grandteam.png`

const MAPS_URL = "https://maps.app.goo.gl/ok3ytmh5SFYBfgZp8"
const WHATSAPP_URL = "https://chat.whatsapp.com/LwCX4X2i7eG0ENJvA4TjHS"

/** Firma de quien desarrolla el sistema de gestion. */
const SERVITEC_URL = "https://www.servitec.net.ar"
const SERVITEC_LOGO_URL = "https://www.servitec.net.ar/logo.png"

const FECHA_EVENTO_DEFAULT = "8 de Noviembre 2026"
const UBICACION_DEFAULT = "El Viejo Molino - Camping"
const NOMBRE_EVENTO = "1er Cicloturismo Ruinas del Viejo Molino"

/** Escapa texto que se interpola en el HTML (un nombre con "<" rompe el mail). */
export function escaparHtml(valor: unknown): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** URL de la imagen QR (300x300 PNG) para el token indicado. */
export function construirUrlQr(token: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&data=${encodeURIComponent(
    token
  )}`
}

/** Un email listo para enviar. */
export interface EmailRenderizado {
  asunto: string
  html: string
  texto: string
}

// ---------------------------------------------------------------------------
// Piezas compartidas del layout
// ---------------------------------------------------------------------------

const PIE_HTML = `
        <tr>
          <td style="background:#111827;border-top:1px solid #374151;padding:28px 40px;text-align:center;">
            <img src="${LOGO_GRANDTEAM_URL}" alt="Grand Team Bike" width="105" height="105" style="display:block;width:105px;height:auto;margin:0 auto 14px;border:0;outline:none;text-decoration:none;">
            <p style="margin:0;color:#ffffff;font-size:14px;font-weight:bold;line-height:1.6;">Organizado por Grand Team Bike</p>
            <p style="margin:5px 0 0;color:#9ca3af;font-size:12px;line-height:1.6;">Concepci&oacute;n del Uruguay &middot; Entre R&iacute;os</p>
            <p style="margin:16px 0 0;color:#6b7280;font-size:11px;line-height:1.6;">&copy; 2026 Grand Team Bike. Todos los derechos reservados.</p>
          </td>
        </tr>
        <!-- Firma de ServiTec. Va sobre fondo claro a proposito: el logo es de
             trazo fino oscuro y sobre el pie negro no se veria. -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:22px 40px;text-align:center;">
            <a href="${SERVITEC_URL}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none;">
              <img src="${SERVITEC_LOGO_URL}" alt="ServiTec" width="52" height="52" style="display:block;width:52px;height:auto;margin:0 auto 10px;border:0;outline:none;text-decoration:none;">
            </a>
            <p style="margin:0;color:#4b5563;font-size:13px;line-height:1.6;">
              Sistema de gesti&oacute;n hecho por
              <a href="${SERVITEC_URL}" target="_blank" rel="noopener noreferrer" style="color:#111827;font-weight:bold;text-decoration:none;">ServiTec</a>
            </p>
            <p style="margin:4px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">Hacemos sistemas de gesti&oacute;n para cualquier rubro...</p>
            <p style="margin:12px 0 0;">
              <a href="${SERVITEC_URL}" target="_blank" rel="noopener noreferrer" style="color:#1d4ed8;font-size:12px;font-weight:bold;text-decoration:underline;">Conoc&eacute; ServiTec</a>
            </p>
          </td>
        </tr>`

/**
 * Envuelve el contenido en el marco comun (fondo gris, tarjeta blanca,
 * encabezado oscuro y pie).
 */
function envolver(opciones: {
  etiqueta: string
  titulo: string
  subtitulo?: string
  contenido: string
  colorEtiqueta?: string
}): string {
  const colorEtiqueta = opciones.colorEtiqueta || "#d6b56c"

  return `<div style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f8;padding:32px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#111827;padding:30px 40px 34px;text-align:center;">
              <a href="${SITE_URL}/" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none;">
                <img src="${LOGO_URL}" alt="${escaparHtml(NOMBRE_EVENTO)}" width="150" height="150" style="display:block;width:150px;height:auto;margin:0 auto 20px;border:0;outline:none;text-decoration:none;">
              </a>
              <div style="font-size:12px;color:${colorEtiqueta};text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;">${escaparHtml(
                opciones.etiqueta
              )}</div>
              <h1 style="margin:0;color:#ffffff;font-size:27px;line-height:1.25;">${opciones.titulo}</h1>
              ${
                opciones.subtitulo
                  ? `<p style="margin:12px 0 0;color:#d1d5db;font-size:15px;line-height:1.6;">${opciones.subtitulo}</p>`
                  : ""
              }
            </td>
          </tr>
${opciones.contenido}
${PIE_HTML}
        </table>
      </td>
    </tr>
  </table>
</div>`
}

/** Fila "etiqueta / valor" de la tabla de datos. */
function fila(etiqueta: string, valor: string): string {
  return `              <tr>
                <td style="padding:13px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">${escaparHtml(
                  etiqueta
                )}</td>
                <td align="right" style="padding:13px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;font-weight:bold;">${valor}</td>
              </tr>`
}

/** Convierte los saltos de linea de un texto libre en parrafos HTML. */
function parrafos(texto: string): string {
  return texto
    .split(/\n{2,}/)
    .map((bloque) => bloque.trim())
    .filter(Boolean)
    .map(
      (bloque) =>
        `<p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#4b5563;">${escaparHtml(
          bloque
        ).replace(/\n/g, "<br>")}</p>`
    )
    .join("\n")
}

// ---------------------------------------------------------------------------
// Confirmacion de inscripcion
// ---------------------------------------------------------------------------

/** Como entra la remera en el mail de confirmacion. */
export interface EstadoRemera {
  /** true si la persona ya hizo el pedido en la tabla `remera`. */
  pedida: boolean
  /** "envio" = a domicilio despues del evento; "retiro" = la recibe en el evento. */
  envioTipo?: "retiro" | "envio" | null
}

export interface DatosConfirmacion {
  /** Nombre completo del participante. */
  nombreCompleto: string
  numeroInscripcion?: string | number | null
  fechaEvento?: string
  ubicacion?: string
  /** Token del QR (se prefiere sobre el numero de inscripcion). */
  tokenQR?: string | null
  /** URL de QR ya armada (fallback para inscripciones migradas sin token). */
  qrCodeUrl?: string
  /**
   * Estado del pedido de remera. Si no se pasa, el bloque no se muestra.
   * POST /api/email/send lo completa solo a partir del DNI.
   */
  remera?: EstadoRemera
}

const PEDIR_REMERA_URL = `${SITE_URL}/pedir-remera`
const REMERA_IMG_URL = `${SITE_URL}/remerab.png`

// Las remeras no llegan a estar listas para el evento: se mandan todas a
// domicilio despues, con costo de envio. Por eso ya no se distingue "retiro"
// (un pedido viejo con retiro tampoco se entrega en el evento).
const REMERA_ENTREGA = "Es a domicilio, tiene un costo adicional de envío y llega después del evento."
const REMERA_ENTREGA_HTML =
  "Es a domicilio, tiene un <strong>costo adicional de env&iacute;o</strong> y llega <strong>despu&eacute;s del evento</strong>."

/** Bloque de remera: cambia segun si ya la pidio o no. */
function bloqueRemera(remera: EstadoRemera | undefined): string {
  if (!remera) return ""

  if (remera.pedida) {
    const detalle = REMERA_ENTREGA_HTML

    return `          <tr>
            <td style="padding:0 40px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;">
                <tr>
                  <td style="padding:25px;text-align:center;">
                    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Est&aacute; incluida tu remera</h2>
                    <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.6;">${detalle}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
  }

  return `          <tr>
            <td style="padding:0 40px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;">
                <tr>
                  <td style="padding:25px;text-align:center;">
                    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Record&aacute; que pod&eacute;s pedir tu remera del evento</h2>
                    <a href="${PEDIR_REMERA_URL}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none;">
                      <img src="${REMERA_IMG_URL}" alt="Remera del evento" width="260" style="display:block;width:100%;max-width:260px;height:auto;margin:16px auto;border:0;border-radius:10px;outline:none;text-decoration:none;">
                    </a>
                    <p style="margin:0 0 18px;color:#4b5563;font-size:14px;line-height:1.6;">${REMERA_ENTREGA_HTML}</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
                      <tr>
                        <td bgcolor="#111827" style="border-radius:8px;">
                          <a href="${PEDIR_REMERA_URL}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 30px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;border-radius:8px;">Pedir mi remera</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
}

/** Version en texto plano del bloque de remera. */
function textoRemera(remera: EstadoRemera | undefined): string[] {
  if (!remera) return []

  if (remera.pedida) {
    return ["", "Esta incluida tu remera.", REMERA_ENTREGA]
  }

  return ["", "Recorda que podes pedir tu remera del evento.", REMERA_ENTREGA, `Pedila en: ${PEDIR_REMERA_URL}`]
}

/**
 * "Para tener en cuenta": lluvia, acompañantes y, si su numero quedo despues
 * del limite, que la inscripcion no tiene medalla. Lo mismo que la ventana que
 * se ve al entrar a /inscripcion, para que nadie diga despues que no sabia.
 */
function avisosEvento(numeroInscripcion: string | number | null | undefined): string[] {
  const entrada = `$${EVENTO.entradaCampingAcompanante.toLocaleString("es-AR")}`
  const numero = Number(numeroInscripcion)
  // Solo con un numero real: sin numero no se puede saber y no se avisa nada.
  const sinMedalla = Number.isInteger(numero) && numero > LIMITE_MEDALLAS

  return [
    `Si llueve, el evento se suspende y pasa al ${EVENTO.fechaSiLlueve}.`,
    `Los acompañantes pagan ${entrada} para entrar al camping.`,
    ...(sinMedalla
      ? [`Ya no hay más medallas: se entregaron las ${LIMITE_MEDALLAS} y tu inscripción no incluye medalla.`]
      : []),
  ]
}

function bloqueAvisos(avisos: string[]): string {
  const items = avisos
    .map(
      (aviso) =>
        `                    <p style="margin:0 0 8px;color:#4b5563;font-size:14px;line-height:1.6;">&bull; ${escaparHtml(aviso)}</p>`
    )
    .join("\n")

  return `          <tr>
            <td style="padding:0 40px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;">
                <tr>
                  <td style="padding:25px;text-align:left;">
                    <h2 style="margin:0 0 12px;color:#111827;font-size:20px;text-align:center;">Para tener en cuenta</h2>
${items}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
}

export function templateConfirmacion(datos: DatosConfirmacion): EmailRenderizado {
  const nombreCompleto = datos.nombreCompleto.trim()
  const nombre = nombreCompleto.split(" ")[0] || nombreCompleto
  const apellido = nombreCompleto.split(" ").slice(1).join(" ")

  // Si no hay token (inscripciones migradas sin token_qr) se usa el numero de
  // inscripcion para no mandar un QR vacio.
  const datoQr = datos.tokenQR || (datos.numeroInscripcion ? String(datos.numeroInscripcion) : "")
  const qrUrl = datoQr ? construirUrlQr(datoQr) : datos.qrCodeUrl || ""

  const fechaEvento = datos.fechaEvento || FECHA_EVENTO_DEFAULT
  const ubicacion = datos.ubicacion || UBICACION_DEFAULT
  const numero = datos.numeroInscripcion ? String(datos.numeroInscripcion) : ""
  const avisos = avisosEvento(datos.numeroInscripcion)

  const contenido = `          <tr>
            <td style="padding:36px 40px 20px;">
              <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#4b5563;">Hola <strong style="color:#111827;">${escaparHtml(
                nombreCompleto
              )}</strong>, te enviamos los datos de tu inscripci&oacute;n. Guard&aacute; este correo, ya que contiene el c&oacute;digo QR que deber&aacute;s presentar el d&iacute;a del evento.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;text-align:center;">
                    <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;">Detalles de tu inscripci&oacute;n</div>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
${fila("Nombre completo", `${escaparHtml(nombre)} ${escaparHtml(apellido)}`.trim())}
${fila("Fecha", escaparHtml(fechaEvento))}
${fila(
  "Ubicación",
  `<a href="${MAPS_URL}" target="_blank" rel="noopener noreferrer" style="color:#111827;text-decoration:underline;">${escaparHtml(
    ubicacion
  )}</a>`
)}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;">
                <tr>
                  <td style="padding:25px;text-align:center;">
                    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Tu c&oacute;digo de acceso</h2>
                    <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6;">Present&aacute; este c&oacute;digo QR desde tu celular al momento de acreditarte.</p>
                    ${
                      qrUrl
                        ? `<img src="${qrUrl}" alt="Codigo QR de inscripcion" width="220" height="220" style="display:block;width:220px;height:220px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;outline:none;text-decoration:none;">
                    <p style="margin:18px 0 0;color:#9ca3af;font-size:12px;line-height:1.5;">Si no ves el c&oacute;digo, activ&aacute; la descarga de im&aacute;genes en tu correo o <a href="${qrUrl}" target="_blank" rel="noopener" style="color:#6b7280;">abrilo en el navegador</a>.</p>
                    <p style="margin:10px 0 0;color:#9ca3af;font-size:12px;line-height:1.5;">Este c&oacute;digo es personal. No lo compartas con otras personas.</p>`
                        : `<p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">Tu c&oacute;digo QR se entregar&aacute; el d&iacute;a del evento en la acreditaci&oacute;n.</p>`
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>

${bloqueAvisos(avisos)}

${bloqueRemera(datos.remera)}

          <tr>
            <td style="padding:0 40px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;">
                <tr>
                  <td style="padding:25px;text-align:center;">
                    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Sumate al grupo de WhatsApp</h2>
                    <p style="margin:0 0 20px;color:#4b5563;font-size:14px;line-height:1.6;">Ah&iacute; vamos a compartir novedades, horarios y todos los detalles previos al evento.</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
                      <tr>
                        <td bgcolor="#25d366" style="border-radius:8px;">
                          <a href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 30px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;border-radius:8px;">Unirme al grupo</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`

  const html = envolver({
    etiqueta: "Inscripcion confirmada",
    titulo: `&iexcl;Tu lugar est&aacute; confirmado, ${escaparHtml(nombre)}!`,
    subtitulo: `Ya sos parte del ${escaparHtml(NOMBRE_EVENTO)}.`,
    contenido,
  })

  // null = linea condicional que no corresponde. Los "" son separadores
  // intencionales y se conservan.
  const texto = [
    `Tu lugar esta confirmado, ${nombre}!`,
    "",
    `Ya sos parte del ${NOMBRE_EVENTO}.`,
    "",
    `Nombre: ${nombreCompleto}`,
    `Fecha: ${fechaEvento}`,
    `Ubicacion: ${ubicacion} (${MAPS_URL})`,
    qrUrl ? "" : null,
    qrUrl ? `Tu codigo QR de acceso: ${qrUrl}` : null,
    qrUrl ? "Presentalo el dia del evento. Es personal, no lo compartas." : null,
    "",
    "Para tener en cuenta:",
    ...avisos.map((aviso) => `- ${aviso}`),
    ...textoRemera(datos.remera),
    "",
    `Grupo de WhatsApp del evento: ${WHATSAPP_URL}`,
    "",
    "Organizado por Grand Team Bike - Concepcion del Uruguay, Entre Rios",
    "",
    "Sistema de gestion hecho por ServiTec - servitec.net.ar",
    "Hacemos sistemas de gestion para cualquier rubro...",
  ]
    .filter((linea): linea is string => linea !== null)
    .join("\n")

  return {
    asunto: `Inscripcion confirmada - ${NOMBRE_EVENTO}`,
    html,
    texto,
  }
}

// ---------------------------------------------------------------------------
// Rechazo de inscripcion
// ---------------------------------------------------------------------------

export interface DatosRechazo {
  nombreCompleto: string
  motivo?: string
}

export function templateRechazo(datos: DatosRechazo): EmailRenderizado {
  const nombreCompleto = datos.nombreCompleto.trim()
  const nombre = nombreCompleto.split(" ")[0] || nombreCompleto
  const motivo = (datos.motivo || "").trim() || "No se especifico un motivo."

  const contenido = `          <tr>
            <td style="padding:36px 40px 10px;">
              <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#4b5563;">Hola <strong style="color:#111827;">${escaparHtml(
                nombreCompleto
              )}</strong>, revisamos tu inscripci&oacute;n al ${escaparHtml(
                NOMBRE_EVENTO
              )} y por el momento no pudimos aprobarla.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:22px;">
                    <div style="font-size:12px;color:#b91c1c;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">Motivo</div>
                    <p style="margin:0;color:#7f1d1d;font-size:15px;line-height:1.6;">${escaparHtml(
                      motivo
                    ).replace(/\n/g, "<br>")}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#4b5563;">Pod&eacute;s responder este correo con la informaci&oacute;n corregida (por ejemplo un comprobante de pago v&aacute;lido) y volvemos a revisarla. Tambi&eacute;n pod&eacute;s escribirnos desde la p&aacute;gina de contacto.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 36px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
                <tr>
                  <td bgcolor="#111827" style="border-radius:8px;">
                    <a href="${SITE_URL}/contacto" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 30px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;border-radius:8px;">Contactarnos</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`

  const html = envolver({
    etiqueta: "Inscripcion no aprobada",
    titulo: `Hola ${escaparHtml(nombre)}, necesitamos revisar tu inscripci&oacute;n`,
    subtitulo: "Te contamos que paso y como seguir.",
    colorEtiqueta: "#fca5a5",
    contenido,
  })

  const texto = [
    `Hola ${nombreCompleto},`,
    "",
    `Revisamos tu inscripcion al ${NOMBRE_EVENTO} y por el momento no pudimos aprobarla.`,
    "",
    `Motivo: ${motivo}`,
    "",
    "Podes responder este correo con la informacion corregida y volvemos a revisarla.",
    `Contacto: ${SITE_URL}/contacto`,
    "",
    "Organizado por Grand Team Bike - Concepcion del Uruguay, Entre Rios",
    "",
    "Sistema de gestion hecho por ServiTec - servitec.net.ar",
    "Hacemos sistemas de gestion para cualquier rubro...",
  ].join("\n")

  return {
    asunto: `Sobre tu inscripcion - ${NOMBRE_EVENTO}`,
    html,
    texto,
  }
}

// ---------------------------------------------------------------------------
// Email generico (recordatorios y envios manuales desde el panel)
// ---------------------------------------------------------------------------

export interface DatosGenerico {
  nombreCompleto?: string
  /** Titulo grande del encabezado. */
  titulo: string
  /** Texto libre; los saltos de linea dobles separan parrafos. */
  mensaje: string
  etiqueta?: string
  /** Boton opcional al pie del contenido. */
  boton?: { texto: string; url: string }
}

export function templateGenerico(datos: DatosGenerico): EmailRenderizado {
  const saludo = datos.nombreCompleto?.trim()
    ? `<p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#4b5563;">Hola <strong style="color:#111827;">${escaparHtml(
        datos.nombreCompleto.trim()
      )}</strong>,</p>`
    : ""

  const boton = datos.boton
    ? `          <tr>
            <td style="padding:0 40px 36px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
                <tr>
                  <td bgcolor="#111827" style="border-radius:8px;">
                    <a href="${escaparHtml(
                      datos.boton.url
                    )}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 30px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;border-radius:8px;">${escaparHtml(
                      datos.boton.texto
                    )}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
    : ""

  const contenido = `          <tr>
            <td style="padding:36px 40px 20px;">
${saludo}
${parrafos(datos.mensaje)}
            </td>
          </tr>
${boton}`

  const html = envolver({
    etiqueta: datos.etiqueta || NOMBRE_EVENTO,
    titulo: escaparHtml(datos.titulo),
    contenido,
  })

  const texto = [
    datos.nombreCompleto?.trim() ? `Hola ${datos.nombreCompleto.trim()},` : null,
    datos.nombreCompleto?.trim() ? "" : null,
    datos.mensaje.trim(),
    "",
    datos.boton ? `${datos.boton.texto}: ${datos.boton.url}` : null,
    datos.boton ? "" : null,
    "Organizado por Grand Team Bike - Concepcion del Uruguay, Entre Rios",
    "",
    "Sistema de gestion hecho por ServiTec - servitec.net.ar",
    "Hacemos sistemas de gestion para cualquier rubro...",
  ]
    .filter((linea): linea is string => linea !== null)
    .join("\n")

  return { asunto: datos.titulo, html, texto }
}

// ---------------------------------------------------------------------------
// Registro de plantillas (lo usa POST /api/email/send)
// ---------------------------------------------------------------------------

export type NombrePlantilla = "confirmacion" | "rechazo" | "generico"

export const NOMBRES_PLANTILLA: NombrePlantilla[] = ["confirmacion", "rechazo", "generico"]

/** Renderiza una plantilla por nombre validando que exista. */
export function renderizarPlantilla(
  nombre: string,
  datos: Record<string, unknown>
): EmailRenderizado {
  switch (nombre) {
    case "confirmacion":
      return templateConfirmacion(datos as unknown as DatosConfirmacion)
    case "rechazo":
      return templateRechazo(datos as unknown as DatosRechazo)
    case "generico":
      return templateGenerico(datos as unknown as DatosGenerico)
    default:
      throw new Error(`Plantilla desconocida: ${nombre}`)
  }
}
