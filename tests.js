const AirtablePlus = require('airtable-plus');
const DotEnv = require('dotenv').config();
const { apiKey, baseID, sampleTestId, masterTestId } = require('./secrets.js');

const competitionsTable = new AirtablePlus({ tableName: "Competitions", apiKey, baseID });

const getQuestions = async (competitionCode) => {
    competitionCode = competitionCode.toUpperCase();
    const allCompetitions = await competitionsTable.read();
    let activeCompetition = allCompetitions.find(c => c.fields.Code == competitionCode);
    let questions = [],
        moreQuestions = true,
        questionNumber = 1;

    while (moreQuestions) {
        try {
            let question = activeCompetition.fields["Q" + questionNumber];
            if (question === undefined) {
                moreQuestions = false;
            } else {
                questions.push({
                    ["Q" + questionNumber]: question,
                    questionNumber: parseInt(questionNumber),
                    text: question,
                    questionCode: "Q" + questionNumber
                });
                questionNumber++;
            }
        } catch {
            moreQuestions = false;
        }
    }

    return questions;
}

const getOrderedQuestions = async (record, competitionCode, competitionId) => {
    // TODO: Add robustness so this can't break with incorrect indexing etc.
    // Example: I had previously listed question 4 twice, which made it have 11 questions... this wouldn't happen if I did it automatically, but it's still an issue!

    let unordered = await getQuestions(competitionCode);
    let questionOrderText = record.fields["Question Order"];
    console.log(record);
    if (questionOrderText == undefined || questionOrderText === null) {
        throw "There are no questions, or the question order is not set."
    }
    let order = questionOrderText.split(","); //TODO: Account for if there is no question order
    order = order.map(o => o - 1); //Adjusts for indexing starting at 0
    let ordered = order.map((o, i) => {
        return {
            ...unordered[o],
            index: i,
        }
    }).filter(o => o.questionNumber); //filters for all those that have a question number

    if (ordered.length < unordered.length) {
        let missingQuestions = unordered.filter(q => {
            return ordered.find(o => o.questionCode != q.questionCode)
        })
        ordered = [...ordered, missingQuestions]
        console.log("Questions are missing from the ordered questions with recordId "+record.id);
    }
    return ordered;
}

const validateTime = (competition, record, allowExtra=false) => {
    // TODO: turn off
    // return "true";

    if (record.id === sampleTestId) {
        return "true";
    } else if (record.id === masterTestId) {
        return "true";
    }

    let openTime = new Date(competition.fields.Opens) || new Date(0),
        closeTime = new Date(competition.fields.Closes) || new Date(8640000000000000), //Max date; I'll find a better way to do this
        startTime = new Date(record.fields["Start Time"]),
        duration = competition.fields["Max Duration"] * 1000,
        expireTime = new Date(startTime.getTime() + duration + (allowExtra ? (1000 * 5) : 0)); // Add 5 seconds grace period to get last question in

    // console.log(startTime)
    // console.log(expireTime)
    // console.log(currentTime)

    let currentTime = new Date();
    console.log("Current: " + currentTime + " " + currentTime.valueOf());
    console.log("Open: " + openTime + " " + openTime.valueOf());
    console.log("Close Time: " + closeTime + " " + closeTime.valueOf());
    if (openTime.valueOf() > currentTime.valueOf()) {
        return "Test not open yet"
    } else if (closeTime.valueOf() < currentTime.valueOf()) {
        return "Test closed"
    } else if (startTime && (expireTime < currentTime)) {
        return "Time limit reached"
    }
    return "true";
}

const getEndTime = (competition, record) => {
    let closeTime = new Date(competition.fields.Closes),
        startTime = new Date(record.fields["Start Time"]),
        duration = competition.fields["Max Duration"] * 1000,
        expireTime = new Date(startTime.getTime() + duration);

    // console.log(closeTime, startTime, expireTime);

    return closeTime > expireTime ? expireTime : closeTime
}

module.exports = {
    getQuestions,
    getOrderedQuestions,
    validateTime,
    getEndTime
}
