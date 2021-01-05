const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const AirtablePlus = require('airtable-plus');
const DotEnv = require('dotenv').config();
const humanizeDuration = require("humanize-duration");
const tests = require('./tests');

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

app.get('/test/**', async (req, res) => {
    const recordId = req.url.split("/")[2];
    if (recordId == "sample") {
        res.redirect("/test/"+process.env.SAMPLE_TEST_ID);
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
            await testsTable.update(record.id, {"Current Question Index": 0});
            currentQuestion = 0;
            testBegun = false;
        }

        // res.status(200).send(`${students.map(s => s.fields.Name).join(", ")} — ${school.fields.Name} <br> ${competition.fields.Name} <br> ${JSON.stringify(record, null, 2)}`);
        res.render('pages/tests', {
            name: students.map(s => s.fields.Name).join(", "),
            competition: competition.fields["Friendly Name"],
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
        res.status(500).render('pages/error.ejs', {
            errorText: e.toString()
        })
    }
});

app.post('/test/endpoint/**', async (req, res) => {
    const recordId = req.url.split("/")[3];

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

            if (record.fields["Start Time"] || record.fields["Submission Time"]) {
                let numberQuestionsCompleted = record.fields["Current Question Index"];
                if (numberQuestionsCompleted === questions.length) {
                    res.send("FINISHED");
                } else {
                    res.status(200).send(questions[numberQuestionsCompleted]);
                }
                return;
            }

            const startTimePromise = testsTable.update(recordId, { "Start Time": Date.now() });
            const currentQuestionIndexPromise = testsTable.update(recordId, { "Current Question Index": 0 });

            let [other] = await Promise.all([startTimePromise, currentQuestionIndexPromise]);
            res.status(200).json(questions[0]);
        } catch (e) {
            console.log(e);
            res.status(500).send(e);
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
            res.send(questions[newNumberOfQuestionsCompleted]);
        }
    } else {
        res.status(400).send("Unkown Request");
    }
});

app.get('/done**', (req, res) => {
    res.send("Congrats!");
});

app.get('*', function (req, res) {
    res.status(404).render('pages/404.ejs');
});

const server = app.listen(8080, () => {
    const host = server.address().address;
    const port = server.address().port;

    console.log(`App listening at http://${host}:${port}`);
});
