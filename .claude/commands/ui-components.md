# Skill: Componentes UI y Estilos

Eres un experto en los componentes UI y estilos del proyecto Grand Team Bike 2026.

## Sistema de componentes
- **Base**: shadcn/ui (estilo new-york, base neutral)
- **Ubicación**: `components/ui/` (54+ componentes)
- **Agregar nuevos**: `npx shadcn@latest add <nombre>`
- **Config**: `components.json`
- **Iconos**: lucide-react

## Componentes shadcn disponibles
Button, Card, Input, Label, Dialog, Tabs, Table, Form, Select, Chart, Toast, Toaster,
Separator, Alert, Accordion, Popover, DropdownMenu, Tooltip, Skeleton, Badge, Avatar,
Breadcrumb, Progress, Spinner, Sidebar, Sheet, Drawer, Carousel, Calendar, ScrollArea,
Pagination, ContextMenu, Checkbox, RadioGroup, Switch, Toggle, Command, InputOTP,
Slider, Collapsible, Empty, NavigationMenu, Menubar, AlertDialog, HoverCard,
ResizablePanels, ToggleGroup, Field, Item, ButtonGroup, InputGroup, AspectRatio, Kbd, Sonner

## Estilos y tema
- **Framework**: Tailwind CSS v4
- **Config**: `app/globals.css` (variables CSS del tema)
- **Colores principales**:
  - Fondo: #000000 (negro)
  - Primario: #ffd700 (amarillo dorado)
  - Secundario: #ffc107 (ámbar)
  - Texto: #ffffff (blanco), #a3a3a3 (gris)
  - Destructivo: #ef4444 (rojo)

## Fuentes
- Inter (body): variable `--font-inter`
- Poppins (headings, pesos 400/600/700/900): variable `--font-poppins`
- Cargadas en `app/layout.tsx` via `next/font/google`

## Utilidades
- `cn()` en `lib/utils.ts` (clsx + tailwind-merge)
- `useIsMobile()` en `hooks/use-mobile.ts` (breakpoint 768px)
- `useToast()` en `hooks/use-toast.ts` (notificaciones)

## Animaciones
- framer-motion para transiciones y animaciones
- tailwindcss-animate para animaciones CSS
- tw-animate-css para animaciones adicionales

## Patrones de estilo comunes
```tsx
// Gradientes admin
className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20"

// Cards con hover
className="bg-zinc-900/50 border-zinc-800 hover:border-yellow-500/30 transition-colors"

// Texto primario
className="text-yellow-400 font-poppins font-bold"

// Botones CTA
className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
```

## Reglas
- Mantener tema negro/dorado en todo el proyecto
- Usar `cn()` para clases condicionales, nunca template literals
- Preferir componentes shadcn existentes antes de crear nuevos
- Mobile-first: diseñar para móvil primero, luego desktop
- Imágenes sin optimización Next.js (unoptimized: true)

## Instrucción
Analiza lo que el usuario necesita de UI o estilos. Usa componentes shadcn existentes cuando sea posible. Mantén la coherencia visual del tema negro/dorado.
