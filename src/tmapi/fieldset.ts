import EventEmitter from "events";
import { WebSocket } from "ws";
import { OBS, Connect as OBSConnect } from "./wrappers/obs";
import { createLogger, format, transports } from "winston";
import { join } from "path";
export const logger = createLogger({
  level: "info",
  format: format.json(),
  transports: [
    new transports.File({
      filename: join(process.cwd(), "error.log"),
      level: "error",
    }),
    new transports.File({ filename: join(process.cwd(), "info.log") }),
    new transports.File({
      filename: join(process.cwd(), "verbose.log"),
      level: "verbose",
    }),
  ],
});
//TODO if get timerReset, timeUpdated, timerReset, timUpdated and no fieldMatchAssigned then reconnect
export class Fieldset extends EventEmitter {
  private ws!: WebSocket;
  private connectArgs!: Connect;
  private matchData: MatchStats = {
    secRem: 0,
    fieldId: 0,
    state: "DISABLED",
    match: "",
  };
  private obs = new OBS();
  private timeout: NodeJS.Timer[] | null[] = [];

  async syncOBS(fieldId: number | undefined | null): Promise<void> {
    if (!this.obs.getConnected) return;
    if (fieldId) {
      this.matchData.fieldId = fieldId;
      await this.obs.setScene(this.obs.getScenes[this.matchData.fieldId - 1]);
    } else {
      //display msg
      this.emit("WarringQueueFieldset", { fieldsetId: this.getId });
    }
  }
  async setDisplay(
    display: Displays,
    displayOptions?: DisplayOptions
  ): Promise<void> {
    this.ws.send(
      JSON.stringify({
        action: "setScreen",
        screen: display,
        displayOption: displayOptions || 1,
      })
    );
  }
  async queuePrevMatch(): Promise<void> {
    this.ws.send(JSON.stringify({ action: "queuePrevMatch" }));
  }
  async queueNextMatch(): Promise<void> {
    this.ws.send(JSON.stringify({ action: "queueNextMatch" }));
  }
  async connectOBS(args: OBSConnect): Promise<void> {
    await this.obs.connect(args);
  }
  get logData(): {
    fieldsetId: number;
    timestamp: number;
    matchData: MatchStats;
  } {
    return {
      fieldsetId: this.getId,
      timestamp: Date.now().valueOf(),
      // fieldsetName: this.getName,
      matchData: this.matchData,
    };
  }
  connect(args: Connect): void {
    this.connectArgs = args;
    this.ws = new WebSocket(`ws://${args.host}/fieldsets/${args.id}`, {
      headers: {
        Cookie: args.cookie,
      },
    });
    logger.log({
      level: "info",
      message: "fieldsetConnected",
      args: args,
    });
  }
  constructor(args: Connect) {
    super();
    this.connect(args);
    this.ws.onmessage = async (message) => {
      const data: {
        type: string;
        fieldId?: number;
        name?: string;
        period_name?: string;
        state?: "DISABLED" | "AUTO" | "DRIVER";
        remaining?: number;
        displayOption?: number;
        display?: number;
      } = JSON.parse(<string>message.data);
      switch (data.type) {
        case "timeUpdated":
          //*{ period_name: string, state: 'DISABLED' | 'AUTO' | 'DRIVER', remaining: number }
          //update secRem
          if (data.remaining) this.matchData.secRem = data.remaining;
          if (data.state) this.matchData.state = data.state;
          this.emit("timeUpdated", data);
          break;
        case "fieldMatchAssigned":
          //*{fieldId:number,name:string,type:string}
          //if fieldId is null then display error message in front end
          //else set fieldId & obs scene
          if (this.timeout[1]) clearTimeout(this.timeout[1]); //dont double queue
          if (data.name) this.matchData.match = data.name;
          await this.syncOBS(data.fieldId);
          this.emit("matchQueued", data);
          logger.log(
            Object.assign(
              {
                level: "info",
                message: data.type,
              },
              this.logData
            )
          );
          break;
        case "matchStarted":
          //*{ type: string; fieldId: number }

          //set fieldId & obs scene
          this.timeout.forEach((elm) => {
            if (elm) clearTimeout(elm);
          });
          await this.syncOBS(data.fieldId);

          this.emit("matchStarted", data);
          logger.log(
            Object.assign(
              {
                level: "info",
                message: data.type,
              },
              this.logData
            )
          );
          break;
        case "matchPaused":
          //*{ type: string; fieldId: number }

          await this.syncOBS(data.fieldId);

          this.emit("matchPaused", data); //
          logger.log(
            Object.assign(
              {
                level: "info",
                message: data.type,
              },
              this.logData
            )
          );
          break;
        case "matchStopped":
          //*{ type: string; fieldId: number }

          await this.syncOBS(data.fieldId);
          //if secRem === 0 then start trans
          //else stay on screen
          if (this.matchData.secRem === 0 || this.matchData.secRem === 1) {
            this.timeout[0] = setTimeout(() => {
              this.setDisplay(Displays.SavedMatchResults);
            }, 5000);
            this.timeout[1] = setTimeout(() => {
              this.queueNextMatch();
            }, 8000);
            this.timeout[2] = setTimeout(() => {
              this.setDisplay(Displays.InMatch);
            }, 12500);
          }
          this.emit("matchStopped", data); //
          logger.log(
            Object.assign(
              {
                level: "info",
                message: data.type,
              },
              this.logData
            )
          );
          break;
        case "matchAborted":
          //*{ type: string; fieldId: number }

          await this.syncOBS(data.fieldId);
          this.emit("matchAborted", data);
          logger.log(
            Object.assign(
              {
                level: "info",
                message: data.type,
              },
              this.logData
            )
          );

          break;
        case "displayUpdated":
          //*{ type: string; displayOption: number; display: number }
          // this.logEvent('displayUpdated')

          this.emit("displayUpdated", data);
          break;
        case "timerReset":
          //*{ type: string; fieldId: number }
          // this.logEvent('timerReset')

          // await this.syncOBS(data.fieldId)
          this.matchData.secRem = 0;
          this.matchData.state = "DISABLED";

          //reset secRem
          //set fieldId & obs scene
          this.emit("timerReset", data);
          break;
      }
      logger.log(
        Object.assign(
          {
            level: "verbose",
            message: data.type,
            data: data,
          },
          this.logData
        )
      );
    };
    this.ws.onclose = async () => {
      this.emit("wsClose");
    };
    this.ws.onerror = async () => {
      this.emit("wsError");
    };
  }
  get getId(): number {
    return this.connectArgs.id;
  }
  get getName(): string {
    return this.connectArgs.name;
  }
  get getOBSScenes(): string[] {
    return this.obs.getScenes;
  }
}

export interface Connect {
  host: string;
  id: number;
  cookie: string;
  type: number;
  name: string;
}
export type MatchState = "DISABLED" | "AUTO" | "DRIVER";

export interface MatchStats {
  secRem: number;
  fieldId: number;
  state: MatchState;
  match: string;
}
export enum Displays {
  None = 1,
  Logo = 6,
  Intro = 2,
  InMatch = 3,
  SavedMatchResults = 4,
  Schedule = 13,
  Rankings = 5,
  SkillsRankings = 9,
  AllianceSelection = 7,
  ElimBracket = 8,
  Slides = 12,
  Inspection = 15,
}
export enum DisplayOptions {
  QF = 1,
  R16_1_4 = 2,
  R16_5_8 = 3,
}
