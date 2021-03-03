const socketio = require('socket.io');

module.exports = (http, app, alertsTable) => {
    const io = socketio(http);
    io.on("connection", socket => {
        console.log("user connected!");
    });

    app.get("/admin/alerts/:alertId", async (req, res) => {
        let alertId = req.params.alertId;

        let alert = await alertsTable.read();

        
    })
}

const sendMessage = (message) => {
    io.emit("message", message);
}
