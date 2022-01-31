import { EventEmitter } from "events";
import axios from "axios";

export class TMWeb extends EventEmitter {
  private authArgs: TMWebConnect = {
    url: "localhost",
    user: "admin",
    password: "password",
  };
  private authInterval: { timer: NodeJS.Timer | undefined; ms: number } = {
    timer: undefined,
    ms: 5000,
  };
  public axios = axios.create({
    timeout: 1000,
    timeoutErrorMessage: "TIMEOUT",
  });
  constructor() {
    super({ captureRejections: true });
    this.on("error", console.error);
  }
  async connect(args: TMWebConnect): Promise<void> {
    this.authArgs = args;
    this.axios.defaults.baseURL = `http://${args.url}`;
    await this.auth();
  }
  async authGuard(): Promise<void> {
    return new Promise((res, rej) => {
      this.axios
        .get("/fieldsets")
        .then(() => {
          res();
        })
        .catch((e) => {
          this.emit("ERROR", {
            from: "TMWeb.AuthGuard()",
            msg: "authGuard failed; retrying auth",
            error: e,
          });
          const rejTimeout = setTimeout(() => {
            rej(new Error("AuthGuardTimeout"));
          }, 60000);
          this.authInterval.ms = 5000;
          this.authInterval.timer = setInterval(async () => {
            await this.auth().catch((e: unknown) => {
              //TODO add res if successful auth
              if ((<Error>e).message === "TMWebAuthFailed") {
                if (this.authInterval.timer)
                  clearInterval(this.authInterval.timer);
                clearTimeout(rejTimeout);
                res();
              }
            });
            if (this.authInterval.ms < 30000) this.authInterval.ms += 1000;
          }, this.authInterval.ms);
        });
    });
  }
  async auth(): Promise<void> {
    try {
      //verify website is reachable
      await this.axios.get("/").catch(() => {
        throw new Error("TMWebUnreachable");
      });

      //auth with website
      const res = await this.axios.post(
        "admin/login",
        `user=${this.authArgs.user}&password=${this.authArgs.password}&submit=`,
        {
          maxRedirects: 0,
          validateStatus: function (status) {
            return status >= 200 && status < 303;
          },
        }
      );

      //parse auth cookie from response
      const cookie =
        res.headers["set-cookie"] != undefined
          ? res.headers["set-cookie"][0]
          : null;
      if (!cookie) throw new Error("TMWebAuthFailed");

      const key = cookie.substring(
        cookie.indexOf("user="),
        cookie.indexOf("; expires=")
      );
      this.axios.defaults.headers.common = {
        Cookie: key,
      };
      if (this.authInterval.timer) clearInterval(this.authInterval.timer);

      this.emit("NewAuth", { Cookie: key });
      //await all wsFieldsets reAuth
    } catch (error) {
      this.emit("ErrorAuth", {
        msg: "webAuthFailed",
        error: error,
      });
      throw error;
    }
  }
  get getAuthKey(): string | null {
    return this.axios.defaults.headers.common != undefined
      ? <string>this.axios.defaults.headers.common.Cookie
      : null;
  }
  get getURL(): string {
    return this.authArgs.url;
  }
  async getFieldsets(): Promise<TMWebFieldset[]> {
    const res = await this.axios.get("fieldsets");
    return res.data.fieldSets as TMWebFieldset[];
  }
}

export interface TMWebFieldset {
  id: number;
  name: string;
  type: number;
}
export type TMWebUser = "admin" | "scorekeeper";
export interface TMWebConnect {
  url: string;
  user: TMWebUser;
  password: string;
}
