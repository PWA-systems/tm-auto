import { TMWeb, Connect as TMWebConnect } from "./wrappers/tmWeb";
import { EventEmitter } from "events";
import { Fieldset } from "./fieldset";

export class Tournament extends EventEmitter {
  public tmWeb = new TMWeb();
  public eBus = new EventEmitter();
  public fieldsets = new Map<number, Fieldset>();
  async connect(tmWeb: TMWebConnect): Promise<void> {
    this.emit("connect");
    await this.tmWeb.connect(tmWeb);
  }
  constructor() {
    super();
    setInterval(() => {
      this.tmWeb.authGuard().catch((e) => console.error(e));
    }, 10000);
    this.tmWeb.on("NewAuth", () => {
      //update fieldsets
      this.tmWeb.axios.get("fieldsets").then((res) => {
        res.data.fieldSets.forEach(
          (elm: { id: number; name: string; type: number }) => {
            const fieldset = this.fieldsets.get(elm.id);
            if (fieldset) {
              //reconnect with new cookie
              fieldset.connect({
                host: this.tmWeb.getHost,
                id: elm.id,
                cookie: this.tmWeb.getAuthKey || "",
                type: elm.type,
                name: elm.name,
              });
            } else {
              //fieldset didn't exist; create new fieldset
              const fs = new Fieldset({
                host: this.tmWeb.getHost,
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
          }
        );
      });
    });
  }
}
