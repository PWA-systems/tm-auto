import { Tournament } from "@/api/tournament";
import express from "express";

const app = express();

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
  } catch (error: any) {
    res
      .status(500)
      .json({ msg: "connect failure", error: error.message })
      .end();
  }
});
app.post("/fieldsetOBS", async (req, res) => {
  try {
    const fs = tournament.fieldsets.get(req.body.id);
    if (!fs) throw new Error("FieldsetDoesNotExist");
    await fs.connectOBS({ host: req.body.host, password: req.body.password });
    res.json({ msg: "connect successful", scenes: fs.getOBSScenes });
  } catch (error: any) {
    res
      .status(500)
      .json({ msg: "connect failure", error: error.message })
      .end();
  }
});

app.listen(2131, () => {
  console.log(`listening at http://localhost:2131`);
});
