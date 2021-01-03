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
            let question = activeCompetition.fields["Q"+questionNumber];
            if (question === undefined) {
                moreQuestions = false;
            } else {
                questions.push({["Q"+questionNumber]:question, n: parseInt(questionNumber)});
                questionNumber ++;
                // console.log(questionNumber, activeCompetition.fields["Q"+questionNumber])
            }
        } catch {
            moreQuestions = false;
        }
    }

    // console.log(questions);
    return questions;
}

module.exports = {
    getQuestions
}
console.log(getQuestions("A-7I"));