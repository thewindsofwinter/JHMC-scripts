const AirtablePlus = require('airtable-plus');
const DotEnv = require('dotenv').config({ path: './../.env' });

const testsTable = new AirtablePlus({ tableName: "Tests" });

// Updates the Sample Student to have the Sample Test
testsTable.update("recxoaUwVczIIvePK", {"Competition": ["recpYt8CFHJIJeLTB"]})