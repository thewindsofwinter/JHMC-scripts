const express = require('express');
const app = express();
const AirtablePlus = require('airtable-plus');
const DotEnv = require('dotenv').config({ path: './../.env' });

// baseID, apiKey, and tableName can alternatively be set by environment variables
const testsTable = new AirtablePlus({ tableName: "Tests" }),
    studentsTable = new AirtablePlus({ tableName: "Students" }),
    schoolsTable = new AirtablePlus({ tableName: "Schools" }),
    competitionsTable = new AirtablePlus({ tableName: "Competitions" });

const generateJoinLinks = async () => {
    try {
        const students = await studentsTable.read();

        let studentLinks;
        students.forEach(async s => {
            studentLinks = s.fields["Personalized Schedule"];
            // console.log(studentLinks);
           
        });
    } catch (e) {
        console.log(e);
    }
}

generateJoinLinks();
