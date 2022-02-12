import { TMWeb, TMWebConnect } from "./wrappers/tmWeb";
import { EventEmitter } from "events";
import { Fieldset } from "./fieldset";
import { Database } from "@/tmapi/wrappers/sqlite3";
import { SendNext3Matches, SendMatchScore } from "./socket";
export class Tournament extends EventEmitter {
  public tmWeb = new TMWeb();
  public eBus = new EventEmitter();
  public fieldsets = new Map<number, Fieldset>();
  async connect(tmWeb: TMWebConnect): Promise<Tournament> {
    await this.tmWeb.connect(tmWeb);
    await this.updateFieldsets();
    return this;
    // await this.tmWeb.getFieldSets()
  }
  private _db = new Database();
  async updateFieldsets(): Promise<Tournament> {
    await this.tmWeb.getFieldsets().then((_fs) => {
      _fs.forEach((elm) => {
        const fieldset = this.fieldsets.get(elm.id);
        if (fieldset) {
          //reconnect with new cookie
          fieldset.connect({
            host: this.tmWeb.getURL,
            id: elm.id,
            cookie: this.tmWeb.getAuthKey || "",
            type: elm.type,
            name: elm.name,
          });
        } else {
          //fieldset didn't exist; create new fieldset
          const fs = new Fieldset({
            host: this.tmWeb.getURL,
            id: elm.id,
            cookie: this.tmWeb.getAuthKey || "",
            type: elm.type,
            name: elm.name,
          });
          //add listeners
          fs.on("wsError", () => this.tmWeb.authGuard().catch());
          fs.on("wsClose", () => this.tmWeb.authGuard().catch());

          //map fieldset
          this.fieldsets.set(fs.getId, fs);
        }
      });
    });
    return this;
  }
  constructor() {
    super();
    // setInterval(() => {
    //   this.tmWeb.authGuard().catch((e) => console.error(e));
    // }, 10000);
  }

  get DB(): Database {
    return this._db;
  }

