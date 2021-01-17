const AirtablePlus = require('airtable-plus');
const Csv = require('csvtojson');
const DotEnv = require('dotenv').config({ path: './../.env' });

const testsTable = new AirtablePlus({ tableName: "Tests" }),
    studentsTable = new AirtablePlus({ tableName: "Students" }),
    schoolsTable = new AirtablePlus({ tableName: "Schools" }),
    competitionsTable = new AirtablePlus({ tableName: "Competitions" });

// Change once we get actual rosters
const csvFilePath='./../sampleRoster.csv'

Csv().fromFile(csvFilePath).then((jsonObj)=>{
        console.log(jsonObj);
        /**
         * [
         * 	{a:"1", b:"2", c:"3"},
         * 	{a:"4", b:"5". c:"6"}
         * ]
         */
    })
