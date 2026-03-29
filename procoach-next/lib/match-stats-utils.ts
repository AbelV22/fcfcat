import type { MatchNoteEvent } from './match-notes-types'

type EventEntry = Omit<MatchNoteEvent, 'id' | 'match_note_id'>

export interface AutoStats {
  // Goals by half
  goals_1h_for: number
  goals_1h_against: number
  goals_2h_for: number
  goals_2h_against: number
  goals_total_for: number
  goals_total_against: number
  // Shots
  shots_on_target_for: number
  shots_on_target_against: number
  shots_off_target_for: number
  shots_off_target_against: number
  shots_woodwork_for: number
  shots_woodwork_against: number
  // Distribution
  crosses_for: number
  crosses_against: number
  chances_created: number
  assists: number
  pre_assists: number
  accurate_passes: number
  // Defense
  recoveries: number
  turnovers: number
  duels_won: number
  duels_lost: number
  // Discipline
  yellow_cards_for: number
  yellow_cards_against: number
  red_cards_for: number
  red_cards_against: number
  fouls_committed: number
  fouls_suffered: number
  // Corners & offsides
  corners_for: number
  corners_against: number
  offsides_for: number
  offsides_against: number
  // Goalkeeping
  saves_from_events: number
}

/** Compute all auto-calculable stats from events */
export function computeAutoStats(events: EventEntry[]): AutoStats {
  const isOwn = (e: EventEntry) => !e.is_opponent
  const isRival = (e: EventEntry) => e.is_opponent
  const isGoalFor = (e: EventEntry) => e.event_type === 'goal' && e.goal_type !== 'own_goal' && isOwn(e)
  const isGoalAgainst = (e: EventEntry) => e.event_type === 'goal' && (e.goal_type === 'own_goal' || isRival(e))

  return {
    goals_1h_for: events.filter((e) => isGoalFor(e) && e.minute <= 45).length,
    goals_1h_against: events.filter((e) => isGoalAgainst(e) && e.minute <= 45).length,
    goals_2h_for: events.filter((e) => isGoalFor(e) && e.minute > 45).length,
    goals_2h_against: events.filter((e) => isGoalAgainst(e) && e.minute > 45).length,
    goals_total_for: events.filter(isGoalFor).length,
    goals_total_against: events.filter(isGoalAgainst).length,

    shots_on_target_for: events.filter((e) => e.event_type === 'shot_on_target' && isOwn(e)).length,
    shots_on_target_against: events.filter((e) => e.event_type === 'shot_on_target' && isRival(e)).length,
    shots_off_target_for: events.filter((e) => e.event_type === 'shot_off_target' && isOwn(e)).length,
    shots_off_target_against: events.filter((e) => e.event_type === 'shot_off_target' && isRival(e)).length,
    shots_woodwork_for: events.filter((e) => e.event_type === 'shot_woodwork' && isOwn(e)).length,
    shots_woodwork_against: events.filter((e) => e.event_type === 'shot_woodwork' && isRival(e)).length,

    crosses_for: events.filter((e) => e.event_type === 'cross' && isOwn(e)).length,
    crosses_against: events.filter((e) => e.event_type === 'cross' && isRival(e)).length,
    chances_created: events.filter((e) => e.event_type === 'chance_created' && isOwn(e)).length,
    assists: events.filter((e) => e.event_type === 'assist' && isOwn(e)).length,
    pre_assists: events.filter((e) => e.event_type === 'pre_assist' && isOwn(e)).length,
    accurate_passes: events.filter((e) => e.event_type === 'accurate_pass' && isOwn(e)).length,

    recoveries: events.filter((e) => e.event_type === 'recovery' && isOwn(e)).length,
    turnovers: events.filter((e) => e.event_type === 'turnover' && isOwn(e)).length,
    duels_won: events.filter((e) => e.event_type === 'duel_won' && isOwn(e)).length,
    duels_lost: events.filter((e) => e.event_type === 'duel_lost' && isOwn(e)).length,

    yellow_cards_for: events.filter((e) => e.event_type === 'yellow_card' && isOwn(e)).length,
    yellow_cards_against: events.filter((e) => e.event_type === 'yellow_card' && isRival(e)).length,
    red_cards_for: events.filter((e) => e.event_type === 'red_card' && isOwn(e)).length,
    red_cards_against: events.filter((e) => e.event_type === 'red_card' && isRival(e)).length,
    fouls_committed: events.filter((e) => e.event_type === 'foul_committed' && isOwn(e)).length,
    fouls_suffered: events.filter((e) => e.event_type === 'foul_suffered' && isOwn(e)).length,

    corners_for: events.filter((e) => e.event_type === 'corner' && isOwn(e)).length,
    corners_against: events.filter((e) => e.event_type === 'corner' && isRival(e)).length,
    offsides_for: events.filter((e) => e.event_type === 'offside' && isOwn(e)).length,
    offsides_against: events.filter((e) => e.event_type === 'offside' && isRival(e)).length,

    saves_from_events: events.filter((e) => e.event_type === 'save' && isOwn(e)).length,
  }
}
