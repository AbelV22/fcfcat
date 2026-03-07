import { useState, useMemo } from 'react';
import { X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface PlayerData {
  name: string;
  dorsal: number | null;
  appearances: number;
  starts: number;
  goals: number;
  yellow_cards: number;
  red_cards: number;
  double_yellows: number;
  minutes_played: number;
}

interface MatchResult {
  jornada: number;
  date: string;
  home_team: string;
  away_team: string;
  home_score?: number;
  away_score?: number;
}

interface RivalPlayersTableProps {
  players: Record<string, PlayerData>;
  rivalName: string;
  onClose: () => void;
  results?: MatchResult[];
}

type SortKey = 'dorsal' | 'name' | 'appearances' | 'minutes_played' | 'goals' | 'yellow_cards';

export default function RivalPlayersTable({ players, rivalName, onClose, results = [] }: RivalPlayersTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('appearances');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const lastJornada = useMemo(() => {
    if (results.length === 0) return 0;
    return Math.max(...results.map(r => r.jornada));
  }, [results]);

  const getYellowStatus = (yellowCards: number, _playerName: string) => {
    if (yellowCards < 5) return null;
    const sanctionJornada = lastJornada - (yellowCards - 4);
    if (sanctionJornada <= lastJornada - 2) {
      return { served: true, remaining: 0 };
    }
    return { served: false, remaining: lastJornada - sanctionJornada + 1 };
  };

  const getRedStatus = (redCards: number) => {
    if (redCards === 0) return null;
    const sanctionJornada = lastJornada - 1;
    if (sanctionJornada <= lastJornada - 1) {
      return { served: true, remaining: 0 };
    }
    return { served: false, remaining: lastJornada - sanctionJornada + 1 };
  };

  const playersList = useMemo(() => {
    return Object.values(players).sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortKey) {
        case 'dorsal':
          aVal = a.dorsal ?? 999;
          bVal = b.dorsal ?? 999;
          break;
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'appearances':
          aVal = a.appearances;
          bVal = b.appearances;
          break;
        case 'minutes_played':
          aVal = a.minutes_played;
          bVal = b.minutes_played;
          break;
        case 'goals':
          aVal = a.goals;
          bVal = b.goals;
          break;
        case 'yellow_cards':
          aVal = a.yellow_cards;
          bVal = b.yellow_cards;
          break;
        default:
          aVal = a.appearances;
          bVal = b.appearances;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [players, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown size={12} style={{ opacity: 0.3, marginLeft: 4 }} />;
    return sortDir === 'asc' ? <ArrowUp size={12} style={{ marginLeft: 4 }} /> : <ArrowDown size={12} style={{ marginLeft: 4 }} />;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem',
    }} onClick={onClose}>
      <div style={{
        background: 'rgba(15,23,42,0.95)',
        border: '1px solid rgba(6,182,212,0.3)',
        borderRadius: '1rem',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '85vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'linear-gradient(90deg, rgba(6,182,212,0.1), transparent)',
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--accent-cyan)' }}>📊</span>
              Plantilla de {rivalName}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {playersList.length} jugadores · Clic en columnas para ordenar
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '0.5rem',
              padding: '0.5rem',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Table */}
        <div style={{ overflow: 'auto', flex: 1, padding: '0.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{
                background: 'rgba(255,255,255,0.03)',
                position: 'sticky',
                top: 0,
              }}>
                <th
                  onClick={() => handleSort('dorsal')}
                  style={{
                    padding: '0.75rem 0.5rem',
                    textAlign: 'center',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    width: '60px',
                    borderBottom: '2px solid rgba(6,182,212,0.3)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    #<SortIcon column="dorsal" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    borderBottom: '2px solid rgba(6,182,212,0.3)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    Jugador<SortIcon column="name" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('appearances')}
                  style={{
                    padding: '0.75rem 0.5rem',
                    textAlign: 'center',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    width: '70px',
                    borderBottom: '2px solid rgba(6,182,212,0.3)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    PJ<SortIcon column="appearances" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('minutes_played')}
                  style={{
                    padding: '0.75rem 0.5rem',
                    textAlign: 'center',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    width: '80px',
                    borderBottom: '2px solid rgba(6,182,212,0.3)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    Min<SortIcon column="minutes_played" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('goals')}
                  style={{
                    padding: '0.75rem 0.5rem',
                    textAlign: 'center',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    width: '70px',
                    borderBottom: '2px solid rgba(6,182,212,0.3)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    Goles<SortIcon column="goals" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('yellow_cards')}
                  style={{
                    padding: '0.75rem 0.5rem',
                    textAlign: 'center',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    width: '90px',
                    borderBottom: '2px solid rgba(6,182,212,0.3)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    🟨<SortIcon column="yellow_cards" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {playersList.map((player, idx) => (
                <tr
                  key={player.name}
                  style={{
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {player.dorsal ?? '—'}
                  </td>
                  <td style={{ padding: '0.6rem 1rem', fontWeight: 500 }}>
                    {player.name}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.8)' }}>
                    {player.appearances}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.8)' }}>
                    {player.minutes_played}'
                  </td>
                  <td style={{
                    padding: '0.6rem 0.5rem',
                    textAlign: 'center',
                    fontWeight: player.goals > 0 ? 700 : 400,
                    color: player.goals > 0 ? '#10b981' : 'rgba(255,255,255,0.7)',
                  }}>
                    {player.goals}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        {player.yellow_cards > 0 && (
                          <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            color: player.yellow_cards >= 4 ? '#f59e0b' : '#f59e0b',
                            fontWeight: player.yellow_cards >= 4 ? 700 : 500,
                          }}>
                            <span style={{ width: 8, height: 11, background: '#f59e0b', borderRadius: 1 }} />
                            {player.yellow_cards}
                          </span>
                        )}
                        {player.yellow_cards === 0 && <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>}
                        {player.red_cards > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#ef4444', fontWeight: 700 }}>
                            <span style={{ width: 8, height: 11, background: '#ef4444', borderRadius: 1 }} />
                            {player.red_cards}
                          </span>
                        )}
                      </div>
                      {player.yellow_cards >= 5 && (() => {
                        const status = getYellowStatus(player.yellow_cards, player.name);
                        if (status?.served) {
                          return (
                            <span style={{
                              fontSize: '0.55rem',
                              background: '#10b981',
                              color: '#000',
                              padding: '0.1rem 0.3rem',
                              borderRadius: '0.25rem',
                              fontWeight: 700,
                              marginTop: '2px',
                            }}>
                              CUMPLIDA
                            </span>
                          );
                        }
                        return (
                          <span style={{
                            fontSize: '0.55rem',
                            background: '#f59e0b',
                            color: '#000',
                            padding: '0.1rem 0.3rem',
                            borderRadius: '0.25rem',
                            fontWeight: 700,
                            marginTop: '2px',
                          }}>
                            {status?.remaining || 1} PARTIDO{status?.remaining !== 1 ? 'S' : ''}
                          </span>
                        );
                      })()}
                      {player.red_cards >= 1 && (() => {
                        const status = getRedStatus(player.red_cards);
                        if (status?.served) {
                          return (
                            <span style={{
                              fontSize: '0.55rem',
                              background: '#10b981',
                              color: '#000',
                              padding: '0.1rem 0.3rem',
                              borderRadius: '0.25rem',
                              fontWeight: 700,
                              marginTop: '2px',
                            }}>
                              CUMPLIDA
                            </span>
                          );
                        }
                        return (
                          <span style={{
                            fontSize: '0.55rem',
                            background: '#ef4444',
                            color: '#fff',
                            padding: '0.1rem 0.3rem',
                            borderRadius: '0.25rem',
                            fontWeight: 700,
                            marginTop: '2px',
                          }}>
                            {status?.remaining || 1} PARTIDO{status?.remaining !== 1 ? 'S' : ''}
                          </span>
                        );
                      })()}
                      {player.yellow_cards === 4 && (
                        <span style={{
                          fontSize: '0.55rem',
                          background: '#f59e0b',
                          color: '#000',
                          padding: '0.1rem 0.3rem',
                          borderRadius: '0.25rem',
                          fontWeight: 700,
                          marginTop: '2px',
                        }}>
                          APERC.
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.75rem 1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
        }}>
          <span>Total jugadores: {playersList.length}</span>
          <span>🟨 = Amarillas · 🟥 = Rojas</span>
        </div>
      </div>
    </div>
  );
}
