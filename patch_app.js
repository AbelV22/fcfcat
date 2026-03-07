const fs = require('fs');
let code = fs.readFileSync('procoach/src/App.tsx', 'utf-8');

// Header variables
const varsBlock = `  const standings = fcfTeamData.data?.standings ?? [];
  const intelligence = fcfTeamData.data?.team_intelligence ?? {};

  // --- Dynamic Next Match ---
  const matchRival = fcfTeamData.data?.meta?.rival || "Próximo Rival";
  const rivalReport = fcfTeamData.data?.rival_report ?? fcfTeamData.data?.rival_intelligence ?? {};
  const rpStanding = rivalReport.standing ?? {};
  const rpRank = rpStanding.position ? \`\${rpStanding.position}º\` : '-';
  const rpTopScorers = rivalReport.top_scorers ?? [];
  const rpGoalsPeriod = rivalReport.goals_by_period ?? {};
  const rpMaxGoalPeriod = Math.max(1, ...['0-15', '16-30', '31-45', '46-60', '61-75', '76-90'].map(p => Math.max(rpGoalsPeriod[p]?.scored || 0, rpGoalsPeriod[p]?.conceded || 0)));
  const rpCards = rivalReport.cards ?? [];
  const rpRecent = rivalReport.recent_results ?? [];
  const rpXI = rivalReport.probable_xi ?? [];
  const rpInsights = fcfTeamData.data?.rival_insights ?? [];
  const rpComparison = rivalReport.comparison ?? { our_gf: 0, rival_gf: 0, our_gc: 0, rival_gc: 0, our_points: 0, rival_points: 0 };
  const rpRecord = rivalReport.record ?? {wins:0,draws:0,losses:0,goals_scored:0,goals_conceded:0};
  
  const mySanctions = (fcfTeamData.data?.team_intelligence?.sanctions || []).map((s: any) => ({ name: s.player, issue: \`Sancionado \${s.matches} partidos\`, time: "NO PUEDE JUGAR", isRed: true }));
  const myCardsDesc = (fcfTeamData.data?.team_intelligence?.cards?.filter((c: any) => c.apercibido) || []).map((c: any) => ({ name: c.name, issue: "4 Tarjetas Amarillas", time: "Apercibido", isYellow: true }));
  const myAlerts = [...mySanctions, ...myCardsDesc];`;

code = code.replace(
    "  const standings = fcfTeamData.data?.standings ?? [];\n  const intelligence = fcfTeamData.data?.team_intelligence ?? {};",
    varsBlock
);

// Simple replacements
code = code.replace("AE Prat B (9º)", "{matchRival} ({rpRank})");
code = code.replace("Tu Acadèmia vs AE Prat B", "{fcfTeamData.teamName} vs {matchRival}");
code = code.replace("Goleadores de la AE Prat B", "Goleadores de {matchRival}");
code = code.replace("Goles por Franja (AE Prat B)", "Goles por Franja ({matchRival})");
code = code.replace("Tarjetas de la AE Prat B", "Tarjetas de {matchRival}");
code = code.replace("Últimos Resultados AE Prat B", "Últimos Resultados {matchRival}");
code = code.replace("Titulares Habituales (AE Prat B)", "Titulares Habituales ({matchRival})");
code = code.replace("Insights Avanzados (AE Prat B)", "Insights Avanzados ({matchRival})");
code = code.replace("Total Goles Favor: 32", "Total GF: {rpRecord.goals_scored}");
code = code.replace("Marcados (Total 32)", "Marcados ({rpRecord.goals_scored})");
code = code.replace("Encajados (Total 38)", "Encajados ({rpRecord.goals_conceded})");
code = code.replace("Suman 41 amarillas · 4 rojas directas en toda la liga", "{rivalReport.total_yellows ?? 0} amarillas · {rivalReport.total_reds ?? 0} rojas en liga");

// Goal minutes
const goalBarsOrig = `                  <GoalMinuteBar label="0-15'" scored={2} conceded={7} maxVal={10} />
                  <GoalMinuteBar label="16-30'" scored={5} conceded={5} maxVal={10} />
                  <GoalMinuteBar label="31-45'" scored={4} conceded={6} maxVal={10} />
                  <GoalMinuteBar label="46-60'" scored={7} conceded={5} maxVal={10} />
                  <GoalMinuteBar label="61-75'" scored={6} conceded={9} maxVal={10} />
                  <GoalMinuteBar label="76-90'" scored={8} conceded={6} maxVal={10} />`;
const goalBarsNew = `                  {['0-15', '16-30', '31-45', '46-60', '61-75', '76-90'].map(p => (
                    <GoalMinuteBar key={p} label={\`\${p}'\`} scored={rpGoalsPeriod[p]?.scored ?? 0} conceded={rpGoalsPeriod[p]?.conceded ?? 0} maxVal={rpMaxGoalPeriod} />
                  ))}`;
