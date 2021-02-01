const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const AirtablePlus = require('airtable-plus');
const DotEnv = require('dotenv').config();
const humanizeDuration = require("humanize-duration");
const tests = require('./tests');
var fs = require('fs');

// baseID, apiKey, and tableName can alternatively be set by environment variables
const testsTable = new AirtablePlus({ tableName: "Tests" }),
    studentsTable = new AirtablePlus({ tableName: "Students" }),
    schoolsTable = new AirtablePlus({ tableName: "Schools" }),
    competitionsTable = new AirtablePlus({ tableName: "Competitions" });

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.render('pages/home.ejs');
    // res.send("Welcome to the home page!");
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

        let [competition, school, ...students] = await Promise.all([competitionPromise, schoolPromise, ...studentsPromise]);

        let questions = await tests.getOrderedQuestions(record, competition.fields.Code);
        let available = tests.validateTime(competition, record),
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
            competitionName = competition.fields["Friendly Name"]

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
            available
        })
    } catch (e) {
        console.log(e);
        error(res, "Error fetching");
    }
});

app.post('/test/endpoint/:recordId', async (req, res) => {
    const recordId = req.params.recordId;

    let record = await testsTable.find(recordId),
        competition = await competitionsTable.find(record.fields.Competition[0]);

    const questionsPromise = tests.getOrderedQuestions(record, req.body.competitionCode);

    if (tests.validateTime(competition, record) !== "true") {
        res.send("TIMEOUT");
        return;
    } // TODO: Allow submission of last question even if time is out

    if (req.body.action == "begin") {
        try {
            let questions = await questionsPromise;

            if (record.id === process.env.SAMPLE_TEST_ID) {

            } else if (record.fields["Start Time"]) {
                let numberQuestionsCompleted = record.fields["Current Question Index"];
                if (numberQuestionsCompleted === questions.length) {
                    res.send("FINISHED");
                } else {
                    let time = Date.now();
                    res.status(200).send({ ...questions[numberQuestionsCompleted], closingTime: tests.getEndTime(competition, record).toString(), });
                }
                return;
            }
            const time = Date.now();
            record.fields["Start Time"] = time; // Could reaquire record, but that would take a lot of time — this is easier & faster
            const startTimePromise = testsTable.update(recordId, { "Start Time": time });
            const currentQuestionIndexPromise = testsTable.update(recordId, { "Current Question Index": 0 });

            // let [other] = await Promise.all([startTimePromise, currentQuestionIndexPromise]);
            res.status(200).json({ ...questions[0], closingTime: tests.getEndTime(competition, record).toString() });
        } catch (e) {
            console.log(e);
            res.error("Something went wrong " + e.toString());
        }

    } else if (req.body.action == "nextQuestion") {
        let questions = await questionsPromise;
        let numberQuestionsCompleted = record.fields["Current Question Index"];

        let newNumberOfQuestionsCompleted = parseInt(record.fields["Current Question Index"]) + 1;
        testsTable.update(recordId, { "Current Question Index": newNumberOfQuestionsCompleted });

        let answeredQuestion = questions.find(q => q.index == numberQuestionsCompleted);
        testsTable.update(recordId, { [answeredQuestion.questionCode]: req.body.answer });

        if (newNumberOfQuestionsCompleted === questions.length) {
            const time = await testsTable.update(record.id, { "Submission Time": Date.now() });
            res.send("FINISHED");
        } else {
            res.status(200).json({ ...questions[newNumberOfQuestionsCompleted], closingTime: tests.getEndTime(competition, record).toString() });
        }
    } else {
        res.status(400).send("Unkown Request");
    }
});

app.get('/student/:studentId', async (req, res) => {
    const studentId = req.params.studentId;
    try {
        let student = await studentsTable.find(studentId);
        let testIds = student.fields.Tests;
        let school = await schoolsTable.find(student.fields["School"]);
        let studentJoinInfo = await Promise.all(testIds.map(async (testId) => {
            let test = await testsTable.find(testId),
                competitionName = test.fields["Competition Name"][0];

            let zoomLink = school.fields["7th Grade Zoom Link"];
            if (competitionName.includes("8th")) {
                zoomLink = school.fields["8th Grade Zoom Link"];
            } else if (competitionName.includes("Creative")) {
                zoomLink = school.fields["Creative Thinking Zoom Link"];
            }

            let subtext = test.fields["Student Names"].length == 1 ? "" : test.fields["Student Names"].join(", ");

            return {
                testLink: test.fields["Link To Join"],
                zoomLink: zoomLink,
                subtext,
                name: test.fields["Competition Friendly Name"],
                openTime: test.fields["Competition Start Time"],
                closeTime: test.fields["Competition End Time"]
            };
        }));

        let otherRooms = JSON.parse(fs.readFileSync('rooms.json', 'utf8')).rooms;

        let requiredRooms = ["opening-ceremony", "awards", "speed-round", "tour"]

        requiredRooms.forEach(room => {
            studentJoinInfo.push(otherRooms.find(r => r.id == room));
        });

        studentJoinInfo.sort((a,b) => new Date(a.openTime) - new Date(b.openTime));

        let now = new Date();
        studentJoinInfo = studentJoinInfo.map(room => {
            return {
                ...room,
                active: (new Date(room.openTime) < now && new Date(room.closeTime) > now)
            }
        })

        res.status(200).render("pages/links.ejs", {
            rooms: studentJoinInfo,
            name: student.fields.Name,
            primary: student.fields.Name,
            secondary: "JHMC 2021",
            schoolName: school.fields.Name,
            helpLink: otherRooms.find(room => room.id == "help").zoomLink,
            divisionText: "Division " + school.fields.Division
        });
    } catch(e) {
        console.error(e);
        error(res);
    }
})

app.get('/error', (req, res) => {
    // TODO: Add error page
    error(res);
})

app.get('*', function (req, res) {
    res.status(404).render('pages/404.ejs');
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