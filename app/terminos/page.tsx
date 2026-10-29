import type { Metadata } from "next"
import Link from "next/link"
import PaginaLegal from "@/components/legal/PaginaLegal"
import { EVENTO } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description: "Condiciones de uso del sitio y de la inscripción al cicloturismo de Grand Team Bike.",
  alternates: { canonical: "/terminos" },
}

// Las condiciones de la inscripcion son las del deslinde que se acepta en el
// ultimo paso (components/inscripcion/ReviewStep.tsx): si cambia uno, cambia el otro.
export default function TerminosPage() {
  const email = EVENTO.contacto.email

  return (
    <PaginaLegal titulo="Términos y Condiciones" actualizado="29 de octubre de 2026">
      <p>
        Estos términos valen para el uso de este sitio y para la inscripción al {EVENTO.nombre}, que organiza{" "}
        <strong>Grand Team Bike</strong> en {EVENTO.ubicacion}. Al usar el sitio o inscribirte, los aceptás.
      </p>

      <h2>El sitio</h2>
      <ul>
        <li>Sirve para inscribirte al evento, pedir la remera, ver tu QR, los sorteos y la información del evento.</li>
        <li>
          Los datos que cargás tienen que ser tuyos y verdaderos. Si inscribís a otra persona, tenés que contar con su
          permiso.
        </li>
        <li>
          El panel de administración es solo para el equipo organizador. Está prohibido intentar entrar sin permiso o
          usar el sitio para dañarlo.
        </li>
        <li>
          Hacemos lo posible para que el sitio funcione siempre, pero puede tener cortes o errores. Si algo falla,
          escribinos.
        </li>
      </ul>

      <h2>La inscripción</h2>
      <ul>
        <li>
          La inscripción queda confirmada cuando el equipo verifica el pago. Recién ahí recibís el mail con tu número y
          tu código QR, que es la credencial para acreditarte: no lo compartas.
        </li>
        <li>
          Una vez confirmada la inscripción y hecho el pago, no corresponde reintegro del dinero abonado.
        </li>
        <li>Si llueve, el evento se pasa al {EVENTO.fechaSiLlueve}.</li>
        <li>Los cupos, el precio y lo que incluye la inscripción son los que se publican en este sitio.</li>
      </ul>

      <h2>Deslinde de responsabilidad</h2>
      <p>Al inscribirte aceptás el deslinde de responsabilidad del último paso del formulario. En resumen:</p>
      <ul>
        <li>Declarás que estás en buenas condiciones de salud y apto/a para la actividad.</li>
        <li>
          Reconocés que el ciclismo tiene riesgos (caídas, lesiones, accidentes de tránsito, clima) y los asumís.
        </li>
        <li>
          Liberás de responsabilidad a los organizadores, colaboradores, voluntarios, sponsors y dueños de los
          predios por lesiones, daños o pérdida de objetos antes, durante o después del evento.
        </li>
        <li>
          Te comprometés a respetar las normas de tránsito y las indicaciones de la organización. <strong>El casco es
          obligatorio.</strong>
        </li>
        <li>
          Autorizás el uso de las fotos y videos del evento en los que aparezcas, para difundirlo, sin compensación.
        </li>
      </ul>

      <h2>Datos personales</h2>
      <p>
        Cómo usamos tus datos está en la <Link href="/privacidad">Política de Privacidad</Link>. Los datos médicos
        son confidenciales y se usan solo ante una emergencia durante el evento.
      </p>

      <h2>Cambios</h2>
      <p>
        Podemos actualizar estos términos. La fecha de arriba indica la última versión. Ante cualquier duda,
        escribinos a <a href={`mailto:${email}`}>{email}</a> o desde la página de{" "}
        <Link href="/contacto">contacto</Link>.
      </p>
    </PaginaLegal>
  )
}
