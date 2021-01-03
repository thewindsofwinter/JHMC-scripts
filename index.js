const express = require('express');
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

app.get('/', (req, res) => {
    res.send("Welcome to the home page!");
});

app.get('/test/**', async (req, res) => {
    const recordId = req.url.split("/")[2];

    try {
        let record = await testsTable.find(recordId);
        if (record.fields["Start Time"]) {
            res.send('Already Started');
            return;
        }

        let studentsPromise = record.fields.Students.map(studentId => studentsTable.find(studentId)),
            schoolPromise = schoolsTable.find(record.fields.School[0]),
            competitionPromise = competitionsTable.find(record.fields.Competition[0]);
        let [competition, school, ...students] = await Promise.all([competitionPromise, schoolPromise, ...studentsPromise]);
        
        // res.status(200).send(`${students.map(s => s.fields.Name).join(", ")} — ${school.fields.Name} <br> ${competition.fields.Name} <br> ${JSON.stringify(record, null, 2)}`);
        res.render('pages/tests', {
            name: students.map(s => s.fields.Name).join(", "),
            competition: competition.fields["Friendly Name"],
            division: competition.fields.Division,
            duration: humanizeDuration(competition.fields["Max Duration"]*1000),
            competitionId: competition.id,
            competitionCode: competition.fields.Code,
            recordId
        })
    } catch (e) {
        console.log(e);
        res.status(500).send("Invalid link. Contact Us.");
    }
});

app.post('/test/endpoint/**', async (req, res) => {
    const recordId = req.url.split("/")[3].split('?')[0];
    // console.log(req);
    let record = await testsTable.find(recordId);

    if (req.query.action == "begin") {
        // TODO: Check test open time, make sure they did not start early.
        try {
            if (record.fields["Start Time"]) {
                res.send('Already Started');
                return;
            }

            // TODO: REMEMBER TO UNCOMMENT THIS
            // const startTimePromise = testsTable.update(recordId, {"Start Time": Date.now()});
            const startTimePromise = "";
            const questionsPromise = tests.getQuestions(req.query.competitionCode);

            let [questions, ...other] = await Promise.all([questionsPromise, startTimePromise]);

            // TODO: Set question order using record.fields["Question Order"]
            res.status(200).json(questions);
        } catch(e) {
            console.log(e);
            res.status(500).send(e);
        }
        
    } else if (req.query.action == "submit") {
        // TODO: Check if they began test
        // TODO: Send test results to airtable (andy's script)
    } else {
        res.status(400).send("Huh");
    }
});

app.get('/done**', (req, res) => {
    res.send("Congrats!");
});

const server = app.listen(8080, () => {
    const host = server.address().address;
    const port = server.address().port;

    console.log(`App listening at http://${host}:${port}`);
});