code = code.replace(goalBarsOrig, goalBarsNew);

// Top Scorers
const blockScorersOrig = `<ScorerRow rank={1} name="A. Ruiz" goals={9} pct={28} matches={19} />
                  <ScorerRow rank={2} name="C. Gómez" goals={5} pct={16} matches={15} />
                  <ScorerRow rank={3} name="M. Castro" goals={4} pct={13} matches={20} />
                  <ScorerRow rank={4} name="P. Silva" goals={4} pct={13} matches={18} />
                  <ScorerRow rank={5} name="Otros (6 jug.)" goals={10} pct={30} matches={0} />`;
const blockScorersNew = `{rpTopScorers.length > 0 ? rpTopScorers.slice(0, 5).map((s: any, i: number) => (
                    <ScorerRow key={i} rank={i+1} name={s.name} goals={s.goals} pct={s.pct_of_total} matches={0} />
                  )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin datos de goleadores.</p>}`;
code = code.replace(blockScorersOrig, blockScorersNew);

// Cards
const blockCardsOrig = `<CardRow name="J. Fernández (5)" yellows={4} reds={1} apercibido />
                  <CardRow name="D. Blanco (8)" yellows={4} reds={0} apercibido />
                  <CardRow name="A. Ruiz (9)" yellows={3} reds={0} />
                  <CardRow name="M. Castro (11)" yellows={2} reds={0} />
                  <CardRow name="S. Martín (3)" yellows={2} reds={1} />
                  <CardRow name="L. Torres (2)" yellows={1} reds={0} />`;
const blockCardsNew = `{rpCards.length > 0 ? rpCards.slice(0, 6).map((c: any, i: number) => (
                    <CardRow key={i} name={\`\${c.name} \${c.dorsal ? \`(\${c.dorsal})\` : ''}\`} yellows={c.yellows} reds={c.reds} apercibido={c.apercibido} />
                  )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin datos de tarjetas.</p>}`;
code = code.replace(blockCardsOrig, blockCardsNew);

// Alerts (My squad)
const blockAlertsOrig = `<AlertItem name="Marc Garcia (8)" issue="4 Tarjetas Amarillas" time="Apercibido" isYellow />
                  <AlertItem name="Alex Fernández (5)" issue="Sancionado 1 partido (resolución FCF)" time="NO PUEDE JUGAR" isRed />
                  <AlertItem name="David López (11)" issue="3 Tarjetas Amarillas" time="A 2 de sanción" isYellow />
                  <AlertItem name="Sergio Ruiz (2)" issue="Sancionado 2 partidos" time="Falta 1 partido" isRed />`;
const blockAlertsNew = `{myAlerts.length > 0 ? myAlerts.slice(0, 4).map((a: any, i: number) => (
                    <AlertItem key={i} name={a.name} issue={a.issue} time={a.time} isRed={a.isRed} isYellow={a.isYellow} />
                  )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin alertas en tu plantilla.</p>}`;
code = code.replace(blockAlertsOrig, blockAlertsNew);

// Recent results
const resultsOrig = `<ResultRow jornada="J20" home="Bellvitge" away="Prat B" scoreH={2} scoreA={0} rivalSide="away" />
                  <ResultRow jornada="J19" home="Prat B" away="Racing Vallb." scoreH={1} scoreA={1} rivalSide="home" />
                  <ResultRow jornada="J18" home="Barceloneta" away="Prat B" scoreH={3} scoreA={2} rivalSide="away" />
                  <ResultRow jornada="J17" home="Prat B" away="Montserratina" scoreH={1} scoreA={0} rivalSide="home" />
                  <ResultRow jornada="J16" home="Prat B" away="Gavà 2013" scoreH={2} scoreA={4} rivalSide="home" />`;
const resultsNew = `{rpRecent.length > 0 ? rpRecent.slice(0, 5).map((r: any, i: number) => (
                    <ResultRow key={i} jornada={\`J\${r.jornada}\`} home={r.home_team} away={r.away_team} scoreH={r.home_score} scoreA={r.away_score} rivalSide={r.rival_side} />
                  )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin recientes.</p>}`;
code = code.replace(resultsOrig, resultsNew);

const resultsStatOrig = `<MiniStat label="Casa (Liga)" value="4V 4E 2D" />
                  <MiniStat label="Fuera (Liga)" value="2V 2E 6D" />`;
const resultsStatNew = `<MiniStat label="Casa (Liga)" value={rpStanding.home_record || '-'} />
                  <MiniStat label="Fuera (Liga)" value={rpStanding.away_record || '-'} />`;
code = code.replace(resultsStatOrig, resultsStatNew);

