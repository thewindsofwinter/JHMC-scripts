const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const AirtablePlus = require('airtable-plus');
const DotEnv = require('dotenv').config();
const humanizeDuration = require("humanize-duration");
const tests = require('./tests');
const { pathToRegexp, match, parse, compile } = require("path-to-regexp");
var fs = require('fs');

// baseID, apiKey, and tableName can alternatively be set by environment variables
const testsTable = new AirtablePlus({ tableName: "Tests" }),
    studentsTable = new AirtablePlus({ tableName: "Students" }),
    schoolsTable = new AirtablePlus({ tableName: "Schools" }),
    competitionsTable = new AirtablePlus({ tableName: "Competitions" }),
    eventsTable = new AirtablePlus({ tableName: "Events" }),
    extraneousRedirectsTable = new AirtablePlus({ tableName: "Extraneous Redirects" });

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.render('pages/home.ejs');
});

app.get('/test/:recordId', async (req, res) => {
    const recordId = req.params.recordId;
    if (recordId == "sample") {
        res.redirect("/test/" + process.env.SAMPLE_TEST_ID);
        return;
    }

    try {
        let record = await testsTable.find(recordId);

        let testBegun = false;

        if (record.fields["Start Time"] || record.fields["Submission Time"]) {
            testBegun = true;
        }

        let studentsPromise = record.fields.Students.map(studentId => studentsTable.find(studentId)),
            schoolPromise = schoolsTable.find(record.fields.School[0]),
            competitionPromise = competitionsTable.find(record.fields.Competition[0]);

        // let [competition, school, ...students] = await Promise.all([competitionPromise, schoolPromise, ...studentsPromise]);
        let [competition, ...students] = await Promise.all([competitionPromise, ...studentsPromise]);

        let questions = await tests.getOrderedQuestions(record, competition.fields.Code);
        let available = tests.validateTime(competition, record, false),
            currentQuestion = record.fields["Current Question Index"];

        if (!testBegun && currentQuestion && currentQuestion != 0) {
            currentQuestion = 0;
            testsTable.update(record.id, { "Current Question Index": 0 });
        }

        if (record.id == process.env.SAMPLE_TEST_ID) {
            await testsTable.update(record.id, { "Current Question Index": 0 });
            currentQuestion = 0;
            testBegun = false;
        }

        let name = students.map(s => s.fields.Name).join(", "),
            competitionName = competition.fields["Friendly Name"];

        let competitionType = competition.fields["Test Type"];

        res.render('pages/tests', {
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
            individualQuestions: competitionType == "One Question",
            questionTemplate: fs.readFileSync('views/partials/question.ejs', 'utf8'),
        })
    } catch (e) {
        console.log(e);
        error(res, "Error fetching");
    }
});

app.post('/test/endpoint/:recordId', async (req, res) => {
    const recordId = req.params.recordId;

    let record = await testsTable.find(recordId),
        competition = await competitionsTable.find(record.fields.Competition[0]),
        competitionType = competition.fields["Test Type"],
        individualQuestions = competitionType == "One Question";

    const questionsPromise = tests.getOrderedQuestions(record, req.body.competitionCode);

    if (tests.validateTime(competition, record, true) !== "true") {
        res.send("TIMEOUT");
        return;
    }

    if (req.body.action == "begin") {
        try {
            let questions = await questionsPromise;
            let numberQuestionsCompleted = record.fields["Current Question Index"] || 0;

            if (record.id === process.env.SAMPLE_TEST_ID) {

            } else if (record.fields["Start Time"] && numberQuestionsCompleted === questions.length) {
                res.send("FINISHED");
                return;
            } else if (!record.fields["Start Time"]) { // if test has not been started
                const time = Date.now();
                const startTimePromise = testsTable.update(recordId, { "Start Time": time });
                record.fields["Start Time"] = time; // Could reaquire record, but that would take a lot of time — this is easier & faster
                const currentQuestionIndexPromise = testsTable.update(recordId, { "Current Question Index": 0 });
            }

            // let [other] = await Promise.all([startTimePromise, currentQuestionIndexPromise]);
            if (individualQuestions) {
                res.status(200).json({ questions: [questions[numberQuestionsCompleted]], closingTime: tests.getEndTime(competition, record).toString() });
            } else {
                res.status(200).json({ questions, closingTime: tests.getEndTime(competition, record).toString(), });
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
                let answeredQuestion = questions.find(q => q.index == numberQuestionsCompleted);
                testsTable.update(recordId, { [answeredQuestion.questionCode]: req.body.answers[0].text });

                newNumberOfQuestionsCompleted = parseInt(record.fields["Current Question Index"]) + 1;

                if (newNumberOfQuestionsCompleted === questions.length) {
                    const time = await testsTable.update(record.id, { "Submission Time": Date.now() });
                    res.send("FINISHED");
                } else {
                    res.status(200).json({ questions: [questions[newNumberOfQuestionsCompleted]], closingTime: tests.getEndTime(competition, record).toString() });
                }
            } else {
                newNumberOfQuestionsCompleted = questions.length;
                await Promise.all(answers.map(answer => {
                    // returning a promise which is received and awaited by Promise.all
                    return testsTable.update(recordId, { [answer.questionCode]: answer.text });
                }));
                res.status(200).send("FINISHED");
            }

            testsTable.update(recordId, { "Current Question Index": newNumberOfQuestionsCompleted });

        } catch (e) {
            console.log(e);
        }
    } else {
        res.status(400).send("Unkown Request");
    }
});

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

