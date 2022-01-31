"use strict";

// import "@/tmapi/index";
// import "@/tmapi/ipc";

import { app, protocol, BrowserWindow, ipcMain } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";
import path from "path";
// import { Tournament } from "./tmapi/tournament";
const isDevelopment = process.env.NODE_ENV !== "production";
console.log(process.cwd());
// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } },
]);

const gotTheLock = app.requestSingleInstanceLock();
export let mainWindow: BrowserWindow | null = null;
// const tournaments: Tournament[] = [];

// export async function addTournament(tm: Tournament): Promise<void> {
//   // TODO if tournament does not exist
//   tournaments.push(tm);
// }
// export function getTournaments(): Tournament[] {
//   return tournaments;
// }

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

async function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.resolve(__dirname, "preload.js"),
    },
  });

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await mainWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string);
    if (!process.env.IS_TEST) mainWindow.webContents.openDevTools();
  } else {
    createProtocol("app");
    // Load the index.html when not in development
    mainWindow.loadURL("app://./index.html");
  }
}

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS3_DEVTOOLS);
    } catch (e: unknown) {
      console.error("Vue Devtools failed to install:", (<Error>e).toString());
    }
  }
  createWindow();
});
// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === "win32") {
    process.on("message", (data) => {
      if (data === "graceful-exit") {
        app.quit();
      }
    });
  } else {
    process.on("SIGTERM", () => {
      app.quit();
    });
  }
}

import { RendererRequest, MainResponse, IPCError } from "@/ipcTypes";
import { openDB } from "@/tmapi/ipc";

ipcMain.handle(
  "ConnectTMDB",
  async (event, args: RendererRequest<"ConnectTMDB">) => {
    await openDB()
      .then(() => {
        const res: MainResponse<"ConnectTMDB"> = {
          responseChannel: args.responseChannel,
          request: args.request,
          response: { msg: "TMDB Connected" },
        };
        event.sender.send(res.responseChannel, res.response);
      })
      .catch((error: Error) => {
        const res: MainResponse<"ConnectTMDB"> = {
          responseChannel: args.responseChannel,
          request: args.request,
          response: new IPCError("TMDB Failed", error),
        };
        event.sender.send(res.responseChannel, res.response);
        throw error;
      });
  }
);
import { tm } from "@/tmapi/index";

ipcMain.handle(
  "ConnectTMWeb",
  async (event, args: RendererRequest<"ConnectTMWeb">) => {
    console.log(args.args);
    tm.connect(args.args)
      .then((tm) => {
        const res: MainResponse = {
          request: args.request,
          responseChannel: args.responseChannel,
          response: {
            msg: "TMWeb Connected",
            fieldsets: Array.from(tm.fieldsets.values()).map((v) => {
              return { id: v.getId, type: 1, name: v.getName };
            }),
          },
        };
        event.sender.send(res.responseChannel, res.response);
      })
      .catch((error) => {
        const res: MainResponse = {
          request: args.request,
          responseChannel: args.responseChannel,
          response: new IPCError("TMWeb fail", error),
        };
        event.sender.send(res.responseChannel, res.response);
        throw error;
      });
  }
);

ipcMain.handle(
  "ConnectOBS",
  async (event, args: RendererRequest<"ConnectOBS">) => {
    console.log(args.args);
    try {
      const fs = tm.fieldsets.get(1);
      if (!fs) throw new Error("FieldsetDoesNotExist");
      await fs.connectOBS(args.args);

      const res: MainResponse = {
        request: args.request,
        responseChannel: args.responseChannel,
        response: { msg: "OBS Connected", scenes: fs.getOBSScenes },
      };
      event.sender.send(res.responseChannel, res.response);
    } catch (error) {
      const res: MainResponse = {
        request: args.request,
        responseChannel: args.responseChannel,
        response: new IPCError("TMWeb fail", error as Error),
      };
      event.sender.send(res.responseChannel, res.response);
      throw error;
    }
  }
);
