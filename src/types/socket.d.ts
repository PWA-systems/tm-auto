declare interface ServerToClientEvents {
  MatchEnded: (match: Match) => void;
  MatchQueued: (match: MatchQueued) => void;
  QueueF: (fieldsetKey: number, match: Match[]) => void;
  MatchStarted: (Match: Match) => void;
  MatchScored: (Match: MatchScored) => void;
  MatchTimeUpdate: (match: MatchQueued) => void;
}
declare interface ClientToServerEvents {
  JoinFieldset: (fieldset: number, event: EventString) => void;
  JoinField: (field: number, event: EventString) => void;
  JoinMatch: (match: MatchId, event: EventString) => void;
  JoinOverly: () => void;
  LeaveFieldset: (fieldset: number, event: EventString) => void;
  LeaveField: (field: number, event: EventString) => void;
  LeaveMatch: (match: MatchId, event: EventString) => void;
  LeaveOverly: () => void;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
declare interface InterServerEvents {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
declare interface SocketData {}

declare enum EventTypes {
  MatchEvent,
  MatchTimeEvent,
  QueueF,
}
declare type EventString = keyof typeof EventTypes;
declare enum EventQualifiers {
  fs, //fieldset
  f, //field
  m, //match
  a, //all
}
declare type EventQualifierString = keyof typeof EventQualifiers;

declare type MatchId = string;
declare type TeamId = string;
declare interface Match {
  Id: MatchId;
  TeamIds: TeamId[];
  FieldName: string;
  ScheduledTime: Date;
}
declare interface MatchQueued extends Match {
  RemainingSeconds?: number;
}

declare interface MatchScored {
  Id: MatchId;
  Alliances: {
    Color: "RED" | "BLUE";
    Teams: TeamId[];
    Score: number;
    WP: boolean;
  }[];
  FieldName: string;
  ScheduledTime: Date;
}

declare interface MatchResult {
  id: MatchId;
  round: number;
  instance: number;
  match: number;
  state: number;
  scheduledFor: number;
  fieldName: btring;
  auto: "NONE" | "RED" | "BLUE" | "TIE";
  alliances: {
    color: "RED" | "BLUE";
    wp: boolean;
    ringsBase: number;
    ringsMid: number;
    ringsHigh: number;
    mgZone: number;
    mgHigh: number;
    roboHigh: number;
    score: number;
    teams: { number: TeamId; dq: boolean; no_show: boolean }[];
  }[];
}
