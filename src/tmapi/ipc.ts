import { mainWindow } from "@/background";

import { ipcMain, dialog, ipcRenderer } from "electron";
import { tm } from "@/tmapi/index";

export async function openDB(): Promise<void> {
  if (!mainWindow) return;
  const path = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: "VEX Tournament", extensions: ["db"] }],
  });
  if (path.canceled || !path.filePaths[0]) return;
  await tm.DB.open(path.filePaths[0]);
}

// ipcMain.handle("toMain", (event, args: { type: string; args: unknown }) => {
//   switch (args.type) {
//     case "openDB": {
//       openDB();
//       break;
//     }
//   }
// });