// XI
const xiOrig = `<AppearanceRow name="A. Ruiz" dorsal={9} apps={19} total={20} />
                  <AppearanceRow name="J. Fernández" dorsal={5} apps={18} total={20} />
                  <AppearanceRow name="M. Castro" dorsal={11} apps={17} total={20} />
                  <AppearanceRow name="D. Blanco" dorsal={8} apps={17} total={20} />
                  <AppearanceRow name="C. Gómez" dorsal={7} apps={15} total={20} />
                  <AppearanceRow name="S. Martín" dorsal={3} apps={14} total={20} />
                  <AppearanceRow name="L. Torres" dorsal={2} apps={13} total={20} />
                  <AppearanceRow name="P. Silva" dorsal={10} apps={12} total={20} />`;
const xiNew = `{rpXI.length > 0 ? rpXI.slice(0, 8).map((p: any, i: number) => (
                    <AppearanceRow key={i} name={p.name} dorsal={p.dorsal || 0} apps={p.starts} total={rpStanding.played ?? 20} />
                  )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin datos de XI.</p>}`;
code = code.replace(xiOrig, xiNew);

// Replace Comparativa
const compOrig = `<ProgressBar label="Goles a Favor" leftVal="48" rightVal="32" leftPct={60} rightPct={40} />
                      <div style={{ height: '0.5rem' }}></div>
                      <ProgressBar label="Goles en Contra" leftVal="31" rightVal="38" leftPct={45} rightPct={55} reverseColors />
                      <div style={{ height: '0.5rem' }}></div>
                      <ProgressBar label="Puntos" leftVal="29" rightVal="24" leftPct={55} rightPct={45} />`;
const compNew = `<ProgressBar label="Goles a Favor" leftVal={String(rpComparison.our_gf)} rightVal={String(rpComparison.rival_gf)} leftPct={100} rightPct={100 * (rpComparison.rival_gf / (rpComparison.our_gf || 1))} />
                      <div style={{ height: '0.5rem' }}></div>
                      <ProgressBar label="Goles en Contra" leftVal={String(rpComparison.our_gc)} rightVal={String(rpComparison.rival_gc)} leftPct={100} rightPct={100 * (rpComparison.rival_gc / (rpComparison.our_gc || 1))} reverseColors />
                      <div style={{ height: '0.5rem' }}></div>
                      <ProgressBar label="Puntos" leftVal={String(rpComparison.our_points)} rightVal={String(rpComparison.rival_points)} leftPct={100} rightPct={100 * (rpComparison.rival_points / (rpComparison.our_points || 1))} />`;
code = code.replace(compOrig, compNew);

// Alertas del rival
const alertRivalOrig = `<InsightItem type="danger" text="Llegan tras una remontada (Prat B 3-1 contra Sarrià)." />
                      <InsightItem type="warning" text="Suelen encajar pronto: 7 goles en contra en los primeros 15 min." />
                      <InsightItem type="info" text="H. Gómez (dorsal 4): Vuelve de sanción por roja directa." />
                      <InsightItem type="success" text="La segunda peor defensa del top 10 (38 GF)." />
                      <InsightItem type="warning" text="Peligro: A. Ruiz (9 goles, 28% de los goles del equipo)." />`;
const alertRivalNew = `{rpInsights.length > 0 ? rpInsights.slice(0, 5).map((ns: any, i: number) => {
                        const typeVal = ns.type === 'recent_form' ? 'danger' : ns.type === 'weakest_period' ? 'success' : 'warning';
                        return <InsightItem key={i} type={typeVal} text={ns.detail} />;
                      }) : <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin alertas importantes.</p>}`;
code = code.replace(alertRivalOrig, alertRivalNew);

// Insights list
const insightListOrig = `<ConditionalInsight
                    condition="Cuando encajan en los primeros 30 min..."
                    result="Pierden el 75% de esos partidos"
                    detail="6 de 8 partidos → Derrota"
                    color="var(--accent-green)"
                  />
                  <ConditionalInsight
                    condition="Cuando van perdiendo al descanso..."
                    result="Solo han remontado 1 de 7 veces"
                    detail="14% de remontadas"
                    color="var(--accent-green)"
                  />
                  <ConditionalInsight
                    condition="Puntos ganados con goles en los últ. 15 min"
                    result="+6 puntos extra"
                    detail="3 empates convertidos en victoria"
                    color="var(--accent-cyan)"
                  />
                  <ConditionalInsight
                    condition="Puntos perdidos por goles encajados en últ. 15 min"
                    result="−4 puntos perdidos"
                    detail="2 victorias → empate, 1 empate → derrota"
                    color="#ef4444"
                  />
                  <ConditionalInsight
                    condition="Cuando marcan primero..."
                    result="Ganan el 80% de las veces"
                    detail="8 de 10 partidos"
                    color="#f59e0b"
                  />`;
