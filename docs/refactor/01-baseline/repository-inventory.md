# Inventario del Repositorio y Dependencias

## 1. Estructura Clasificada de Directorios

| Área / Directorio | Función que cumple |
| :--- | :--- |
| `apps/web/src/app` | Rutas de Next.js App Router (Dashboard, Admin, CRM, Agenda, WhatsApp, API routes). |
| `apps/web/src/components` | Componentes de UI reutilizables (Botones, Modales, Seleccionadores de fecha, Selects). |
| `apps/web/src/modules` | Módulos funcionales frontend (`whatsapp`, `contacts`, `campaigns`, `appointments`). |
| `apps/web/src/integrations` | Integraciones HTTP externas (`evolution/client.ts`). |
| `apps/web/src/domain` | Lógica de dominio pura (`subscriptions/evaluate-tenant-access.ts`). |
| `apps/web/src/config` | Módulo de validación de entorno (`env.ts`). |
| `apps/web/src/utils` | Utilidades auxiliares y creadores de clientes de Supabase (`supabase/server.ts`, `supabase/admin.ts`). |
| `supabase/migrations` | Conjunto de 34 archivos SQL de migraciones históricas. |
| `scripts/debug` | Scripts auxiliares de diagnóstico fuera del bundle de aplicación (`test-db.js`). |

---

## 2. Diagnóstico de Workspaces y Dependencias

* **Entorno Runtime**: Node.js `v22.11.0`, npm `10.9.0`.
* **Workspace Raíz**: Declara únicamente `apps/*`.
* **Inconsistencia de Lockfile**: `package-lock.json` registra una entrada `extraneous` correspondiente a un antiguo paquete `apps/wa-service` que ya no existe en el sistema de archivos.

### Dependencias Principales (`apps/web/package.json`)
* **Core & Framework**: Next.js `16.2.9`, React `19.2.4`, React DOM `19.2.4`, TypeScript `^5`.
* **Base de Datos & Auth**: `@supabase/supabase-js` (`^2.108.2`), `@supabase/ssr` (`^0.12.0`).
* **UI & Estilos**: TailwindCSS `^4`, `@headlessui/react` (`^2.2.10`), `clsx`, `tailwind-merge`, `lucide-react`, `motion` (`^12.40.0`).
* **Formularios & Validación**: `zod` (`^4.4.3`), `react-flatpickr`, `react-select`.

### hallazgos de Dependencias
* **Dependencias de Visualización Pesadas**: `apexcharts` (`^5.15.2`) y `react-apexcharts` (`^2.1.1`) cargan paquetes gráficos pesados en el cliente.
* **Redundancia en Librerías de Estado/Galletas**: `universal-cookie`, `@reduxjs/toolkit` y `@tanstack/react-query` coexisten con el estado local de React.
