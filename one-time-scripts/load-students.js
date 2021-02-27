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
const csvFilePath = './../shortSampleRoster.csv';


(async () => {
    // Start by getting competitions
    // const competitions = await competitionsTable.read()

    const registration = await CSV().fromFile(csvFilePath);

    /* Show an example
    var ex = await studentsTable.read();
    console.log(ex[0]); */

    for (var entry of registration) {

        // A record is created for each school under “Schools” with
        // Coach name, email, division, etc.
        var schoolData = {};
        schoolData['Name'] = entry[schoolHeader];

        // Students
        var studentData = {};

        // Teams
        var teamData = {};

        for (var name in entry) {
            if (schoolAttributes.includes(name)) {
                const position = schoolAttributes.indexOf(name);
                schoolData[tableValues[position]] = entry[schoolAttributes[position]];
            }
            else if (schoolHeader === name) {
                schoolData['Name'] = entry[schoolHeader];
            }
            else {
                // If it doesn't refer to school, it must refer to student
                if (name.includes('7th')) {
                    if (studentData.hasOwnProperty(entry[name]) &&
                        entry[name] !== '') {
                        // Update each time -- that way at the end if someone is in 7th they will show up
                        studentData[entry[name]]['Competitions'].push(stripTitle(name))
                        studentData[entry[name]]['Grade'] = '7th';
                    }
                    else if (entry[name] != '') {
                        studentData[entry[name]] = {};
                        studentData[entry[name]]['Competitions'] = [stripTitle(name)];
                        studentData[entry[name]]['Grade'] = '7th';
                    }
                }
                else if (name.includes('8th')) {
                    if (studentData.hasOwnProperty(entry[name]) &&
                        entry[name] !== '') {
                        // Could be a 7th grader -- dont update the grade field
                        studentData[entry[name]]['Competitions'].push(stripTitle(name));
                    }
                    else if (entry[name] != '') {
                        studentData[entry[name]] = {};
                        studentData[entry[name]]['Competitions'] = [stripTitle(name)];
                        studentData[entry[name]]['Grade'] = '8th';
                    }
                }
            }
        }

        // console.log(studentData);


        try {
            // Update schools
            // await schoolsTable.create(schoolData);

            // Create student records
            for (var student in studentData) {
                const finalJSON = {};

                const school = schoolData['Name'];
                const row = await schoolsTable.read({
                    filterByFormula: 'Name = "' + school + '"',
                    maxRecords: 1
                });

                finalJSON['Name'] = student;
                finalJSON['School'] = [row[0]['id']];
                finalJSON['Grade'] = studentData[student]['Grade'];

                // finalJSON['Tests'] = studentData[student][Competitions]

                // console.log(finalJSON);

                // await studentsTable.create(finalJSON);
            }

            // Update the competitions that they are in [TODO]
            for (var student in studentData) {
                var finalJSON = [];
                for (var contest in studentData[student]['Competitions']) {
                    const contestName = studentData[student]['Competitions'][contest]
                        + " Division " + schoolData['Division'];

                    // console.log('Name = "' + contestName + '"');
                    // Do you need the competition ID? This part of the code just
                    // gets you the ID from the competition name
                    const row = await competitionsTable.read({
                        filterByFormula: 'Name = "' + contestName + '"',
                        maxRecords: 1
                    });

                    // console.log(row);
                    finalJSON.push(row[0]['id']);

                    // testsTable.create()
                }
                console.log(finalJSON);
            }
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
