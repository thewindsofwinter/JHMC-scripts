const AirtablePlus = require('airtable-plus');
const CSV = require('csvtojson');

const { apiKey, baseID, sampleTestId } = require('../secrets.js');

// baseID, apiKey, and tableName can alternatively be set by environment variables
const testsTable = new AirtablePlus({ tableName: "Tests", apiKey, baseID }),
    studentsTable = new AirtablePlus({ tableName: "Students", apiKey, baseID }),
    schoolsTable = new AirtablePlus({ tableName: "Schools", apiKey, baseID }),
    competitionsTable = new AirtablePlus({ tableName: "Competitions", apiKey, baseID });

// What stuff to do for the school from the spreadsheet
const schoolHeader = 'Team Name';

// Stuff on our end
const schoolAttributes = ['Coach Name', 'Email Address'];
// Stuff on the Airtable end
const tableValues = ['Coach Name', 'Coach Email'];

// Change once we get actual rosters
const csvFilePath = './private-data/2024roster.csv';

(async () => {
    // Start by getting competitions
    const competitions = await competitionsTable.read()

    const registration = await CSV().fromFile(csvFilePath);

    // Show an example
    /* var ex = await studentsTable.read();
    console.log(ex[0]); */

    for (var entry of registration) {
        // console.log(entry);

        // A record is created for each school under “Schools” with
        // Coach name, email, division, etc.
        var schoolData = {};
        schoolData['Name'] = entry[schoolHeader];
        schoolData['Division'] = 'AA'

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
                    if(!name.includes('Email')) {
                      if (studentData.hasOwnProperty(entry[name]) &&
                          entry[name] !== '') {
                          // Update each time -- that way at the end if someone is in 7th they will show up
                          studentData[entry[name]]['Competitions'].push(stripTitle(name))
                          studentData[entry[name]]['Grade'] = '7th';
                      }
                      else if (entry[name] != '') {
                          studentData[entry[name]] = {};
                          studentData[entry[name]]['Student Email'] = entry[name + ' Email'];
                          studentData[entry[name]]['Competitions'] = [stripTitle(name)];
                          studentData[entry[name]]['Grade'] = '7th';
                      }
                    }
                    else {

                    }
                }
                else if (name.includes('8th')) {
                    if(!name.includes('Email')) {
                      if (studentData.hasOwnProperty(entry[name]) &&
                          entry[name] !== '') {
                          // console.log(entry[name])
                          // console.log(entry[name] !== '')
                          // console.log(studentData[entry[name]])
                          // Could be a 7th grader -- dont update the grade field
                          studentData[entry[name]]['Competitions'].push(stripTitle(name));
                      }
                      else if (entry[name] != '') {
                          // console.log(name + ' Email');
                          studentData[entry[name]] = {};
                          studentData[entry[name]]['Student Email'] = entry[name + ' Email'];
                          studentData[entry[name]]['Competitions'] = [stripTitle(name)];
                          studentData[entry[name]]['Grade'] = '8th';
                      }
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


                // Add team data (and CT)
                if(name.includes('Team') && !name.includes('Creative Thinking')) {
                    if (studentData.hasOwnProperty(entry[name]['Team']) &&
                        entry[name] !== '') {
                        studentData[entry[name]]['Team'].push(name);
                    }
                    // Hopefully won't be triggered -- nvm, fixed
                    else if (!studentData.hasOwnProperty(entry[name]['Team']) &&
                        entry[name] != '') {
                        // console.log("SOMETHING WENT WRONG, VERY WRONG");
                        studentData[entry[name]]['Team'] = [name];
                    }
                }

                if(name.includes('Creative Thinking')) {
                    if (studentData.hasOwnProperty(entry[name]['Creative Thinking']) &&
                        entry[name] !== '') {
                        studentData[entry[name]]['Creative Thinking'].push(name);
                    }
                    // Hopefully won't be triggered -- nvm, fixed
                    else if (!studentData.hasOwnProperty(entry[name]['Creative Thinking']) &&
                        entry[name] != '') {
                        // console.log("SOMETHING WENT WRONG, VERY WRONG");
                        studentData[entry[name]]['Creative Thinking'] = [name];
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
                finalJSON['Student Email'] = studentData[student]['Student Email'];
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

                // await studentsTable.create(finalJSON);
            }

            // Put students in competitions
            for (var student in studentData) {
                var finalJSON = {};
                for (var contest in studentData[student]['Competitions']) {
                    const contestName = "Division " + schoolData['Division']
                        + " " + studentData[student]['Competitions'][contest];

                    // Deal with team later
                    if(!contestName.includes("Team") && !contestName.includes("Creative Thinking")) {
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

                        console.log(finalJSON);
                        await testsTable.create(finalJSON);
                    }
                }

                /* if(studentData[student].hasOwnProperty('Team')) {
                  // console.log(studentData[student]['Team'])
                  for(var t in studentData[student]['Team']) {
                      const school = schoolData['Name'];
                      const team = studentData[student]['Team'][t];
                      // console.log(school + " " + team)
                      // console.log(team);
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

                          // console.log(row)
                          // console.log(studentRow)
                          // console.log(schoolTeam)

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
              } */

              if(studentData[student].hasOwnProperty('Creative Thinking')) {
                  for(var t in studentData[student]['Creative Thinking']) {
                      const school = schoolData['Name'];
                      const team = studentData[student]['Creative Thinking'][t];
                      // console.log(team);
                      if(team.includes("Seventh")) {
                          const row = await competitionsTable.read({
                              filterByFormula: 'Name = "Division ' + schoolData['Division'] + ' Creative Thinking"',
                              maxRecords: 1
                          });

                          const studentRow = await studentsTable.read({
                              filterByFormula: 'Name = "' + student + '"',
                              maxRecords: 1
                          });

                          // Never hurts to check for null
                          const schoolTeam = school + team.slice(0, -15);

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
                              filterByFormula: 'Name = "Division ' + schoolData['Division'] + ' Creative Thinking"',
                              maxRecords: 1
                          });

                          const studentRow = await studentsTable.read({
                              filterByFormula: 'Name = "' + student + '"',
                              maxRecords: 1
                          });

                          // Never hurts to check for null
                          const schoolTeam = school + team.slice(0, -14);
                          console.log(schoolTeam)

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
          }

          console.log(teamData);

          for(var record in teamData) {
              await testsTable.create(teamData[record]);
          }

          // console.log(teamData);
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
