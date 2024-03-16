const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const AirtablePlus = require("airtable-plus");
const humanizeDuration = require("humanize-duration");
const tests = require("./tests");
const { match } = require("path-to-regexp");
const http = require("http").createServer(app);
const fs = require("fs");

const websocket = require("./socket.js");
const { apiKey, baseID, sampleTestId } = require("./secrets.js");

// baseID, apiKey, and tableName can alternatively be set by environment variables
const testsTable = new AirtablePlus({ tableName: "Tests", apiKey, baseID }),
  studentsTable = new AirtablePlus({ tableName: "Students", apiKey, baseID }),
  schoolsTable = new AirtablePlus({ tableName: "Schools", apiKey, baseID }),
  competitionsTable = new AirtablePlus({
    tableName: "Competitions",
    apiKey,
    baseID,
  }),
  eventsTable = new AirtablePlus({ tableName: "Events", apiKey, baseID }),
  extraneousRedirectsTable = new AirtablePlus({
    tableName: "Redirects",
    apiKey,
    baseID,
  }),
  alertsTable = new AirtablePlus({ tableName: "Alerts", apiKey, baseID });

// error function that returns the rendered error page
const error = (res, text) => {
  console.log("ERROR!");
  res.status(500).render("pages/error.ejs", {
    errorText:
      text ||
      "There was an unexpected error. Please contact your proctor, who will inform the JHMC team.",
  });
};

app.set("view engine", "ejs");

app.use(function (req, res, next) {
  /* // Try new solution
  if (req.hostname != 'localhost' && req.get('X-Forwarded-Proto') == 'http') {
    res.redirect(`https://${req.host}${req.url}`);
    return;
  }
  next(); */

  // Redirect HTTP to HTTPS
  if (req.headers["x-forwarded-proto"] === "https") return next();
  if (req.protocol === "https") return next();
  if (req.hostname === "localhost") return next();
  res.redirect(301, `https://${req.hostname}${req.url}`);
});

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(bodyParser.json());

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.render("pages/home.ejs");
});

app.get("/homeworking", (req, res) => {
  res.render("pages/newhome[working].ejs");
});

app.get("/partners", (req, res) => {
  res.render("pages/partners.ejs");
});

app.get("/contest-rules", (req, res) => {
  res.render("pages/contest-rules.ejs");
});

app.get("/past-tests", (req, res) => {
  res.render("pages/past-tests.ejs");
});

app.get("/about", (req, res) => {
  res.render("pages/about.ejs");
});

// any actual test
app.get("/test/:recordId", async (req, res) => {
  const recordId = req.params.recordId;
  if (recordId == "sample") {
    res.redirect("/test/" + sampleTestId);
    return;
  }

  try {
    let record = await testsTable.find(recordId);
    let testBegun = false;

    if (record.fields["Start Time"] || record.fields["Submission Time"]) {
      testBegun = true;
    }

    console.log(record);
    let studentsPromise = record.fields.Students.map((studentId) =>
        studentsTable.find(studentId)
      ),
      schoolPromise = schoolsTable.find(record.fields.School[0]),
      competitionPromise = competitionsTable.find(record.fields.Competition[0]);

    // let [competition, school, ...students] = await Promise.all([competitionPromise, schoolPromise, ...studentsPromise]);
    let [competition, ...students] = await Promise.all([
      competitionPromise,
      ...studentsPromise,
    ]);

    let questions = await tests.getOrderedQuestions(
      record,
      competition.fields.Code
    );

    let available = tests.validateTime(competition, record, false),
      currentQuestion = record.fields["Current Question Index"];

    console.log(available);

    if (!testBegun && currentQuestion && currentQuestion != 0) {
      currentQuestion = 0;
      testsTable.update(record.id, { "Current Question Index": 0 });
    }

    if (record.id == sampleTestId) {
      await testsTable.update(record.id, { "Current Question Index": 0 });
      currentQuestion = 0;
      testBegun = false;
    }

    let name = students.map((s) => s.fields.Name).join(", "),
      competitionName = competition.fields["Friendly Name"];

    let competitionType = competition.fields["Test Type"];

    let liveAlerts = await websocket.getAlerts(alertsTable);
    let alertsObject = await websocket.getAlertObject(liveAlerts),
      alertsHtml = alertsObject.html;

    res.render("pages/tests", {
      name,
      primary: name,
      competition: competitionName,
      secondary: competitionName + " Test",
      division: competition.fields.Division,
      durationText: humanizeDuration(competition.fields["Max Duration"] * 1000),
      duration: competition.fields["Max Duration"] * 1000,
      competitionId: competition.id,
      competitionCode: competition.fields.Code,
      recordId,
      beginButtonText: testBegun ? "Resume Test" : "Begin Test",
      numberOfQuestions: questions.length,
      currentQuestion,
      available,
      competitionType,
      individualQuestions:
        competitionType == "One Question" ||
        competitionType == "Spaced Questions",
      questionTemplate: fs.readFileSync("views/partials/question.ejs", "utf8"),
      alertsHtml,
    });
  } catch (e) {
    console.log(e);
    error(res, "Error fetching: " + e);
  }
});

