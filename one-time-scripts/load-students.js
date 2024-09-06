// Reach out to: Vidyoot Senthil '24 (vidyoots@gmail.com) with any questions about this script

const AirtablePlus = require('airtable-plus');
const CSV = require('csvtojson');
const lib_fs = require("fs");

const { apiKey, baseID, sampleTestId } = require('./../secrets.js');

// baseID, apiKey, and tableName can alternatively be set by environment variables
const testsTable = new AirtablePlus({ tableName: "Tests", apiKey, baseID }),
    studentsTable = new AirtablePlus({ tableName: "Students", apiKey, baseID }),
    schoolsTable = new AirtablePlus({ tableName: "Schools", apiKey, baseID }),
    competitionsTable = new AirtablePlus({ tableName: "Competitions", apiKey, baseID });

// What stuff to do for the school from the spreadsheet
const schoolHeader = 'School Name';

// Stuff on our end
const schoolAttributes = ['Coach Name', 'Email Address', 'Division'];
// Stuff on the Airtable end
const tableValues = ['Coach Name', 'Coach Email', 'Division'];

// Change once we get actual rosters
const csvFilePath = './private-data/2024roster.csv';


function csvToJson(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    const jsonArray = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const obj = {};

        for (let j = 0; j < headers.length; j++) {
            obj[headers[j].trim()] = values[j].trim();
        }

        jsonArray.push(obj);
    }

    return jsonArray;
}

