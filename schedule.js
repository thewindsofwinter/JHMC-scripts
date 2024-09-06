let filterNonTestingRooms = (nonTestingRooms, groups, showDivision=false) => {
    let final = [];
    groups.push("All");

    nonTestingRooms.filter(room => arraysMatchOneTerm(room.fields.Group, groups))
    .forEach(room => {
        let name = room.fields.Name;
        if (showDivision) {
            let divisionA = room.fields.Group.includes("A");
            let divisionAA = room.fields.Group.includes("AA");
            if (divisionA) {
                name += " - Division A";
            } else if (divisionAA) {
                name += " - Division AA";
            }
        }
            final.push({
                zoomLink: room.fields["Zoom Link"],
                name: name,
                openTime: room.fields.Start,
                closeTime: room.fields.End,
                openTimeText: new Date(test.fields["Competition Start Time"]).toLocaleString("CDT", { timeStyle: 'short', dateStyle: 'short', timeZone: "America/Chicago" }),
                closeTimeText: new Date(test.fields["Competition End Time"]).toLocaleString("CDT", { timeStyle: 'short', dateStyle: 'short', timeZone: "America/Chicago" }),
                id: room.fields.ID
            });
        });

    return final.sort((a, b) => new Date(a.openTime) - new Date(b.openTime));
}

let arraysMatchOneTerm = (arr1, arr2) => {
    return arr1.some(r => arr2.includes(r));
}

module.exports = (app, { eventsTable, studentsTable, schoolsTable, testsTable, alertsTable }, websocket, error) => {
    app.get('/student/:studentId', async (req, res) => {
        const studentId = req.params.studentId;
        try {
            let student = await studentsTable.find(studentId);
            console.log(student);
            let testIds = student.fields.Tests;
            let school = await schoolsTable.find(student.fields["School"]);

            let studentRooms = await Promise.all(testIds.map(async (testId) => {
                let test = await testsTable.find(testId),
                    competitionName = test.fields["Competition Name"][0];

                let zoomLink = school.fields["7th Grade Zoom Link"];
                if (competitionName.includes("8th")) {
                    zoomLink = school.fields["8th Grade Zoom Link"];
                } else if (competitionName.includes("Creative")) {
                    zoomLink = school.fields["Creative Thinking Zoom Link"];
                }

                let subtext = test.fields["Student Names"].length == 1 ? "" : test.fields["Student Names"].join(", ");

                let testLink = test.fields["Link To Join"] + `?student=${student.id}`

                if (test.fields.Students[0] !== student.id) {
                    testLink = null;
                }

                let teamTest = test.fields.Students.length != 1;

                return {
                    testLink,
                    zoomLink,
                    subtext,
                    name: test.fields["Competition Friendly Name"],
                    openTime: test.fields["Competition Start Time"],
                    closeTime: test.fields["Competition End Time"],
                    openTimeText: new Date(test.fields["Competition Start Time"]).toLocaleString("CDT", { timeStyle: 'short', dateStyle: 'short', timeZone: "America/Chicago" }),
                    closeTimeText: new Date(test.fields["Competition End Time"]).toLocaleString("CDT", { timeStyle: 'short', dateStyle: 'short', timeZone: "America/Chicago" }),
                    teamTest,
                    students: test.fields["Student Names"],
                };
            }));

            // let liveAlerts = websocket.getAlerts(alertsTable)
            let [nonTestingRooms, liveAlerts] = await Promise.all([eventsTable.read(), websocket.getAlerts(alertsTable)]);
            // eventsTable.read()
            // screw non testing rooms

            let alertsObject = await websocket.getAlertObject(liveAlerts),
                alertsHtml = alertsObject.html;

            // let filteredNonTestingRooms = filterNonTestingRooms(nonTestingRooms, [school.fields.Division, "Students"])
            // studentRooms = studentRooms.concat(filteredNonTestingRooms);

            studentRooms.sort((a, b) => new Date(a.openTime) - new Date(b.openTime));

            let now = new Date();
            studentRooms = studentRooms.map(room => {
                return {
                    ...room,
                    active: (new Date(room.openTime) < now && new Date(room.closeTime) > now)
                };
            });

            res.status(200).render("pages/links.ejs", {
                rooms: studentRooms,
                name: student.fields.Name,
                primary: student.fields.Name,
                secondary: "JHMC 2024", // Goes in the <title>
                schoolName: school.fields.Name,
                // helpLink: nonTestingRooms.find(room => room.fields.ID == "help").fields["Zoom Link"],
                helpLink: "https://zoom.us/j/97978208692?pwd=OXFEREZJekVsQ1diRVNwNllFRlk0dz09",
                divisionText: "Division " + school.fields.Division,
                // alertsHtml: "hi",
                alertsHtml
            });
        } catch (e) {
            console.error(e);
            error(res);
        }
    });

    app.get('/coaches', async (req, res) => {
        let nonTestingRooms = await eventsTable.read();
        // screw non-testing rooms
        // await eventsTable.read();
        let filteredNonTestingRooms = filterNonTestingRooms(nonTestingRooms, ["Coaches"], showDivision=true);

        let liveAlerts = await websocket.getAlerts(alertsTable);
        let alertsObject = await websocket.getAlertObject(liveAlerts),
            alertsHtml = alertsObject.html;

        // Activate rooms
        let now = new Date();
        filteredNonTestingRooms = filteredNonTestingRooms.map(room => {
            return {
                ...room,
                active: (new Date(room.openTime) < now && new Date(room.closeTime) > now)
            };
        });

        res.status(200).render("pages/links.ejs", {
            rooms: filteredNonTestingRooms,
            name: "Coaches",
            primary: "Coaches Schedule",
            secondary: "JHMC 2024", // Goes in the <title>
            schoolName: "",
            // helpLink: nonTestingRooms.find(room => room.fields.ID == "help").fields["Zoom Link"],
            helpLink: "https://zoom.us/j/97978208692?pwd=OXFEREZJekVsQ1diRVNwNllFRlk0dz09",
            divisionText: "",
            alertsHtml
        });
    });

    app.get('/parents', async (req, res) => {
        let nonTestingRooms = await eventsTable.read();
        // screw non-testing rooms
        // await eventsTable.read();
        let filteredNonTestingRooms = filterNonTestingRooms(nonTestingRooms, ["Parents"], showDivision=true);

        let liveAlerts = await websocket.getAlerts(alertsTable);
        let alertsObject = await websocket.getAlertObject(liveAlerts),
            alertsHtml = alertsObject.html;

        // Activate rooms
        let now = new Date();
        filteredNonTestingRooms = filteredNonTestingRooms.map(room => {
            return {
                ...room,
                active: (new Date(room.openTime) < now && new Date(room.closeTime) > now)
            };
        });

        res.status(200).render("pages/links.ejs", {
            rooms: filteredNonTestingRooms,
            name: "Parents",
            primary: "Parents Schedule",
            secondary: "JHMC 2024", // Goes in the <title>
            schoolName: "",
            // helpLink: nonTestingRooms.find(room => room.fields.ID == "help").fields["Zoom Link"],
            helpLink: "https://zoom.us/j/97978208692?pwd=OXFEREZJekVsQ1diRVNwNllFRlk0dz09",
            divisionText: "",
            alertsHtml
        });
    });
}
