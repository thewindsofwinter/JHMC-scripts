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
    const competitions = await competitionsTable.read()

    const registration = await CSV().fromFile(csvFilePath);

    /* Show an example
    var ex = await studentsTable.read();
    console.log(ex[0]); */

    for (var entry of registration) {
        // console.log(entry);

        // A record is created for each school under “Schools” with
        // Coach name, email, division, etc.
        var schoolData = {};
        schoolData['Name'] = entry[schoolHeader];

        // Students
        var studentData = {};

        // Teams [TODO]
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
                        console.log(entry[name])
                        console.log(entry[name] !== '')
                        console.log(studentData[entry[name]])
                        // Could be a 7th grader -- dont update the grade field
                        studentData[entry[name]]['Competitions'].push(stripTitle(name));
                    }
                    else if (entry[name] != '') {
                        studentData[entry[name]] = {};
                        studentData[entry[name]]['Competitions'] = [stripTitle(name)];
                        studentData[entry[name]]['Grade'] = '8th';
                    }
                }
                // Handle Creative Thinking
                else if(name.includes("Seventh")) {
                    if (studentData.hasOwnProperty(entry[name]) &&
                        entry[name] !== '') {
                        // Update each time -- that way at the end if someone is in 7th they will show up
                        studentData[entry[name]]['Competitions'].push('Creative Thinking')
                        studentData[entry[name]]['Grade'] = '7th';
                    }
                    else if (entry[name] != '') {
                        studentData[entry[name]] = {};
                        studentData[entry[name]]['Competitions'] = ['Creative Thinking'];
                        studentData[entry[name]]['Grade'] = '7th';
                    }
                }
                else if(name.includes('Eighth')) {
                    if (studentData.hasOwnProperty(entry[name]) &&
                        entry[name] !== '') {
                        // Could be a 7th grader -- dont update the grade field
                        studentData[entry[name]]['Competitions'].push('Creative Thinking');
                    }
                    else if (entry[name] != '') {
                        studentData[entry[name]] = {};
                        studentData[entry[name]]['Competitions'] = ['Creative Thinking'];
                        studentData[entry[name]]['Grade'] = '8th';
                    }
                }


                // Add team data
                if(name.includes('Team') && !name.includes('Creative Thinking')) {
                    if (studentData.hasOwnProperty(entry[name]) &&
                        entry[name] !== '') {
                        studentData[entry[name]]['Team'] = name;
                    }
                    // Hopefully won't be triggered
                    else if (entry[name] != '') {
                        studentData[entry[name]] = {};
                        studentData[entry[name]]['Team'] = name;
                    }
                }
            }
        }

        // console.log(schoolData);
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
                // I have no idea how this works but i'm not going to touch it
                finalJSON['School'] = [row[0]['id']];
                finalJSON['Grade'] = studentData[student]['Grade'];

                // finalJSON['Tests'] = studentData[student][Competitions]

                // console.log(finalJSON);

                // await studentsTable.create(finalJSON);
            }

            // Put students in competitions
            for (var student in studentData) {
                var finalJSON = {};
                for (var contest in studentData[student]['Competitions']) {
                    const contestName = "Division " + schoolData['Division']
                        + " " + studentData[student]['Competitions'][contest];

                    // Deal with team later
                    if(!contestName.includes("Team")) {
                        // console.log('Name = "' + contestName + '"');
                        // Do you need the competition ID? This part of the code just
                        // gets you the ID from the competition name
                        const row = await competitionsTable.read({
                            filterByFormula: 'Name = "' + contestName + '"',
                            maxRecords: 1
                        });

                        const studentRow = await studentsTable.read({
                            filterByFormula: 'Name = "' + student + '"',
                            maxRecords: 1
                        });

                        // console.log(row);

                        finalJSON['Students'] = [studentRow[0]['id']];
                        finalJSON['Competition'] = [row[0]['id']];

                        // console.log(finalJSON);
                        // await testsTable.create(finalJSON);
                    }
                    else {
                        const studentRow = await studentsTable.read({
                            filterByFormula: 'Name = "' + student + '"',
                            maxRecords: 1
                        });

                        // Never hurts to check for null
                        const team = studentData[student]['Team'];
                        if(teamData.hasOwnProperty(team)
                            && contestName !== '') {
                            teamData[team]['Students'].push(studentRow[0]['id']);
                        }
                        else if(contestName != '') {
                            teamData[team] = {};
                            teamData[team]['Competition']
                            teamData[team]['Students'] = [studentRow[0]['id']];
                        }
                    }
                }
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
    const regex = /[7-8]th Grade (Alternate Team)?(Individual)?(Team)?/g;

    const normal = eventName.match(regex)[0];

    // Creative thinking doesn't have the 7th/8th grade heading
    if(normal.length < 10)
        return "Creative Thinking";

    // Remove references to alternate things
    return normal.split("Alternate ").join("");
}
