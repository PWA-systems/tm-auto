import { EventEmitter } from "events";
import OBSWebSocket from "obs-websocket-js";
export class OBS extends EventEmitter {
  //TODO save a name/ref for debug & error MSGs
  private obs = new OBSWebSocket();
  private scenes = [""];
  private curScene = "";
  private connected = false;
  async connectGuard(): Promise<void> {
    if (!this.getConnected) {
      this.emit("OBSNotConnected");
      throw new Error("OBSNotConnected");
    }
  }
  async connect(args: Connect): Promise<void> {
    await this.obs
      .connect({ address: args.host, password: args.password })
      .then(async () => {
        this.connected = true;
        await this.updateScenes();
      });
  }
  async setScene(scene: string): Promise<void> {
    try {
      await this.connectGuard();
      if (!this.scenes.includes(scene)) throw new Error("SceneDoesNotExist");
      await this.obs
        .send("SetCurrentScene", { "scene-name": scene })
        .then(() => {
          this.curScene = scene;
        });
    } catch (error: any) {
      if (error.message !== "OBSNotConnected") throw error;
    }
  }
  async updateScenes(): Promise<void> {
    try {
      await this.connectGuard();
      const scenes = await this.obs.send("GetSceneList");
      this.scenes = scenes.scenes.map((scene) => scene.name);
      this.curScene = scenes["current-scene"];
    } catch (error: any) {
      if (error.message !== "OBSNotConnected") throw error;
    }
  }
  get getScenes(): string[] {
    return this.scenes;
  }
  get getConnected(): boolean {
    return this.connected;
  }
  get getCurScene(): string {
    return this.curScene;
  }
}
export interface Connect {
  host: string;
  password: string;
}
