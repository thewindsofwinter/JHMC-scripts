// import * as fs from 'fs';
import AirtablePlus from 'airtable-plus';
import { apiKey, baseID } from '../../secrets.js';

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

interface Question {
    question?: string;
    studentAnswer: string;
    correctAnswer: string;
    correct: boolean;
    key: string;
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
    'School Name': string;
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
    // tests = tests.filter(test => test["Student Names"][0] !== "Answer Key");

    const gradeCompetition = (id: string) => {
        let testsToGrade = tests.filter(test => test['Competition ID'][0] == id);
        let answerKey = getCorrectAnswers(testsToGrade[0].Competition[0]);
        let questionAnswers: any = {

        };

        Object.keys(answerKey).forEach(key => questionAnswers[key] = {
            correctAnswer: answerKey[key],
            // correctAnswers: [],
            incorrectAnswers: []
        });    

        testsToGrade.forEach(test => {
            let graded = gradeTest(test, answerKey);
            
            graded.forEach(question => {                
                if (!question.correct) {                                        
                    questionAnswers[question.key].incorrectAnswers.push(question.studentAnswer);
                }
            });
        });

        console.log(questionAnswers);
    }

    const gradeTest = (test: Test, answerKey: AnswerSet) => {
        let competition = competitions.find(c => c.id == test.Competition[0]);
        // let answerKey = getCorrectAnswers(competition.id);
        let answers = getAnswers(test);
        let questions: Question[] = [];

        let charctersToReplace = [" ", ".", "$"];
        
        let correctQuestions = 0;
        Object.keys(answers).forEach(key => {
            let correctAnswer = answerKey[key];
            let studentAnswer = answers[key];

            // store raw answer before formatted
            let question: Question = {
                studentAnswer,
                correctAnswer,
                correct: false,
                key
            }

            charctersToReplace.forEach(c => {
                correctAnswer = correctAnswer.replace(new RegExp(c.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), "g"), "");
                studentAnswer = studentAnswer.replace(new RegExp(c.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), "g"), "");
            });
            
            if (correctAnswer === studentAnswer) {
                correctQuestions ++;
                question.correct = true;
                // console.log('correct');
            } else {
                // if (test['Student Names'].join().includes("Sophia"))
                // console.log(`Correct Answer: ${correctAnswer} \nStudent Answer: ${studentAnswer}\n`);
            }

            questions.push(question);
        });

        // console.log(("Total Correct: "+correctQuestions + "\t" + test['Student Names'].join() + "\t" + test['School Name']));
        test["Total Correct"] = correctQuestions;
        return questions;
    }

    const getCorrectAnswers = (competitionId: string): AnswerSet => {
        let answerKey = answerKeys.find(test => test.Competition[0] == competitionId);        
        return getAnswers(answerKey);
    }

    const getAnswers = (test: Test | null): AnswerSet => {
        let answerSet: AnswerSet = {...blankAnswerSet};

        // answerSet.name = test['Student Names'].join();
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

    gradeCompetition("A-7I");
})();
