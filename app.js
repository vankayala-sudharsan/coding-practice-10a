const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

function AuthenticationwithToken(request, response, next) {
  let jwtToken;
  const authHead = request.headers["authorization"];
  if (authHead === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwtToken = authHead.split(" ")[1];
    jwt.verify(jwtToken, "hiSiddu", async (error, payload) => {
      if (error) {
        response.status(410);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
}

function namstat(each) {
  return {
    stateId: each.state_id,
    stateName: each.state_name,
    population: each.population,
  };
}

app.get("/states", AuthenticationwithToken, async (request, response) => {
  const allStatesQuery = `SELECT * FROM state;`;
  const allStates = await db.all(allStatesQuery);
  response.send(allStates.map((each) => namstat(each)));
});

app.get(
  "/states/:stateId/",
  AuthenticationwithToken,
  async (request, response) => {
    const { stateId } = request.params;
    const geteachStatequery = `SELECT * FROM state WHERE state_id = ${stateId};`;
    const eachState = await db.get(geteachStatequery);
    response.send(namstat(eachState));
  }
);

app.post("/districts/", AuthenticationwithToken, async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const postDistrictQuery = `INSERT INTO district(district_name,
  state_id,
  cases,
  cured,
  active,
  deaths) 
  VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths});
  `;
  await db.run(postDistrictQuery);
  response.send("District Successfully Added");
});

function namDis(each) {
  return {
    districtId: each.district_id,
    districtName: each.district_name,
    stateId: each.state_id,
    cases: each.cases,
    cured: each.cured,
    active: each.active,
    deaths: each.deaths,
  };
}

app.get(
  "/districts/:districtId/",
  AuthenticationwithToken,
  async (request, response) => {
    const { districtId } = request.params;
    const eachDisQuery = `SELECT * FROM district WHERE district_id = ${districtId};`;
    const eachDistrict = await db.get(eachDisQuery);
    response.send(namDis(eachDistrict));
  }
);

app.delete(
  "/districts/:districtId/",
  AuthenticationwithToken,
  async (request, response) => {
    const { districtId } = request.params;
    const delQuery = `DELETE FROM district WHERE district_id = ${districtId};`;
    await db.run(delQuery);
    response.send("District Removed");
  }
);

app.put(
  "/districts/:districtId/",
  AuthenticationwithToken,
  async (request, response) => {
    const { districtId } = request.params;
    const districtDetails = request.body;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = districtDetails;
    const Upquery = `UPDATE district SET district_name = '${districtName}',
    state_id = ${stateId},cases = ${cases},cured = ${cured},active = ${active},deaths = ${deaths};`;
    await db.run(Upquery);
    response.send("District Details Updated");
  }
);

app.get(
  "/states/:stateId/stats/",
  AuthenticationwithToken,
  async (request, response) => {
    const { stateId } = request.params;
    const statQuery = `SELECT SUM(cases) AS totalCases,SUM(cured) AS totalCured,SUM(active) AS totalActive,
    SUM(deaths) AS totalDeaths FROM district WHERE state_id = ${stateId};`;
    const stats = await db.get(statQuery);
    response.send(stats);
  }
);

app.post("/login", async (request, response) => {
  const userDetails = request.body;
  const { username, password } = userDetails;
  const dbUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(dbUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const ispass = await bcrypt.compare(password, dbUser.password);
    if (ispass !== true) {
      response.status(400);
      response.send("Invalid password");
    } else {
      const payload = username;
      const jwtToken = jwt.sign(payload, "hiSiddu");
      response.send({ jwtToken });
    }
  }
});

module.exports = app;
