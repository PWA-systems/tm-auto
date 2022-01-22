import { Tournament } from "./tournament";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

const tournament = new Tournament();
app.use(express.json());
app.post("/connect", async (req, res) => {
  try {
    await tournament.connect({
      host: req.body.host,
      user: req.body.user,
      password: req.body.password,
    });
    const fs = await tournament.tmWeb.axios.get("fieldsets");
    res
      .json({
        msg: "connect successful",
        fieldsets: fs.data,
      })
      .end();
  } catch (error: unknown) {
    res
      .status(500)
      .json({ msg: "connect failure", error: (<Error>error).message })
      .end();
  }
});
app.post("/fieldsetOBS", async (req, res) => {
  try {
    const fs = tournament.fieldsets.get(req.body.id);
    if (!fs) throw new Error("FieldsetDoesNotExist");
    await fs.connectOBS({ host: req.body.host, password: req.body.password });
    res.json({ msg: "connect successful", scenes: fs.getOBSScenes });
  } catch (error: unknown) {
    res
      .status(500)
      .json({ msg: "connect failure", error: (<Error>error).message })
      .end();
  }
});

app.listen(2131, () => {
  console.log(`listening at http://localhost:2131`);
});