app.get('/student/:studentId', async (req, res) => {
    const studentId = req.params.studentId;
    try {
        let student = await studentsTable.find(studentId);
        let testIds = student.fields.Tests;
        let school = await schoolsTable.find(student.fields["School"]);
        let studentRooms = await Promise.all(testIds.map(async (testId) => {
            let test = await testsTable.find(testId),
                competitionName = test.fields["Competition Name"][0];

            let zoomLink = school.fields["7th Grade Zoom Link"];
            if (competitionName.includes("8th")) {
                zoomLink = school.fields["8th Grade Zoom Link"];
            } else if (competitionName.includes("Creative")) {
                zoomLink = school.fields["Creative Thinking Zoom Link"];
            }

            let subtext = test.fields["Student Names"].length == 1 ? "" : test.fields["Student Names"].join(", ");

            let testLink = test.fields["Link To Join"] + `?student=${student.id}`

            if (test.fields.Students[0] !== student.id) {
                testLink = null;
            }

            let teamTest = test.fields.Students.length != 1;

            return {
                testLink,
                zoomLink: zoomLink,
                subtext,
                name: test.fields["Competition Friendly Name"],
                openTime: test.fields["Competition Start Time"],
                closeTime: test.fields["Competition End Time"],
                openTimeText: new Date(test.fields["Competition Start Time"]).toLocaleTimeString("CDT", { timeStyle: 'short', timeZone: "America/Chicago" }),
                teamTest,
                students: test.fields["Student Names"]
            };
        }));

        let nonTestingRooms = await eventsTable.read();
        nonTestingRooms.filter(room => room.fields.Group == "All" || room.fields.Group == school.fields.Division)
            .forEach(room => {
                studentRooms.push({
                    zoomLink: room.fields["Zoom Link"],
                    name: room.fields.Name,
                    openTime: room.fields.Start,
                    closeTime: room.fields.End,
                    openTimeText: new Date(room.fields.Start).toLocaleTimeString("CDT", { timeStyle: 'short', timeZone: "America/Chicago" })
                });
            });


        studentRooms.sort((a, b) => new Date(a.openTime) - new Date(b.openTime));

        let now = new Date();
        studentRooms = studentRooms.map(room => {
            return {
                ...room,
                active: (new Date(room.openTime) < now && new Date(room.closeTime) > now)
            };
        });

        res.status(200).render("pages/links.ejs", {
            rooms: studentRooms,
            name: student.fields.Name,
            primary: student.fields.Name,
            secondary: "JHMC 2021", // Goes in the <title>
            schoolName: school.fields.Name,
            helpLink: nonTestingRooms.find(room => room.fields.ID == "help").fields["Zoom Link"],
            divisionText: "Division " + school.fields.Division,
        });
    } catch (e) {
        console.error(e);
        error(res);
    }
});

app.get('/error', (req, res) => {
    error(res);
})

app.get('**', async (req, res) => {
    let path = req.path;
    let redirected = false;
    console.log(path);

    let possibleRedirects = [];
    
    let events = await eventsTable.read();
    events.forEach(event => {
        possibleRedirects.push({
            from: `/${event.fields.ID}`,
            to: event.fields["Zoom Link"]
        });
    });

    let redirects = await extraneousRedirectsTable.read()
    redirects.forEach(extraneousRedirect => {
        possibleRedirects.push({
            from: `${extraneousRedirect.fields.Origin}`,
            to: extraneousRedirect.fields.Redirect
        });
    });

    possibleRedirects.forEach(r => {
        let fn = match(r.from, {decode: decodeURIComponent});
        // console.log(fn, r.from, path, fn(path));
        if (fn(path)) {
            console.log(path, fn.from);
            res.redirect(r.to);
            redirected = true;
        }
    });

    if (!redirected) {
        res.status(404).render('pages/404.ejs');
    }
});

const server = app.listen(8080, () => {
    const host = server.address().address;
    const port = server.address().port;

    console.log(`App listening at http://localhost:${port}`);
});

const error = (res, text) => {
    console.log("ERROR!");
    res.status(500).render('pages/error.ejs', {
        errorText: text || "There was an unexpected error. Please contact your proctor."
    });
}