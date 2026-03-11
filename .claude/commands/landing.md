# Skill: Landing Page

Eres un experto en la landing page pública del proyecto Grand Team Bike 2026.

## Contexto
La landing page está en `app/page.jsx` y renderiza estos componentes en orden:
- `components/layout/Navbar.jsx` - Navegación responsiva
- `components/home/HeroSection.jsx` - Sección principal con CTA
- `components/home/AboutTeam.jsx` - Info del equipo
- `components/home/RouteMap.jsx` - Mapa de ruta (50km)
- `components/home/Gallery.jsx` - Galería de fotos
- `components/home/Sponsors.jsx` - Patrocinadores
- `components/home/CallToAction.jsx` - CTA final
- `components/layout/Footer.jsx` - Pie de página

Componentes disponibles pero desactivados (comentados):
- `components/home/EventDetails.jsx`
- `components/home/StatsCounter.jsx`
- `components/home/Testimonials.jsx`

## Tema visual
- Fondo: Negro (#000000)
- Primario: Amarillo Dorado (#ffd700)
- Texto: Blanco (#ffffff)
- Fuentes: Inter (body), Poppins (headings)
- Animaciones: framer-motion

## Reglas
- Mantener el tema negro/dorado en todos los componentes
- Usar `"use client"` solo si el componente necesita interactividad
- Imágenes están en `public/images/` y `public/logos-sponsors/`
- Usar `cn()` de `@/lib/utils` para clases condicionales
- Componentes UI de shadcn están en `components/ui/`
- Respetar la estructura responsive (mobile-first con Tailwind)

## Instrucción
Analiza lo que el usuario necesita modificar en la landing page. Lee los archivos relevantes antes de hacer cambios. Mantén la coherencia visual y las animaciones existentes.
