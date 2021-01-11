const AirtablePlus = require('airtable-plus');
const DotEnv = require('dotenv').config({ path: './../.env' });

console.log(process.env.AIRTABLE_API_KEY);

const testsTable = new AirtablePlus({ tableName: "Tests" }),
    studentsTable = new AirtablePlus({ tableName: "Students" }),
    schoolsTable = new AirtablePlus({ tableName: "Schools" }),
    competitionsTable = new AirtablePlus({ tableName: "Competitions" });

(async () => {
    const tests = await testsTable.read();
    const competitions = await competitionsTable.read();

    // NOTE: this assumes no tests are added and no competitions are changed while this is running

    tests.forEach(test => {
        const competitionId = test.fields.Competition[0];
        const comp = competitions.find(c => c.id == competitionId);

        let numQuestions = 0;

        while (true) {
            if (comp.fields["Q" + parseInt(numQuestions + 1)]) {
                numQuestions++
            } else break;
        }
        const questionOrder = shuffle([...Array(numQuestions).keys()].map(x => ++x)).join(","); // Pretty proud of this line ngl

        testsTable.update(test.id, {"Question Order": questionOrder})
        
        console.log(questionOrder);
        console.log(test.id, comp.fields.Name, numQuestions);
    });
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