  toMatchId(round: number, instance: number, match: number): string {
    if (round === 15) return `F ${match}`;
    else if (round === 2) return `Q${match}`;
    else if (round === 1) return `P${match}`;
    else return `Q${match}`;
  }
  async getFutureMatches(count: number, fieldId: number): Promise<Match[]> {
    //TODO sql
    const rows = await this.DB.all(
      `select m.id,m.division,m.round,m.instance,m.match,m.projected_time,f.name as fieldName, at.alliances_id, t.number as teamNumber
        from matches m
        Left Join matches_have_fields mf on mf.matches_id = m.Id 
        Left Join matches_have_alliances ma on ma.matches_id = m.Id
        Left Join alliances_have_teams at on at.alliances_id = ma.alliances_id
        Left Join teams t on t.Id = at.teams_id
        Left Join fields f on f.Id = mf.fields_id
        where m.state = 0 and mf.fields_id = ?
        order by m.projected_time, at.alliances_id, t.tiebreaker
        LIMIT ?`,
      [fieldId, count]
    );
    console.log(rows);
    const matches: Match[] = [];
    rows.forEach((row, index) => {
      // console.log(index, (1 + index) % 2, matches, row);
      if (index % 2) {
        matches[matches.length - 1].TeamIds.push(row.teamNumber);
      } else {
        const m = {
          FieldName: row.fieldName,
          Id: this.toMatchId(row.round, row.instance, row.match),
          ScheduledTime: new Date(row.projected_time * 1000),
          TeamIds: [row.teamNumber],
        };
        // console.log(m);
        matches.push(m);
      }
    });
    return matches;
  }
  private _pullingInterval: NodeJS.Timer | null = null;
  private _pulling: {
    matchId: MatchId;
    // fieldId: number; //1,2,3...
    timeout: NodeJS.Timeout;
    maxState: number;
  }[] = [];
  setDBPull(matchId: MatchId): void {
    // this._pulling is has elements and this match is one of them then return
    if (
      this._pulling.length > 0 &&
      this._pulling.find((m) => (m ? m.matchId === matchId : false))
    )
      return;

    // push this match to the pulling list
    this._pulling.push({
      matchId: matchId,
      // fieldId: fieldId,
      maxState: 0,
      timeout: setTimeout(() => {
        this.timeoutPulling(matchId);
      }, 10 * 60 * 1000),
    });

    // start pulling if not already pulling
    if (this._pullingInterval === null) {
      this._pullingInterval = setInterval(() => {
        try {
          this.pullDB();
        } catch (error) {
          const e = error as Error;
        }
      }, 10 * 1000);
    }
  }
  timeoutPulling(matchId: MatchId): void {
    const index = this._pulling.findIndex((m) => m.matchId === matchId);
    if (index !== -1) clearTimeout(this._pulling[index].timeout);
    {
      console.error({ msg: "match timeout", data: this._pulling[index] });
      delete this._pulling[index];
    }
  }
  pullDB(): void {
    {
      if (!this._pulling) {
        console.log("errr");
        return;
      }
      if (this._pulling.length === 0 && this._pullingInterval) {
        clearInterval(this._pullingInterval);
        this._pullingInterval = null;
        return; //nothing to do
      }
      this._pulling.forEach(async (p, index) => {
        try {
          const row = await this.DB.get(
            `with pre as (
              select
                  m.id as key,
                  m.round,
                  m.instance,
                  m.match,
                  m.state,
                  m.projected_time,
                  f.name as fieldName,
                  case 
                      when sum(asg.auto_tie) <> 0 then 'TIE'
                      when sum(case when asg.auto = 1 then asg.alliances_id else 0 end) = 0 then 'NONE'
                      when sum(case when asg.auto = 1 then asg.alliances_id else 0 end) % 2 = 0 then 'RED'
                      when sum(case when asg.auto = 1 then asg.alliances_id else 0 end) % 2 = 1 then 'BLUE'
                  end as auto,
                  case m.round 
                      when 1 then 'P' || m.match
                      when 2 then 'Q' || m.match
                      when 5 then 'F ' || m.match
                      when 4 then 'SF ' || m.instance || '-' || m.match
                      when 3 then 'QF ' || m.instance || '-' || m.match
                      when 6 then 'R16 ' || m.instance || '-' || m.match
                      when 7 then 'R32 ' || m.instance || '-' || m.match
                      when 8 then 'R64 ' || m.instance || '-' || m.match
                      when 9 then 'R128 ' || m.instance || '-' || m.match
                  end as id
              
                  from matches m
                  left join alliance_scores_generic as asg on asg.matches_id = m.id
                  left join matches_have_fields mhf on mhf.matches_id = m.id
                  left join fields f on f.id = mhf.fields_id and f.field_sets_id = mhf.field_sets_id
                  group by m.round, m.instance, m.match, m.state, m.projected_time, f.name
              )
              select 
                  json_group_array(
                      json_object(
                          'id',m.id,
                          'round',m.round,
                          'instance',m.instance,
                          'match',m.match,
                          'state',m.state,
                          'scheduledFor',m.projected_time,
                          'fieldName',m.fieldName,
                          'auto',m.auto,
                          'alliances',( select 
                              json_group_array(
                                  json_object(
                                      'color', case when asg.alliances_id % 2 = 1 then 'RED' else 'BLUE' end,
                                      'wp', case when asg.auto_wp = 1 then json('true') else json('false') end,
                                      'ringsBase', asg.base_rings,
                                      'ringsMid', asg.mid_branch_rings,
                                      'ringsHigh', asg.high_branch_rings,
                                      'mgZone', asg.zone_mobile_goals,
                                      'mgHigh', asg.elevated_mobile_goals,
                                      'robotHigh', asg.elevated_robots,
                                      'score', asg.base_rings * 1
                                          + asg.mid_branch_rings * 3
                                          + asg.high_branch_rings * 10
                                          + asg.zone_mobile_goals * 20
                                          + asg.elevated_mobile_goals * 40
                                          + asg.elevated_robots * 30
                                          + asg.auto_tie * 3
                                          + asg.auto * 6,
                                      'teams', ( select
                                              json_group_array(
                                                  json_object(
                                                      'number', t.number,
                                                      'dq', case when tsg.dq = 1 then json('true') else json('false') end,
                                                      'no_show', case when tsg.no_show = 1 then json('true') else json('false') end
                                                  )
                                              )
                                              from alliances_have_teams aht
                                              left join teams t on t.id = aht.teams_id
                                              left join team_scores_generic tsg on tsg.teams_id = t.id and tsg.matches_id = m.key
                                              where aht.alliances_id = asg.alliances_id
                                          )
                                      )                                        
                                  )
                              from alliance_scores_generic as asg
                              where asg.matches_id=m.key
                          )
                      )
                  ) as matchResults
              from pre as m
              where m.id = ?`,
            [p.matchId]
          );
          if (row.matchResults.length === 0) throw new Error("match not found");
          console.log(row);
          const matchResults = JSON.parse(row.matchResults)[0] as MatchResult;
          console.log({ msg: "pulling", state: matchResults.state, p: p });
          if (
            (matchResults.state === 4 || matchResults.state === 5) &&
            p.maxState === 0
          ) {
            p.maxState = 1;
            // send next match
            // await SendNext3Matches(p.fieldId);//TODO not implemented for VRC
          }
          if (matchResults.state === 4) {
            //show score
            await SendMatchScore({
              Id: matchResults.id,
              Alliances: matchResults.alliances.map((a) => {
                return {
                  Color: a.color,
                  Score: a.score,
                  WP: a.wp,
                  Teams: a.teams.map((t) => t.number),
                };
              }),
              FieldName: matchResults.fieldName,
              ScheduledTime: new Date(matchResults.scheduledFor * 1000),
            });

            //cleanup timeout
            clearTimeout(p.timeout);
            delete this._pulling[index];
          }
        } catch (error) {
          const e = error as Error;
          console.error(e);
          if (e.message === "match not found") {
            clearTimeout(p.timeout);
            delete this._pulling[index];
          }
        }
      });
    }
  }
  parseMatchId(id: MatchId): {
    round: number;
    instance: number;
    match: number;
  } {
    let round = 2;
    const r = id.match(/(QF |Q|SF |F |R[1-9]* |P)([1-9]*)(-)?([1-9]*)?/);
    if (r == undefined) throw new Error("could not parse match id");
    if (r[1] === "QF ") round = 3;
    else if (r[1] === "Q") round = 2;
    else if (r[1] === "SF ") round = 4;
    else if (r[1] === "F ") round = 5;
    else if (r[1] === "R16 ") round = 6;
    else if (r[1] === "R32 ") round = 7;
    else if (r[1] === "R64 ") round = 8;
    else if (r[1] === "R128 ") round = 9;
    else if (r[1] === "P") round = 1;

    return {
      round: round,
      instance: parseInt(r[4] ? r[2] : "1"),
      match: parseInt(r[4] ? r[4] : r[2]),
    };
  }
}
