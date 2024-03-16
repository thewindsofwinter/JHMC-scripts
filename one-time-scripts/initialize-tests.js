// Reach out to: Vidyoot Senthil '24 (vidyoots@gmail.com) with any questions about this script

// Generates question order
const AirtablePlus = require('airtable-plus');

const { apiKey, baseID, sampleTestId } = require('./../secrets.js');

// baseID, apiKey, and tableName can alternatively be set by environment variables
const testsTable = new AirtablePlus({ tableName: "Tests", apiKey, baseID }),
competitionsTable = new AirtablePlus({ tableName: "Competitions", apiKey, baseID });

(async () => {
    const tests = await testsTable.read();
    console.log("Generating Question Order...");
    const competitions = await competitionsTable.read();
    console.log("Generating Question Order...");

    // NOTE: this assumes no tests are added and no competitions are changed while this is running
    console.log("Generating Question Order...");

    for (let testIndex = 0; testIndex < tests.length; testIndex++) {
        const test = tests[testIndex];

        const competitionId = test.fields.Competition[0];
        const comp = competitions.find(c => c.id == competitionId);

        let numQuestions = 0;

        while (true) {
            if (comp.fields["Q" + parseInt(numQuestions + 1)]) {
                numQuestions++
            } else break;
        }

        var questionOrder;

        if(test.fields['Competition Name'][0].includes("Creative Thinking")) {
            questionOrder = [...Array(numQuestions).keys()].map(x => ++x).join(",");
        }
        else {
            questionOrder = shuffle([...Array(numQuestions).keys()].map(x => ++x)).join(","); // Pretty proud of this line ngl
        }

        if (!test.fields["Start Time"]) {
            await testsTable.update(test.id, { "Question Order": questionOrder });
            console.log("Updated");
        }
    };

    console.log("Question Order Generated!");
    console.log("Updating Airtable Records...");
})().catch(console.error);

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
