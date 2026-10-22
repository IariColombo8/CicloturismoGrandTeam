// Estado de los pedidos de remera.
//
// Los pedidos cerraron el 10/10/2026 y se reabrieron el 13/10/2026, pero esta
// vez SOLO con envio a domicilio: las remeras no van a estar terminadas para el
// dia del evento, asi que no se puede retirar en mano.
//
// Para volver a cerrar los pedidos basta con poner REMERA_PEDIDOS_ABIERTOS en
// false; para habilitar de nuevo el retiro en el evento, REMERA_SOLO_ENVIO en
// false.
export const REMERA_PEDIDOS_ABIERTOS = true

// Mientras este en true el unico metodo de entrega posible es el envio.
export const REMERA_SOLO_ENVIO = true

// Aclaracion principal que se repite en la landing, el formulario y /mi-qr.
export const REMERA_SOLO_ENVIO_AVISO =
  "Las remeras no van a estar listas para el evento, solamente serán enviadas a domicilio."

// Ventana que se ve al tocar "Pedir mi remera", antes del formulario.
export const REMERA_AVISO_DOMICILIO =
  "La remera se envía a domicilio: tiene un costo adicional de envío y llega después del evento."

// Aviso general de pedidos abiertos.
export const REMERA_AVISO_PEDIDOS = `Pedidos reabiertos solo con envío a domicilio dentro de Argentina. ${REMERA_SOLO_ENVIO_AVISO}`

export const REMERA_CERRADA_MENSAJE =
  "Los pedidos de remera están cerrados. Ya no se aceptan nuevos pedidos."

export function isRemeraCerrada(): boolean {
  return !REMERA_PEDIDOS_ABIERTOS
}
