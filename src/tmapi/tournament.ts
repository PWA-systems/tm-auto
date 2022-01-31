import { TMWeb, TMWebConnect } from "./wrappers/tmWeb";
import { EventEmitter } from "events";
import { Fieldset } from "./fieldset";
import { Database } from "@/tmapi/wrappers/sqlite3";

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
}
