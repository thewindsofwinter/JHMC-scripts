const socketio = require('socket.io');
const Color = require('color');
let ejs = require('ejs');

module.exports = (http, app, alertsTable) => {
    const io = socketio(http);
    io.on("connection", async socket => {
        console.log("user connected!");
        let liveAlerts = await getAlerts(alertsTable, false);
        let alertObject = await getAlertObject(liveAlerts);
        
        socket.emit("message", alertObject);
    });

    app.get("/admin/update-alerts", async (req, res) => {
        let liveAlerts = await getAlerts(alertsTable, false);
        let alertObject = await getAlertObject(liveAlerts);
        sendMessage(alertObject);

        res.send("Alerts Updated!");
    });

    const sendMessage = (message) => {
        io.emit("message", message);
    }    
}

const getAlertObject = async (alerts) => {
    let html = "";
    console.log(alerts);
    alerts.forEach(async alert => {
        let alertHtml = await ejs.renderFile('./views/partials/alert.ejs', alert);
        console.log(alertHtml);
        html += alertHtml;
    });
    
    await html;

    return {
        type: "alerts",
        body: alerts,
        html: html
    }
}

const getAlerts = async (alertsTable, testStatus=false) => {
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