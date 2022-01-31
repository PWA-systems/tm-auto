import { Tournament } from "@/tmapi/tournament";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

export const tm = new Tournament();

app.use(express.json());
app.get("/match/:match", async (req, res) => {
  res.send(
    await tm.DB.all(
      `select 
m.id as match
, m.state as scoreState
, m.division
, m.round
, m.instance
, m.projected_time
, m.actual_time
, m.session
, m.saved_time
, s.alliances_id
, s.auto
, s.auto_tie
, s.auto_wp
, s.base_rings
, s.elevated_mobile_goals
, s.elevated_robots
, s.high_branch_rings
, s.mid_branch_rings
, s.zone_mobile_goals
, t.number
, t.name

from matches m
left join alliance_scores_generic s on m.match=s.matches_id
left join alliances_have_teams at on s.alliances_id = at.alliances_id
left join teams t on at.teams_id = t.id
where m.match = ?`,
      [req.params.match]
    )
  );
});
app.post("/connect", async (req, res) => {
  try {
    await tm.connect({
      url: req.body.host,
      user: req.body.user,
      password: req.body.password,
    });
    const fs = await tm.tmWeb.axios.get("fieldsets");
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
    const fs = tm.fieldsets.get(req.body.id);
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
