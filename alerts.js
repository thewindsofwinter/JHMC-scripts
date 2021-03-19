const cors = require('cors');
let ejs = require('ejs');

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

const getAlerts = async (alertsTable, includeTests = false) => {
    let allAlerts = await alertsTable.read();

    let liveAlerts = allAlerts.filter(alert => alert.fields.Status == "Deployed" || (alert.fields.Status == "Test Deployed" && includeTests));
    return liveAlerts.map(alert => {
        return {
            head: alert.fields.Header,
            body: alert.fields.Body,
            category: alert.fields.Category
        }
    });
}

module.exports = {
    getAlertObject,
    getAlerts
}


