import * as fs from 'fs';
import AirtablePlus from 'airtable-plus';
import { apiKey, baseID } from '../../secrets.js';
const { mdToPdf } = require('md-to-pdf');
const shell = require('shelljs');

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
    questionNumber?: number;
}

interface Test {
    [key: string]: any;
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
    'School Name': string[];
    totalPoints?: number;
    correctQuestions?: number;
    questions?: Question[];
    'Disclaimer'?: string;
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

// There is probably a better way to do this
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
    tests = tests.filter(test => test["Student Names"][0] !== "Answer Key");

    const gradeCompetition = (id: string, generateScoreReports: boolean = true) => {
        let csv = ['Name, School, Number of Questions Correct, Total Score'];

        let testsToGrade = tests.filter(test => test['Competition ID'][0] == id);
        let answerKey = getCorrectAnswers(testsToGrade[0].Competition[0]);
        let questionAnswers: any = {

        };

        testsToGrade.sort((a,b) => a['School Name'] > b['School Name'] ? -1 : 1);

        Object.keys(answerKey).forEach(key => questionAnswers[key] = {
            correctAnswer: answerKey[key],
            correctStudents: 0,
            correctAnswers: [],
            incorrectAnswers: []
        });    

        testsToGrade.forEach(test => {
            let gradedTest = gradeTest(test, answerKey)
            let gradedQuestions = gradedTest.questions;
            
            gradedQuestions.forEach(question => {                
                let questionAnswer = questionAnswers[question.key];
                if (!question.correct) {                                        
                    questionAnswer.incorrectAnswers.push(question.studentAnswer);
                } else {
                    questionAnswer.correctAnswers.push(question.studentAnswer);
                    questionAnswer.correctStudents ++;
                }
            });

            if (generateScoreReports) generateScoreReport(gradedTest);

            csv.push(`"${test['Student Names']}", ${test['School Name'][0]}, ${test.correctQuestions}, ${test.totalPoints}`);
        });

        fs.writeFileSync("./private-data/graded-data/"+id+".csv", csv.join("\n"));
        console.log(questionAnswers);
    }

    const gradeTest = (test: Test, answerKey: AnswerSet): Test => {
        let competition = competitions.find(c => c.id == test.Competition[0]);
        // let answerKey = getCorrectAnswers(competition.id);
        let answers = getAnswers(test);
        let questions: Question[] = [];

        let charctersToReplace = ["%", "mph", "meters", "miles per hour", "minutes", "years old", "units", " ", "$", ","];
        
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

            correctAnswer = correctAnswer.toLowerCase();
            studentAnswer = studentAnswer.toLowerCase();
            
            if (correctAnswer == studentAnswer && correctAnswer.length !== 0) {
                correctQuestions ++;
                question.correct = true;
                // console.log('correct');
            } else {
                // if (test['Student Names'].join().includes("Sophia"))
                // console.log(`Correct Answer: ${correctAnswer} \nStudent Answer: ${studentAnswer}\n`);
            }

            if (correctAnswer.length !== 0) questions.push(question);
        });

        test.correctQuestions = correctQuestions;
        test.totalPoints = competition.fields["Points Per Question"] * correctQuestions * (competition.fields["Adjusted Score"] ? 20 / test['Current Question Index'] : 1);
        test.questions = questions;
        return test;
    }

    const getCorrectAnswers = (competitionId: string): AnswerSet => {
        let answerKey = answerKeys.find(test => test.Competition[0] == competitionId);        
        return getAnswers(answerKey);
    }

    const getAnswers = (test: Test | null): AnswerSet => {
        let answerSet: AnswerSet = {...blankAnswerSet}; // have to make a copy since objects are pass by reference

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

    const generateScoreReport = async (test: Test) => {
        let questionTemplate: string;
        let reportTemplate: string;
        try {
            reportTemplate = await fs.readFileSync('./one-time-scripts/grading/report-template.md', 'utf8');
            questionTemplate = await fs.readFileSync('./one-time-scripts/grading/question-template.md', 'utf8');
        } catch (e) {
            console.log("Error reading template: "+e);
        }
        let competitionName = test['Competition Name'][0];
        // let competition = competitions.find(c => c.id == test.Competition[0]);
        test.questions.forEach(q => {
            q.questionNumber = parseFloat(q.key.substring(1));
        })
        let sortedQuestions = test.questions.sort((a, b) => {
            return (a.questionNumber < b.questionNumber ? -1 : 1);
        });

        let questionsMd = sortedQuestions.map(question => {
            let md = questionTemplate;
            md = md.replace("{{questionColor}}", question.correct ? "green" : "red");
            md = md.replace("{{questionNumber}}", question.questionNumber.toString());
            md = md.replace("{{studentAnswer}}", question.studentAnswer.length == 0 ? " " : question.studentAnswer);
            md = md.replace("{{correctAnswer}}", question.correctAnswer);

            return md;
        }).join("\n\n");

        let reportMd = reportTemplate
        reportMd = reportMd.replace("{{studentName}}", test['Student Names'].join(', '));
        reportMd = reportMd.replace("{{subtitle}}", "Junior High Math Contest Student Score Report");
        reportMd = reportMd.replace("{{competitionName}}", competitionName);
        reportMd = reportMd.replace("{{score}}", test.totalPoints.toPrecision(4));
        reportMd = reportMd.replace("{{disclaimer}}", test.totalPoints.toPrecision(4));

        reportMd = reportMd.replace("{{questions}}", questionsMd);

        try {
            const path = `./private-data/test-reports/${test['School Name'][0]}/${test['Competition Friendly Name'][0]}/`;
            let pathExists = await fs.existsSync(path);
            
            if (!(pathExists)){
                await shell.mkdir("-p", path);
            }
            await mdToPdf({content: reportMd},  { dest: path + `/${test['Student Names'].join(" ")}.pdf` });
        } catch (e) {
            console.log("Error producing student report: " + e);
        }
    }

    gradeCompetition("A-7I");
    gradeCompetition("AA-7I");
    
    gradeCompetition("A-8I");
    gradeCompetition("AA-8I");
    
    gradeCompetition("A-7T");
    gradeCompetition("AA-7T");

    gradeCompetition("A-8T");
    gradeCompetition("AA-8T");

    gradeCompetition("A-C");
    gradeCompetition("AA-C");
})();

