import { io } from "@/tmapi/server";
import { tm } from "@/tmapi/index";
io.on("connection", (socket) => {
  console.log(socket.id + "connected");
  socket.on("JoinField", (f, event) => {
    socket.join(`${event}-${f}`);
    SendNext3Matches(f);
  });
  socket.on("JoinOverly", () => {
    socket.join("Overly");
    if (overlayCache !== null) socket.emit("MatchScored", overlayCache);//init state
  });
  socket.on("disconnect", () => {
    console.log("id: " + socket.id + " disconnected");
    io.fetchSockets().then((socs) => console.log(socs.map((s) => s.id)));
  });
});

//TODO
export async function SendNext3Matches(field: number): Promise<void> {
  try {
    const res = await tm.getFutureMatches(6, field);
    io.to(`QueueF-${field}`).emit("QueueF", field, res);
    console.log({ msg: `QueueF-${field}`, res: res });
  } catch (error) {
    console.error(error);
  }
}
let overlayCache: MatchScored | null = null;
export async function SendMatchScore(matchScore: MatchScored): Promise<void> {
  try {
    overlayCache = matchScore;
    io.to(`Overly`).emit("MatchScored", matchScore);
    console.log({ msg: `MatchScored`, matchScore: matchScore });
  } catch (error) {
    console.error(error);
  }
}
