export class IPCError extends Error {
  public cause?: Error;
  constructor(msg: string, cause: Error) {
    super(msg);
    this.cause = cause;
  }
}
export type RendererRequest<Type = keyof RendererRequestTypes> =
  Type extends keyof RendererRequestTypes
    ? {
        request: Type;
        args: RendererRequestTypes[Type];
        // response?: MainResponseTypes[Type];
        // error?: Error;
        responseChannel: string;
      }
    : never;
export type MainResponse<Type = keyof MainResponseTypes> =
  Type extends keyof MainResponseTypes
    ? {
        request: Type;
        responseChannel: string;
        response: MainResponseTypes[Type] | IPCError;
      }
    : never;

import { TMWebConnect } from "@/tmapi/wrappers/tmWeb";
import { OBSConnect } from "@/tmapi/wrappers/obs";
export interface RendererRequestTypes {
  ConnectTMDB: void;
  ConnectTMWeb: TMWebConnect;
  ConnectOBS: OBSConnect;
  ShowMatchResults: MatchId;
}
export interface MainResponseTypes {
  ConnectTMDB: { msg: string };
  ConnectTMWeb: {
    msg: string;
    fieldsets: { id: number; type: number; name: string }[];
  };
  ConnectOBS: {
    msg: string;
    scenes: string[];
  };
  ShowMatchResults: { msg: string };
}
