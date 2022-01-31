import { contextBridge, ipcRenderer } from "electron";
import {
  RendererRequestTypes,
  MainResponseTypes,
  RendererRequest,
  MainResponse,
} from "@/ipcTypes";

const api = {
  async call<Type extends keyof RendererRequestTypes>(
    requestType: Type,
    requestData?: RendererRequestTypes[Type]
  ): Promise<MainResponse<Type>["response"]> {
    const req = {
      request: requestType,
      args: requestData,
      responseChannel: `${requestType}-${Date.now()}`,
    };

    ipcRenderer.invoke(requestType, req as RendererRequest);

    return new Promise((resolve, reject) => {
      const to = setTimeout(() => {
        reject("timeout");
      }, 60000);
      ipcRenderer.once(
        req.responseChannel,
        (event, args: MainResponseTypes[Type]) => {
          clearTimeout(to);
          resolve(args);
        }
      );
    });
  },
};
contextBridge.exposeInMainWorld("api", api);

declare global {
  interface Window {
    api: typeof api;
  }
}
