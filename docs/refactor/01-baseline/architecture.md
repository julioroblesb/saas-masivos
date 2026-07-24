# Mapa de Arquitectura Actual

## 1. Diagrama de Despliegue Actual

```mermaid
graph TD
    Client[Navegador del Usuario] -->|HTTPS / Next.js| Vercel[Vercel Serverless Platform]
    Vercel -->|Auth & Database Queries| Supabase[Supabase Cloud PostgreSQL + Auth]
    Vercel -->|HTTPS via Cloudflare Access| CFTunnel[Cloudflare Tunnel]
    CFTunnel -->|Red Privada Tailscale / Local| Laptop[Laptop Servidor Dedicated HP Ubuntu 26.04]
    
    subgraph LaptopServidor [Laptop HP - 4GB RAM - Docker Stack]
        EvoAPI[Evolution API v2.2.3 / Node 20]
        EvoPG[(PostgreSQL 15 Alpine)]
        EvoRedis[(Redis 7 Alpine)]
        
        EvoAPI --> EvoPG
        EvoAPI --> EvoRedis
    end
    
    CFTunnel --> EvoAPI
    EvoAPI -->|WhatsApp Baileys Protocol| WA[Red de WhatsApp]
```

---

## 2. Diagrama de Zonas de Confianza

```mermaid
graph LR
    subgraph ZonaPublica [Zona Pública Internet]
        Users[Navegador Usuario]
        Webhooks[Webhooks Entrantes Evolution]
    end

    subgraph ZonaApp [Zona Aplicación Next.js Vercel]
        AppAuth[Next.js App Router - Auth Cookie]
        CronJob[Next.js API Cron - Bearer Token]
    end

    subgraph ZonaDatos [Zona de Datos Protegidos]
        SupaAuth[Supabase Auth]
        SupaDB[(Supabase DB RLS)]
        ServiceRole[Service Role Admin Engine]
    end

    subgraph ZonaServidorLocal [Servidor Doméstico Dedicado]
        EvoContainer[Evolution API Container 127.0.0.1:8080]
        PostgresLocal[(PostgreSQL Local)]
        RedisLocal[(Redis Local)]
    end

    Users -->|Cookie Auth| AppAuth
    AppAuth -->|Anon / User Token| SupaDB
    CronJob -->|Service Role Key| ServiceRole
    ServiceRole -->|Bypass RLS| SupaDB
    AppAuth -->|Cloudflare Service Auth + APIKey| EvoContainer
    EvoContainer --> PostgresLocal
    EvoContainer --> RedisLocal
```

---

## 3. Propiedad de Datos por Componente

* **Supabase Cloud**: Propietario de `companies`, `profiles`, `crm_marketing_contacts`, `crm_wa_campaigns`, `crm_wa_queue`, `spa_visits`, `spa_payments`, `spa_services`, `spa_staff`.
* **Evolution API (PostgreSQL Local)**: Propietario del estado interno de las sesiones Baileys, claves criptográficas de WhatsApp, tokens de sesión de dispositivo y caché Redis.
