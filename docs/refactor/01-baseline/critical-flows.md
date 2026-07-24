# Flujos Críticos y Sistema de Colas

## 1. Diagrama de Flujo del Cron de Envíos (`/api/cron/process-queue`)

```mermaid
flowchart TD
    CronVercel[Vercel Cron Trigger] -->|GET /api/cron/process-queue| AuthCheck{Validar Bearer CRON_SECRET}
    AuthCheck -- No --> R401[401 Unauthorized]
    AuthCheck -- Sí --> Watchdog[Watchdog: Liberar 'enviando' > 5 min]
    Watchdog --> FetchSessions[Obtener wa_sessions 'conectado' + empresas activas]
    FetchSessions --> ChunkLoop[Procesar empresas en chunks de 5]
    
    subgraph EmpresaLoop [Bucle por Empresa - Max 45s Duration]
        CheckReset[Verificar reset diario 24h] --> CheckLimits{Límite diario o fuera de horario 08-20h}
        CheckLimits -- Superado --> SkipCo[Saltar empresa]
        CheckLimits -- OK --> SelectMsg[SELECT 1 crm_wa_queue pendiente]
        SelectMsg --> AtomicClaim[UPDATE crm_wa_queue status='enviando']
        AtomicClaim --> SendWA[Evolution API sendText / sendMedia]
        SendWA -- Éxito --> MarkSent[UPDATE status='enviado' + increment_campaign_sent]
        SendWA -- Fallo --> MarkFailed[UPDATE status='fallido' + consecutive_errors++]
    end
    
    ChunkLoop --> EmpresaLoop
    EmpresaLoop --> Finish[JSON Summary Response]
```

---

## 2. Análisis del Sistema de Colas

* **Frecuencia**: Ejecución cada minuto mediante Vercel Cron.
* **Límite de Tiempo (Timeout)**: La Serverless Function en Vercel posee un límite máximo de ejecución (45-60s). Si la función es cancelada mientras espera el delay entre mensajes, se interrumpe la iteración.
* **Recuperación de Errores (Watchdog)**: Los mensajes trabados en `enviando` por más de 5 minutos son re-marcados automáticamente a `pendiente`.
* **Riesgo de Duplicidad**: Reducido mediante reclamación atómica `UPDATE status='enviando' WHERE status='pendiente'`. No obstante, si Evolution recibe y procesa el mensaje pero la red hacia Supabase cae antes de responder el HTTP, la transacción local puede reintentarse.