const insightListNew = `{rpInsights.length > 0 ? rpInsights.map((ns: any, i: number) => {
                    const insightColor = ns.type === 'home_record' ? '#10b981' : ns.type === 'away_record' ? '#a78bfa' : ns.type === 'recent_form' ? '#f59e0b' : ns.type === 'strongest_period' ? '#ef4444' : ns.type === 'weakest_period' ? '#10b981' : 'var(--accent-cyan)';
                    return (
                      <ConditionalInsight key={i} condition={ns.label} result={ns.label} detail={ns.detail} color={insightColor} />
                    );
                  }) : <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin insights avanzados.</p>}`;
code = code.replace(insightListOrig, insightListNew);

// Lineup dots dynamic coords mapping
const pitchOrig = `<PlayerDot x="12%" y="50%" num="1" color="#f59e0b" />
                      {/* Defensa L4 */}
                      <PlayerDot x="30%" y="20%" num="2" color="#ef4444" />
                      <PlayerDot x="25%" y="40%" num="4" color="#ef4444" />
                      <PlayerDot x="25%" y="60%" num="5" color="#ef4444" />
                      <PlayerDot x="30%" y="80%" num="3" color="#ef4444" />
                      {/* Medio L3 */}
                      <PlayerDot x="50%" y="25%" num="8" color="#ef4444" />
                      <PlayerDot x="45%" y="50%" num="6" color="#ef4444" />
                      <PlayerDot x="50%" y="75%" num="10" color="#ef4444" />
                      {/* Delantera L3 */}
                      <PlayerDot x="75%" y="25%" num="7" color="#ef4444" />
                      <PlayerDot x="85%" y="50%" num="9" color="#ef4444" />
                      <PlayerDot x="75%" y="75%" num="11" color="#ef4444" />`;
const pitchNew = `{(function(){
                        const coords = [
                          {x: "12%", y: "50%", c: "#f59e0b"}, {x: "30%", y: "20%", c: "#ef4444"}, {x: "25%", y: "40%", c: "#ef4444"},
                          {x: "25%", y: "60%", c: "#ef4444"}, {x: "30%", y: "80%", c: "#ef4444"}, {x: "50%", y: "25%", c: "#ef4444"},
                          {x: "45%", y: "50%", c: "#ef4444"}, {x: "50%", y: "75%", c: "#ef4444"}, {x: "75%", y: "25%", c: "#ef4444"},
                          {x: "85%", y: "50%", c: "#ef4444"}, {x: "75%", y: "75%", c: "#ef4444"}
                        ];
                        const items = rpXI.slice(0, 11);
                        if(items.length === 0) return <p style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Sin datos de XI</p>;
                        return items.map((p: any, i: number) => (
                           <PlayerDot key={i} x={coords[i%11].x} y={coords[i%11].y} num={p.dorsal?.toString() || '?'} color={coords[i%11].c} />
                        ));
                      })()}`;
code = code.replace(pitchOrig, pitchNew);

const refOrig = `<RefStat label="Partidos Temp." value="14" />
                  <RefStat label="Amarillas/Part." value="5.1" warning />
                  <RefStat label="Rojas/Part." value="0.4" />
                  <RefStat label="Penaltis/Part." value="0.6" warning />`;
const refNew = `<RefStat label="Historial" value="Pendiente" />
                  <RefStat label="Amarillas/Part." value="-" />
                  <RefStat label="Rojas/Part." value="-" />
                  <RefStat label="Penaltis/Part." value="-" />`;
code = code.replace(refOrig, refNew);

// Referee string changes
code = code.replace("Julio Méndez", "Asignación pendiente");
code = code.replace("M. Rodríguez Silva", "Árbitro no asignado (demo)");
code = code.replace("Delegació: Baix Llobregat", "Falta confirmación oficial");
code = code.replace("Delegació Baix Llobregat · 14 partidos esta temporada", "Falta confirmación de historial");

const refTextOrig = `<p style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }}></span>
                    <span style={{ color: 'rgba(255,255,255,0.85)' }}>Árbitro casero: Suele pitar más faltas al visitante.</span>
                  </p>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-cyan)', boxShadow: '0 0 6px var(--accent-cyan)' }}></span>
                    <span style={{ color: 'rgba(255,255,255,0.85)' }}>Último Acta: Prat B 2-2 Guineueta</span>
                  </p>`;
const refTextNew = `<p style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', boxShadow: '0 0 6px rgba(255,255,255,0.2)' }}></span>
                    <span style={{ color: 'rgba(255,255,255,0.85)' }}>Esperando designación arbitral.</span>
                  </p>`;
code = code.replace(refTextOrig, refTextNew);


fs.writeFileSync('procoach/src/App.tsx', code, 'utf-8');
console.log('App patched!');
