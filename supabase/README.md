# Supabase Setup — FCFCat

## 1. Ejecutar la migración SQL

Ve a tu proyecto Supabase → **SQL Editor** → **New Query** y ejecuta el archivo:

```
supabase/migrations/001_initial.sql
```

Esto crea las 5 tablas:
- `fcf_standings` — clasificaciones de todos los grupos
- `fcf_matches` — resultados y calendario
- `fcf_referee_matches` — base de datos de árbitros (tarjetas, partidos)
- `fcf_scorers` — goleadores por grupo
- `fcf_player_stats` — estadísticas de jugadores (de actas)

## 2. Obtener las keys de Supabase

En tu proyecto Supabase → **Settings** → **API**:

| Variable | Dónde encontrarla |
|---|---|
| `SUPABASE_URL` | "Project URL" (ej: `https://abcxyz.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | "service_role" key (NO la anon key) |
| `NEXT_PUBLIC_SUPABASE_URL` | Igual que `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | "anon public" key |

> ⚠️ La `service_role` key tiene acceso total a la BD. Úsala **solo** en GitHub Secrets y nunca en el frontend.

## 3. Añadir secrets en GitHub

Ve a tu repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

```
SUPABASE_URL          = https://xxxx.supabase.co
SUPABASE_SERVICE_KEY  = eyJhbGciOiJ...  (service_role key)
```

## 4. Configurar el frontend (Next.js)

Edita `procoach-next/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJ...  (anon key)
PYTHON_API_URL=http://localhost:8080
```

Para producción en Vercel, añade las mismas variables en:
**Vercel → Project → Settings → Environment Variables**

## 5. Poblar la base de datos (primera vez)

Una vez configurados los secrets, ejecuta el workflow manualmente:

**GitHub → Actions → "Populate Supabase — Full Initial Load" → Run workflow**

Esto tarda ~30-45 minutos y:
- Scrapeará todos los grupos de las 14 categorías FCF
- Subirá standings, resultados y goleadores a Supabase
- Opcionalmente sube los 1.435 partidos de árbitros ya scrapeados

## 6. Actualizaciones automáticas

Después de la carga inicial:
- **Cada lunes 8:00 CET** → Se ejecuta automáticamente `weekly-public-update.yml`
  - Actualiza todas las clasificaciones y resultados
  - Actualiza la base de datos de árbitros (primera + segona catalana)
- **Cada día 9:00 CET** → Se ejecuta `scrape-scheduled.yml`
  - Actualiza en detalle los equipos registrados (actas completas)
  - También pushea estadísticas de jugadores a Supabase

## Tablas y RLS

| Tabla | Lectura | Escritura |
|---|---|---|
| `fcf_standings` | Pública (anon) | Solo service_role |
| `fcf_matches` | Pública (anon) | Solo service_role |
| `fcf_referee_matches` | Pública (anon) | Solo service_role |
| `fcf_scorers` | Pública (anon) | Solo service_role |
| `fcf_player_stats` | Pública (anon) | Solo service_role |
