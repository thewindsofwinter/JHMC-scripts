// Reach out to: Vidyoot Senthil '24 (vidyoots@gmail.com) with any questions about this script

const express = require('express');
const app = express();
const AirtablePlus = require('airtable-plus');
const DotEnv = require('dotenv').config({ path: './../.env' });
const fs = require("fs");
const { mdToPdf } = require('md-to-pdf');

const saveAllPdfs = true;

const { apiKey, baseID, sampleTestId } = require('./../secrets.js');

// baseID, apiKey, and tableName can alternatively be set by environment variables
const schoolsTable = new AirtablePlus({ tableName: "Schools", apiKey, baseID });

const generateJoinLinks = async () => {
    try {
        const schools = await schoolsTable.read();

        let studentLinks;

        let finalMd = ""
        schools.forEach(async school => {
            let schoolName = school.fields["Name"];
            let studentNames = school.fields["Student Names"];
            let studentLinks = school.fields["Student Links"];
            let students = [];
           
            try {
                studentNames.forEach((studentName, i) => {
                    students.push({
                        name: studentName,
                        link: studentLinks[i]
                    });
                });
            }
            catch(e) { console.log(e); }

            let studentLinkTexts = students.map(s => s.name + ": "+`[${s.link}](${s.link})`).join(" \\\n");
            let schoolMd = `# ${schoolName}\n## Coached By ${school.fields["Coach Name"]}\n### Division ${school.fields["Division"]}\n${studentLinkTexts}\n<div style="page-break-after: always;"></div>\n\n`;
            console.log(schoolMd);
            // console.log(studentLinks);
            await mdToPdf({ content: schoolMd }, { dest: `./private-data/schedule-links/${schoolName}.pdf` });

            finalMd += schoolMd;
        });
        console.log(finalMd);
        if (saveAllPdfs) {
            // for some reason, this line doesn't work for me. leaving it here for the future if someone wants a list of all schools.
            // await mdToPdf({ content: finalMd }, { dest: `schedule-links.pdf` });
        }
    } catch (e) {
        console.log(e);
    }
}

generateJoinLinks();
