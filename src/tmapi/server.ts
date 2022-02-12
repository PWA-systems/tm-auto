import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
export const app = express();
export const server = createServer(app);
export const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server, {
  cors: { origin: "*" },
});
app.use(cors({ origin: "*" }));
app.use(express.json());
import { join } from "path";
app.use(
  "/",
  express.static(
    join(
      process.env.NODE_ENV === "development"
        ? process.cwd()
        : process.resourcesPath,
      "extra/tm-auto-web"
    )
  )
);

server.listen(2131, () => {
  console.log(`listening at http://localhost:2131`);
});