//endpoints for current tests to start; I built this part before websockets were implemented
//now, to do this, i would just use websockets
app.post("/test/endpoint/:recordId", async (req, res) => {
  const recordId = req.params.recordId;

  let record = await testsTable.find(recordId),
    competition = await competitionsTable.find(record.fields.Competition[0]),
    competitionType = competition.fields["Test Type"],
    individualQuestions =
      competitionType == "One Question" ||
      competitionType == "Spaced Questions";

  const questionsPromise = tests.getOrderedQuestions(
    record,
    req.body.competitionCode
  );

  if (tests.validateTime(competition, record, true) !== "true") {
    res.send("TIMEOUT");
    return;
  }

  if (req.body.action == "begin") {
    try {
      let questions = await questionsPromise;
      let numberQuestionsCompleted =
        record.fields["Current Question Index"] || 0;

      if (record.id === sampleTestId) {
        const time = Date.now();
        testsTable.update(recordId, { "Start Time": time });
        record.fields["Start Time"] = time; // Could reaquire record, but that would take a lot of time — this is easier & faster
      } else if (
        record.fields["Start Time"] &&
        numberQuestionsCompleted === questions.length
      ) {
        res.send("FINISHED");
        return;
      } else if (!record.fields["Start Time"]) {
        // if test has not been started
        const time = Date.now();
        const startTimePromise = testsTable.update(recordId, {
          "Start Time": time,
        });
        record.fields["Start Time"] = time; // Could reaquire record, but that would take a lot of time — this is easier & faster
        const currentQuestionIndexPromise = testsTable.update(recordId, {
          "Current Question Index": 0,
        });
      }

      // let [other] = await Promise.all([startTimePromise, currentQuestionIndexPromise]);
      if (individualQuestions) {
        res.status(200).json({
          questions: [questions[numberQuestionsCompleted]],
          closingTime: tests.getEndTime(competition, record).toString(),
        });
      } else {
        res.status(200).json({
          questions,
          closingTime: tests.getEndTime(competition, record).toString(),
        });
      }
    } catch (e) {
      console.log(e);
      res.error("Something went wrong " + e.toString());
    }
  } else if (req.body.action == "next") {
    try {
      let questions = await questionsPromise;
      let answers = req.body.answers,
        numberQuestionsCompleted,
        newNumberOfQuestionsCompleted;

      console.log(req.body.answers);
      if (individualQuestions) {
        // For individual questions, we have to withstand using the current question index, otherwise somebody could theoretically change the question code on submission
        numberQuestionsCompleted = record.fields["Current Question Index"];
        let answeredQuestion = questions.find(
          (q) => q.index == numberQuestionsCompleted
        );
        testsTable.update(recordId, {
          [answeredQuestion.questionCode]: req.body.answers[0].text,
        });

        newNumberOfQuestionsCompleted =
          parseInt(record.fields["Current Question Index"]) + 1;

        if (newNumberOfQuestionsCompleted === questions.length) {
          const time = await testsTable.update(record.id, {
            "Submission Time": Date.now(),
          });
          res.send("FINISHED");
        } else {
          res.status(200).json({
            questions: [questions[newNumberOfQuestionsCompleted]],
            closingTime: tests.getEndTime(competition, record).toString(),
          });
        }
      } else {
        newNumberOfQuestionsCompleted = questions.length;
        await Promise.all(
          answers.map((answer) => {
            // returning a promise which is received and awaited by Promise.all
            return testsTable.update(recordId, {
              [answer.questionCode]: answer.text,
            });
          })
        );
        const time = await testsTable.update(record.id, {
          "Submission Time": Date.now(),
        });
        res.status(200).send("FINISHED");
      }

      testsTable.update(recordId, {
        "Current Question Index": newNumberOfQuestionsCompleted,
      });
    } catch (e) {
      console.log(e);
    }
  } else {
    res.status(400).send("Unknown Request");
  }
});

require("./schedule.js")(
  app,
  { eventsTable, studentsTable, schoolsTable, testsTable, alertsTable },
  websocket,
  error
);

websocket.buildWebsocket(http, app, alertsTable);

app.get("/error", (req, res) => {
  error(res);
});

app.get("**", async (req, res) => {
  let path = req.path;
  let redirected = false;
  console.log(path);

  let possibleRedirects = [];

  let events = await eventsTable.read();
  events.forEach((event) => {
    possibleRedirects.push({
      from: `/${event.fields.ID}`,
      to: event.fields["Zoom Link"],
    });
  });

  // Eliminate events
  // possibleRedirects = []

  let redirects = await extraneousRedirectsTable.read();
  redirects.forEach((extraneousRedirect) => {
    possibleRedirects.push({
      from: `${extraneousRedirect.fields.Origin}`,
      to: extraneousRedirect.fields.Redirect,
    });
  });

  possibleRedirects.forEach((r) => {
    let fn = match(r.from, { decode: decodeURIComponent });
    // console.log(fn, r.from, path, fn(path));
    if (fn(path)) {
      console.log(path, fn.from);
      res.redirect(r.to);
      redirected = true;
    }
  });

  if (!redirected) {
    res.status(404).render("pages/404.ejs");
  }
});

process.on("unhandledRejection", (reason, p) => {
  console.log("Unhandled Rejection at: Promise", p, "reason:", reason);
  // application specific logging, throwing an error, or other logic here
});

const server = http.listen(8080, () => {
  const host = server.address().address;
  const port = server.address().port;

  console.log(`App listening at http://localhost:${port}`);
});
