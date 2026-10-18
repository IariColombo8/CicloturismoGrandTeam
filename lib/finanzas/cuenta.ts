// lib/finanzas/cuenta.ts
// Nombre de la cuenta donde entra y sale la plata del evento.
//
// Arranco en el BNA y en octubre de 2026 paso a Naranja X. Vive en una sola
// constante justamente por eso: el panel, el PDF, el Excel, la calculadora de
// caja y las notificaciones push tienen que decir todos el mismo nombre, y
// cuando la cuenta cambia se cambia aca y no en ocho archivos.

/** Como se llama la cuenta en pantalla ("Naranja X"). */
export const CUENTA = "Naranja X"

/** Titulo de la tarjeta y de la fila del PDF: "Plata en Naranja X". */
export const ETIQUETA_PLATA = `Plata en ${CUENTA}`
