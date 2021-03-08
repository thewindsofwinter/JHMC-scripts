const socketio = require('socket.io');
const Color = require('color');
const cors = require('cors');
let ejs = require('ejs');

const buildWebsocket = (http, app, alertsTable) => {
    const io = socketio(http);
    io.on("connection", async socket => {
        console.log("user connected!");
        let liveAlerts = await getAlerts(alertsTable, false);
        let alertObject = await getAlertObject(liveAlerts);

        // don't need to send new connections the alerts, as the alerts are sent with the HTML
        // socket.emit("message", alertObject);
    });

    // have to enable CORS to allow airtable script to call
    app.get("/admin/update-alerts", cors(), async (req, res) => { 
        let liveAlerts = await getAlerts(alertsTable, false);
        let alertObject = await getAlertObject(liveAlerts);
        io.emit("message", message);

        res.send("Alerts Updated!");
    });

    app.get('/admin/force-reload', cors(), async (req, res) => {
        io.emit("message", {
            type: "reload"
        });

        res.send("Forced Reload!");
    });
}

const getAlertObject = async (alerts) => {
    let html = "";

    await alerts.forEach(async alert => {
        let alertHtml = await ejs.renderFile('./views/partials/alert.ejs', alert);
        html += alertHtml;
    });

    return {
        type: "alerts",
        body: alerts,
        html: html
    }
}

const getAlerts = async (alertsTable, testStatus = false) => {
    let allAlerts = await alertsTable.read();

    let liveAlerts = allAlerts.filter(alert => alert.fields.Status == "Deployed" || (alert.fields.Status == "Test Deployed" && testStatus));
    return liveAlerts.map(alert => {
        return {
            head: alert.fields.Header,
            body: alert.fields.Body,
            category: alert.fields.Category
        }
    });
}

module.exports = {
    buildWebsocket,
    getAlertObject,
    getAlerts
}


