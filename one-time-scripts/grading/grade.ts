// import * as fs from 'fs';
import AirtablePlus from 'airtable-plus';
import { apiKey, baseID } from '../../secrets.js';
let color = require('colorts');

const numQuestions = 20;

interface TestRecord {
    fields: Test;
    id: string;
}

interface AnswerSet {
    [key: string]: string;
    Q1: string;
    Q2: string;
    Q3: string;
    Q4: string;
    Q5: string;
    Q6: string;
    Q7: string;
    Q8: string;
    Q9: string;
    Q10: string;
    Q11: string;
    Q12: string;
    Q13: string;
    Q14: string;
    Q15: string;
    Q16: string;
    Q17: string;
    Q18: string;
    Q19: string;
    Q20: string;
}

interface Test {
    [key: string]: string | number | string[] | undefined;
    Students: string[];
    'Start Time': string;
    Competition: string[];
    'Question Order': string;
    'Current Question Index': number;
    Grader: string[];
    ID: string;
    School: string[];
    'Competition ID': string[];
    Division: string[];
    'School Division': string[];
    Grades: string[];
    'Link To Join': string;
    'Max Duration': string[];
    'Competition Name': string[];
    'Competition Start Time': string[],
    'Competition End Time': string[],
    'Competition Friendly Name': string[];
    'Student Names': string[];
    'Competition Type': string[];
    'Duration (seconds)': any;
    'Record ID': string;
    Q1?: string;
    Q2?: string;
    Q3?: string;
    Q4?: string;
    Q5?: string;
    Q6?: string;
    Q7?: string;
    Q8?: string;
    Q9?: string;
    Q10?: string;
    Q11?: string;
    Q12?: string;
    Q13?: string;
    Q14?: string;
    Q15?: string;
    Q16?: string;
    Q17?: string;
    Q18?: string;
    Q19?: string;
    Q20?: string;
}

const blankAnswerSet: AnswerSet = {
    Q1: "",
    Q2: "",
    Q3: "",
    Q4: "",
    Q5: "",
    Q6: "",
    Q7: "",
    Q8: "",
    Q9: "",
    Q10: "",
    Q11: "",
    Q12: "",
    Q13: "",
    Q14: "",
    Q15: "",
    Q16: "",
    Q17: "",
    Q18: "",
    Q19: "",
    Q20: "",
}

const testsTable = new AirtablePlus({ tableName: "Tests", apiKey, baseID }),
    competitionTable = new AirtablePlus({ tableName: "Competitions", apiKey, baseID });

(async () => {
    let competitions: any[] = await competitionTable.read();
    let testRecords: TestRecord[] = await testsTable.read();
    let tests = testRecords.map(test => test.fields);
    let answerKeys = tests.filter(test => test["Student Names"][0] == "Answer Key");

    tests = tests.filter(test => test['Competition ID'][0] == "A-7I");

    const gradeTest = (test: Test) => {
        let competition = competitions.find(c => c.id == test.Competition[0]);
        let answerKey = getCorrectAnswers(competition.id);
        let answers = getAnswers(test);
        
        let correctQuestions = 0;
        Object.keys(answers).forEach(key => {
            // let correctAnswer = answerKey[key].replace(/\s/g, "");
            // let studentAnswer = answers[key].replace(/\s/g, "");
            let correctAnswer = answerKey[key];
            let studentAnswer = answers[key];
            
            if (correctAnswer === studentAnswer) {
                correctQuestions ++;
                // console.log('correct');
            } else {
                console.log(`Correct Answer: ${correctAnswer} \nStudent Answer: ${studentAnswer}\n`);
            }
        });

        console.log(("Total Correct: "+correctQuestions).green);
        
    }

    const getCorrectAnswers = (competitionId: string): AnswerSet => {
        let answerKey = answerKeys.find(test => test.Competition[0] == competitionId);
        return getAnswers(answerKey);
    }

    const getAnswers = (test: Test | null): AnswerSet => {
        let answerSet: AnswerSet = {...blankAnswerSet};

        if (test != null) {
            for (var i = 1; i <= numQuestions; i++) {
                let code = "Q" + i;
                let answer = test[code] || "";
                // console.log(test);
                
                if (answer === undefined || answer === null) {
                    answerSet[code] = "";
                } else if (typeof answer === "string") {
                    answerSet[code] = answer;
                }
            }
        }   
        
        return answerSet;
    };

    tests.forEach(test => {
        gradeTest(test);
    });
})();
