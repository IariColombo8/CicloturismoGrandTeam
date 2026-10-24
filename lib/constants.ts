// Constantes del evento - centralizar valores que se repiten en múltiples archivos
export const EVENTO = {
  nombre: "1er Cicloturismo Ruinas del Viejo Molino",
  fecha: "2026-11-08T07:00:00",
  fechaTexto: "8 de Noviembre 2026",
  ubicacion: "Concepción del Uruguay, Entre Ríos",
  distancia: "50 km",
  duracion: "3-4 hrs",
  // Si llueve el evento se suspende y pasa a esta fecha (aviso de /inscripcion).
  fechaSiLlueve: "domingo 28 de marzo",
  // Lo que paga cada acompañante para entrar al camping (en pesos).
  entradaCampingAcompanante: 10000,
  contacto: {
    email: "grandteamcdelu@gmail.com",
    whatsapp: "5493442654257",
    instagram: "@grandteambike",
  },
} as const

/**
 * Solo las primeras 220 inscripciones de la edicion tienen medalla garantizada.
 * Vive aca (y no en el hook) porque tambien lo usa el mail de confirmacion,
 * que se arma en el servidor.
 */
export const LIMITE_MEDALLAS = 220
