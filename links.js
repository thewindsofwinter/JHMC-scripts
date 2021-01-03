const express = require('express');
const app = express();
const AirtablePlus = require('airtable-plus');
const DotEnv = require('dotenv').config();

// baseID, apiKey, and tableName can alternatively be set by environment variables
const testsTable = new AirtablePlus({ tableName: "Tests" }),
    studentsTable = new AirtablePlus({ tableName: "Students" }),
    schoolsTable = new AirtablePlus({ tableName: "Schools" }),
    competitionsTable = new AirtablePlus({ tableName: "Competitions" });

async function generateJoinLinks() {
    try {
        const students = await studentsTable.read();
        let table = [];
        let studentLinks;
        students.forEach(async s => {
            studentLinks = s.fields["Links to Join"];
            // console.log(studentLinks);
            await s.fields.Competitions.forEach(async (c,i) => {
                let competitionRecord = await competitionsTable.find(c),
                    competitionName = competitionRecord.fields.Name;
                const joinText = studentLinks[i] + competitionName;
                console.log(joinText);

                // TODO: Generate HTML? with join links
            });
        });
    } catch (e) {
        console.log(e);
    }
}

generateJoinLinks()