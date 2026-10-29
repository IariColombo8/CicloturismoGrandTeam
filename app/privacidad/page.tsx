import type { Metadata } from "next"
import Link from "next/link"
import PaginaLegal from "@/components/legal/PaginaLegal"
import { EVENTO } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: "Qué datos pedimos en la inscripción y el pedido de remera, para qué los usamos y cómo pedir que los borremos.",
  alternates: { canonical: "/privacidad" },
}

export default function PrivacidadPage() {
  const email = EVENTO.contacto.email

  return (
    <PaginaLegal titulo="Política de Privacidad" actualizado="29 de octubre de 2026">
      <p>
        Este sitio es de <strong>Grand Team Bike</strong>, el grupo que organiza el {EVENTO.nombre} en{" "}
        {EVENTO.ubicacion}. Acá contamos qué datos pedimos, para qué y con quién los compartimos.
      </p>

      <h2>Qué datos pedimos</h2>
      <p>En la inscripción:</p>
      <ul>
        <li>Nombre, apellido, DNI, fecha de nacimiento, país y localidad.</li>
        <li>Email y teléfono.</li>
        <li>Contacto de emergencia: nombre, teléfono y relación.</li>
        <li>
          Datos de salud: grupo sanguíneo, alergias, problemas de salud y si sos celíaco/a. Son para atenderte en
          caso de emergencia durante el evento.
        </li>
        <li>Grupo ciclista, experiencia y talle de remera.</li>
        <li>Método de pago, número de referencia y el comprobante que subís.</li>
      </ul>
      <p>
        En el pedido de remera: DNI, nombre, teléfono, email, talles y cantidades, forma de entrega, dirección de
        envío (si elegís envío) y el comprobante de pago.
      </p>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Registrar tu inscripción, verificar el pago y asignarte un número.</li>
        <li>Mandarte el mail de confirmación con tu código QR, que se usa para acreditarte el día del evento.</li>
        <li>Contestar tus consultas y avisarte cambios del evento.</li>
        <li>Organizar el evento: cantidad de remeras, cupos, seguro y sorteos.</li>
      </ul>
      <p>No vendemos ni alquilamos tus datos, y no los usamos para publicidad.</p>

      <h2>Qué se ve en público</h2>
      <p>
        Tus datos personales no se publican. Si ganás un sorteo, en la página de sorteos aparecen tu nombre y tu
        localidad (nunca tu DNI). Durante el evento se toman fotos y videos que pueden publicarse para difundirlo.
      </p>

      <h2>Dónde se guardan</h2>
      <ul>
        <li>
          <strong>Supabase</strong>: base de datos y archivos (comprobantes). Solo el equipo organizador tiene acceso,
          con su cuenta.
        </li>
        <li>
          <strong>Vercel</strong>: aloja el sitio y mide las visitas de forma agregada (Vercel Analytics), sin
          identificarte.
        </li>
        <li>
          <strong>Google (Gmail)</strong>: los mails salen desde la casilla del evento, {email}.
        </li>
      </ul>

      <h2>Uso de los datos de Google</h2>
      <p>
        El sitio se conecta a la API de Gmail <strong>solo con la casilla del evento</strong> ({email}), para
        enviar los mails de confirmación y leer y responder las consultas que llegan a esa casilla desde el panel
        del equipo. No pedimos acceso a tu cuenta de Google ni a tu Gmail. Los datos que se obtienen de las API de
        Google se usan solamente para eso, no se comparten con terceros, no se usan para publicidad y no se usan
        para entrenar modelos de inteligencia artificial. El uso cumple la{" "}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Política de Datos de Usuario de los Servicios de API de Google
        </a>
        , incluidos los requisitos de Uso Limitado.
      </p>
      <p>
        El inicio de sesión con Google es solo para el equipo que administra el panel: de esa cuenta usamos el email,
        el nombre y la foto de perfil.
      </p>

      <h2 id="cookies">Cookies y almacenamiento en tu dispositivo</h2>
      <p>
        No usamos cookies de publicidad. El sitio guarda datos en tu navegador para funcionar: el borrador del
        formulario (para que no pierdas lo cargado si se cierra la pestaña) y la inscripción pendiente de envío si te
        quedaste sin internet. El borrador se borra solo a los 7 días. El equipo que entra al panel usa además la
        sesión de inicio de sesión.
      </p>

      <h2>Cuánto tiempo los guardamos</h2>
      <p>
        Mientras dure la organización del evento y para las próximas ediciones (por eso, si te volvés a inscribir,
        el formulario se completa con tus datos). Podés pedir que los borremos cuando quieras.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Podés pedir ver, corregir o borrar tus datos escribiendo a <a href={`mailto:${email}`}>{email}</a>. Es un
        derecho que te da la Ley 25.326 de Protección de Datos Personales. La Agencia de Acceso a la Información
        Pública es el organismo de control de esa ley y recibe los reclamos.
      </p>

      <h2>Contacto</h2>
      <p>
        Por cualquier duda: <a href={`mailto:${email}`}>{email}</a> o desde la página de{" "}
        <Link href="/contacto">contacto</Link>. Ver también los{" "}
        <Link href="/terminos">Términos y Condiciones</Link>.
      </p>
    </PaginaLegal>
  )
}
