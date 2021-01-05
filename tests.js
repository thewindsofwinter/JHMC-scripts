const AirtablePlus = require('airtable-plus');
const DotEnv = require('dotenv').config();

const competitionsTable = new AirtablePlus({ tableName: "Competitions" });

const getQuestions = async (competitionCode) => {
    competitionCode = competitionCode.toUpperCase();
    const allCompetitions = await competitionsTable.read();
    let activeCompetition = allCompetitions.find(c => c.fields.Code == competitionCode ? true : false);
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

    let unordered = await getQuestions(competitionCode);
    let order = record.fields["Question Order"].split(",");
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

const validateTime = (competition, record) => {
    let openTime = new Date(competition.fields.Opens),
        closeTime = new Date(competition.fields.Closes),
        startTime = new Date(record.fields["Start Time"]),
        duration = competition.fields["Max Duration"] * 1000,
        expireTime = new Date(startTime.getTime() + duration);
    
    let currentTime = new Date();
    if (openTime > currentTime) {
        return "Test not open yet"
    } else if (closeTime < currentTime) {
        return "Test closed"
    } else if (startTime && (expireTime < currentTime)) {
        return "Time limit reached"
    }
    return "true";
}

module.exports = {
    getQuestions,
    getOrderedQuestions,
    validateTime
}