const AirtablePlus = require('airtable-plus');
const DotEnv = require('dotenv').config();

// baseID, apiKey, and tableName can alternatively be set by environment variables
const airtable = new AirtablePlus({
    apiKey: process.env.AIRTABLE_API_KEY,
    baseID: process.env.AIRTABLE_BASE_ID,
    tableName: "Tests",
});

const sampleResult = {
  "recordId": "reciWTsrkj3xzZPVJ",
  "answers": [
    {"Q1": "10"},
    {"Q2": "3.14159"},
    {"Q3": "1"},
    {"Q4": "4"},
    {"Q5": "1"},
    {"Q6": "5"},
    {"Q7": "9"},
    {"Q8": "3.12"},
    {"Q9": "119"},
    {"Q10": "0"}
  ]
};

async function onTestSubmission(result) {
    try {
        const id = result.recordId;

        const time = await airtable.update(id, {"Submission Time": Date.now()});
        for(const val in result.answers) {
            const res = await airtable.update(id, result.answers[val]);
        }
    }
    catch(e) {
        console.error(e);
    }
}

onTestSubmission(sampleResult);