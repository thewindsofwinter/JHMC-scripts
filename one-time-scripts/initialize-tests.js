// Generates question order, assigns each test a grader

const AirtablePlus = require('airtable-plus');
const DotEnv = require('dotenv').config({ path: './../.env' });

console.log(process.env.AIRTABLE_API_KEY);

const testsTable = new AirtablePlus({ tableName: "Tests" }),
    studentsTable = new AirtablePlus({ tableName: "Students" }),
    schoolsTable = new AirtablePlus({ tableName: "Schools" }),
    competitionsTable = new AirtablePlus({ tableName: "Competitions" }),
    volunteersTable = new AirtablePlus({ tableName: "Volunteers" });

(async () => {
    const tests = await testsTable.read();
    const competitions = await competitionsTable.read();
    const volunteers = await volunteersTable.read();

    let graders = volunteers.filter(volunteer => volunteer.fields.Role == "Grader");

    // NOTE: this assumes no tests are added and no competitions are changed while this is running

    tests.forEach((test, testIndex) => {
        const competitionId = test.fields.Competition[0];
        const comp = competitions.find(c => c.id == competitionId);

        let numQuestions = 0;

        while (true) {
            if (comp.fields["Q" + parseInt(numQuestions + 1)]) {
                numQuestions++
            } else break;
        }
        const questionOrder = shuffle([...Array(numQuestions).keys()].map(x => ++x)).join(","); // Pretty proud of this line ngl

        let testGrader = [graders[testIndex % graders.length].id];
        console.log(testGrader);
        testsTable.update(test.id, { "Question Order": questionOrder, "Grader": testGrader});
    });

    console.log("Question Order Generated!");
})()

// Pulled this from StackOverFlow
function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}