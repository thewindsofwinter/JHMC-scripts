const AirtablePlus = require('airtable-plus');
const CSV = require('csvtojson');
const DotEnv = require('dotenv').config({ path: './../.env' });

const testsTable = new AirtablePlus({ tableName: "Tests" }),
    studentsTable = new AirtablePlus({ tableName: "Students" }),
    schoolsTable = new AirtablePlus({ tableName: "Schools" }),
    competitionsTable = new AirtablePlus({ tableName: "Competitions" });

// What stuff to do for the school from the spreadsheet
const schoolHeader = 'School Name';

// Stuff on our end
const schoolAttributes = ['Coach Name', 'Email Address', 'Division'];
// Stuff on the Airtable end
const tableValues = ['Coach Name', 'Coach Email', 'Division'];

// Change once we get actual rosters
const csvFilePath='./../sampleRoster.csv';

(async () => {
    const registration = await CSV().fromFile(csvFilePath);

    for (var index in registration) {
        // Get current entry
        const entry = registration[index];

        // A record is created for each school under “Schools” with
        // Coach name, email, division, etc.
        var schoolData = {};
        schoolData['Name'] = entry[schoolHeader];

        // Students
        var studentData = {};

        for(var name in entry) {
            if(schoolAttributes.includes(name)) {
                const position = schoolAttributes.indexOf(name);
                schoolData[tableValues[position]] = entry[schoolAttributes[position]];
            }
            else if(schoolHeader === name) {
                schoolData['Name'] = entry[schoolHeader];
            }
            else {
                // If it doesn't refer to school, it must refer to student
                if(name.includes('7th')) {
                    if(studentData.hasOwnProperty(entry[name]) &&
                        entry[name] !== '') {
                        studentData[entry[name]]['Competitions'].push(stripTitle(name))
                        studentData[entry[name]]['Grade'] = '7th';
                    }
                    else if(entry[name] != '') {
                        studentData[entry[name]] = {};
                        studentData[entry[name]]['Competitions'] = [stripTitle(name)];
                        studentData[entry[name]]['Grade'] = '7th';
                    }
                }
                else if(name.includes('8th')) {
                    if(studentData.hasOwnProperty(entry[name]) &&
                        entry[name] !== '') {

                    }
                    else if(entry[name] != '') {

                    }
                }
            }
        }

        console.log(studentData);


        try {
            // Update schools
            // await schoolsTable.create(schoolData);
        }
        catch (e) {
            console.error(e);
        }
    }
})()

function stripTitle(eventName) {
    // Go from 7th Grade Individual... stuff to just 7th grade individual
    // Utilize regular expressions
    const regex = /[7-8]th Grade (Individual)?(Team)?(Creative Thinking)?/g;

    return eventName.match(regex)[0];
}
