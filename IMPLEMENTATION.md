# 🏆 ProCoach FCF — Plan de Implementación

## Estado actual — ✅ Lo que ya tenemos

### Backend (Scraper Python)
- ✅ Scraper actas FCF (alineaciones, goles con minuto, tarjetas, sustituciones, árbitros)
- ✅ Clasificaciones, goleadores, sanciones, fair play
- ✅ `build_team_intelligence()` — stats de jugadores, goles por periodo, racha
- ✅ `compute_conditional_insights()` — casa/fuera, racha, periodos peligrosos
- ✅ API genera `rival_intelligence` y `rival_insights` cuando se indica rival

### Frontend (React/Vite)
- ✅ Setup wizard con búsqueda de equipo
- ✅ Dashboard, IntelligenceView, TacticalBoard, TrainingPlanner, TeamManagement
- ⚠️ Dashboard muestra datos HARDCODED del rival — NO conectados a datos reales

---

## 🚀 Fase 1 — Informe de Rival con Datos Reales

### 1.1 Backend — Inteligencia de rival mejorada
- [x] Crear `build_rival_report()` en `intelligence.py`
  - XI más frecuente (jugadores con más titularidades)
  - Goleadores del rival con minutos de gol
  - Tarjetas acumuladas del rival (alertas apercibidos a 4 amarillas)
  - Sanciones activas del rival
  - Head-to-head con nuestro equipo
  - Análisis de franjas de gol comparativas
- [x] Crear `build_referee_intelligence()` en `intelligence.py`
  - Tarjetas/partido del árbitro
  - Tarjetas local vs visitante
  - Partidos con expulsión
  - Historial de partidos dirigidos

### 1.2 Frontend — Conectar datos reales al dashboard
- [x] Crear `RivalReport.tsx` — vista dedicada del informe rival
  - Selector de rival (dropdown con equipos del grupo)
  - Stats resumen del rival (posición, puntos, GF/GC, racha)
  - XI probable basado en actas
  - Goleadores del rival con % sobre total
  - Goles por franja
  - Tarjetas y apercibidos
  - Comparativa directa (H2H)
  - Últimos resultados del rival
  - Insights condicionales
- [ ] Crear `RefereeReport.tsx` — vista dedicada del árbitro
- [ ] Actualizar sidebar con nueva navegación

### 1.3 Datos que SÍ podemos dar (realistas)
> Solo información extraíble de las actas FCF

| Dato | Fuente | ✅ Podemos |
|---|---|---|
| Resultados y racha | calendar + actas | ✅ |
| Goleadores con minutos | actas (GoalEvent) | ✅ |
| XI habitual / titularidades | actas (PlayerEntry) | ✅ |
| Tarjetas acumuladas | actas (CardEvent) | ✅ |
| Sustituciones habituales | actas (SubstitutionEvent) | ✅ |
| Goles por periodo (0-15, etc.) | actas (GoalEvent.minute) | ✅ |
| Posición en clasificación | standings | ✅ |
| Casa vs Fuera | standings + results | ✅ |
| Sanciones activas | sanctions page | ✅ |
| Árbitro de cada partido | actas (referees) | ✅ |
| Fair play / tarjetas equipo | fair_play page | ✅ |
| Head-to-head | actas filtradas | ✅ |

### 1.4 Datos que NO podemos dar
| Dato | Razón |
|---|---|
| Posesión | Requiere ver el partido |
| Estilo de juego | Requiere ver el partido |
| xG / Expected Goals | Requiere tracking de tiros |
| Mapas de calor | Requiere tracking GPS |
| Pases completados | Requiere ver el partido |

---

## Progreso

| Paso | Estado |
|---|---|
| Análisis del codebase | ✅ Completo |
| `build_rival_report()` backend | ✅ Completo |
| `build_referee_intelligence()` backend | ✅ Completo |
| API endpoint para rival report | ✅ Integrado en pipeline |
| `RivalReport.tsx` frontend | ✅ Completo |
| Conectar datos reales en dashboard | ✅ Wired en `App.tsx` |
| Vite build | ✅ Pasa sin errores |
| `RefereeReport.tsx` frontend | ✅ Completo |
| Testing end-to-end | ⏳ Pendiente |