(async () => {
    // Start by getting competitions
    const competitions = await competitionsTable.read()

    //const registration = await CSV().fromFile(csvFilePath);
    
    //RUN ONCE TO GET THE JSON FILE
    //const registration = csvToJson(lib_fs.readFileSync(csvFilePath).toString());
    
    // DUPLICATE THE JSON FILE AND RUN THE LINE BELOW
    const registration = JSON.parse(lib_fs.readFileSync("./outfile_registration_duplicate.json").toString());
    
    lib_fs.writeFileSync("outfile_registration.csv", lib_fs.readFileSync(csvFilePath));
    lib_fs.writeFileSync("outfile_registration.json", JSON.stringify(registration));

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
                        // console.log(entry[name])
                        // console.log(entry[name] !== '')
                        // console.log(studentData[entry[name]])
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
                        console.log("TEAMS LOGGING")
                        if (!Array.isArray(studentData[entry[name]]["Team"])) studentData[entry[name]]["Team"] = [];
                        studentData[entry[name]]['Team'].push(name);
                    }
                    // Hopefully won't be triggered -- nvm, fixed
                    else if (!studentData.hasOwnProperty(entry[name]['Team']) &&
                        entry[name] != '') {
                        console.log("SOMETHING WENT WRONG, VERY WRONG");
                        console.log(studentData);
                        console.log(entry[name]);
                        console.log(name);
                        studentData[entry[name]]['Team'] = [name];
                    }
                }
            }
        }

        // console.log(schoolData);
        // console.log(studentData);

        try {
            // Update schools
            await schoolsTable.create(schoolData);

            // Create student records
            for (var student in studentData) {
                const finalJSON = {};

                const school = schoolData['Name'];
                const row = await schoolsTable.read({
                    filterByFormula: 'Name = "' + school + '"',
                    maxRecords: 1
                });
                
                //console.log(schoolData);

                finalJSON['Name'] = student;

                // I have no idea how this works but i'm not going to touch it
                finalJSON['School'] = [row[0]['id']];
                finalJSON['Grade'] = studentData[student]['Grade'];

                for (var contest in studentData[student]['Competitions']) {
                    const contestName = "Division " + schoolData['Division']
                        + " " + studentData[student]['Competitions'][contest];

                    if (contestName.includes("Team")) {
                      finalJSON['Team'] = contestName;
                    }
                    else if (contestName.includes("Creative Thinking")) {
                      finalJSON['Creative Thinking'] = contestName;
                    }
                    else {
                      finalJSON['Individual'] = contestName;
                    }
                }

                // finalJSON['Tests'] = studentData[student][Competitions]

                // console.log(finalJSON);

                await studentsTable.create(finalJSON);
            }

            // Put students in competitions
            for (var student in studentData) {
                var finalJSON = {};
                for (var contest in studentData[student]['Competitions']) {
                    const contestName = "Division " + schoolData['Division']
                        + " " + studentData[student]['Competitions'][contest];

                    // Deal with team later
                    if(!contestName.includes("Team")) {
                        //console.log("Handling individual: " + contestName);

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

                        //console.log("PRINTING:" + [row[0]['id']]);
                        
                        try {
                            finalJSON['Competition'] = [row[0]['id']];
                        } catch (e) {
                            console.log("Handling individual: " + contestName);
                            console.log(row);
                            console.log(student);
                            throw e;
                        }

                        // console.log(finalJSON);
                        await testsTable.create(finalJSON);
                    }
                }

                for(var t in studentData[student]['Team']) {
                    const school = schoolData['Name'];
                    const team = studentData[student]['Team'][t];
                    console.log(team);
                    if(team.includes("7th")) {
                        const row = await competitionsTable.read({
                            filterByFormula: 'Name = "Division ' + schoolData['Division'] + ' 7th Grade Team"',
                            maxRecords: 1
                        });

                        const studentRow = await studentsTable.read({
                            filterByFormula: 'Name = "' + student + '"',
                            maxRecords: 1
                        });

                        // Never hurts to check for null
                        const schoolTeam = school + team.slice(0, -2);

                        if(teamData.hasOwnProperty(schoolTeam)) {
                            // Switch in person
                            if(team.charAt(team.length - 1) === '1') {
                                const temp = teamData[schoolTeam]['Students'][0];

                                teamData[schoolTeam]['Students'][0] = studentRow[0]['id'];
                                teamData[schoolTeam]['Students'].push(temp);
                            }
                            else {
                                teamData[schoolTeam]['Students'].push(studentRow[0]['id']);
                            }
                        }
                        else if(schoolTeam != '') {
                            teamData[schoolTeam] = {};
                            teamData[schoolTeam]['Competition'] = [row[0]['id']];
                            teamData[schoolTeam]['Students'] = [studentRow[0]['id']];
                        }
                    }
                    else {
                        const row = await competitionsTable.read({
                            filterByFormula: 'Name = "Division ' + schoolData['Division'] + ' 8th Grade Team"',
                            maxRecords: 1
                        });

                        const studentRow = await studentsTable.read({
                            filterByFormula: 'Name = "' + student + '"',
                            maxRecords: 1
                        });

                        // Never hurts to check for null
                        const schoolTeam = school + team.slice(0, -2);

                        if(teamData.hasOwnProperty(schoolTeam)) {
                            // Switch in person if necessary
                            if(team.charAt(team.length - 1) === '1') {
                                const temp = teamData[schoolTeam]['Students'][0];

                                teamData[schoolTeam]['Students'][0] = studentRow[0]['id'];
                                teamData[schoolTeam]['Students'].push(temp);
                            }
                            else {
                                teamData[schoolTeam]['Students'].push(studentRow[0]['id']);
                            }
                        }
                        else if(schoolTeam != '') {
                            teamData[schoolTeam] = {};
                            teamData[schoolTeam]['Competition'] = [row[0]['id']];
                            teamData[schoolTeam]['Students'] = [studentRow[0]['id']];
                        }
                    }
                }
            }

            for(var record in teamData) {
                await testsTable.create(teamData[record]);
            }

            // console.log(teamData);
        }
        catch (e) {
            console.error(e);
        }

        lib_fs.writeFileSync("output_dat_" + entry["School Name"] + ".json", JSON.stringify({ schoolData, teamData, studentData }));
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
