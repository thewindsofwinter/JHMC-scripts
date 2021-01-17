const AirtablePlus = require('airtable-plus');
const CSV = require('csvtojson');
const DotEnv = require('dotenv').config({ path: './../.env' });

const testsTable = new AirtablePlus({ tableName: "Tests" }),
    studentsTable = new AirtablePlus({ tableName: "Students" }),
    schoolsTable = new AirtablePlus({ tableName: "Schools" }),
    competitionsTable = new AirtablePlus({ tableName: "Competitions" });

// Change once we get actual rosters
const csvFilePath='./../sampleRoster.csv';

(async () => {

    const registration = await CSV().fromFile(csvFilePath);

    for (var index in registration) {
        const entry = registration[index];

        // A record is created for each school under “Schools” with
        // Coach name, email, division, etc.
        const schoolName = entry['School Name'];
        const coachName = entry['Coach Name'];
        const emailAddress = entry['Email Address'];
        const division = entry['Division'];

        console.log(schoolName);
    }
})()
