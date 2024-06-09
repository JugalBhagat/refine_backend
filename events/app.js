const express=require("express");
const mysql = require("mysql");
const bodyParser = require('body-parser');
const multer = require('multer');

const upload = multer();
const app = express();

const PORT=8004;

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "refine_clone"
});

connection.connect(err => {
    if (err) {
        console.error("Error connecting to database:", err);
        return;
    }
    console.log("Connected to MySQL database");
});

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/addevent", upload.none(), async (req, res) => {
    const { event_title, uid, date, start_time, end_time } = req.body;
    // console.log("Request Body:", req.body);  // Debugging line

    if (!event_title || !uid || !date || !start_time || !end_time) {
        return res.status(400).json({ message: "All fields (event_title, uid, date, start_time, end_time) are required" });
    }

    const query = "INSERT INTO tbl_events (event_title, uid, date, start_time, end_time) VALUES (?, ?, ?, ?, ?)";
    
    try {
        connection.query(query, [event_title, uid, date, start_time, end_time], (err, results) => {
            if (err) throw err;
            res.status(200).json({ 
                message: "Event added successfully",
                eventId: results.insertId
            });
        });
    } catch (err) {
        console.error("Error executing MySQL query:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/fetchallevents", async (req, res) => {
    const query = "SELECT * FROM tbl_events";
    
    try {
        connection.query(query, (err, results) => {
            if (err) throw err;
            res.status(200).json({ message: "Fetched All Events", data: results });
        });
    } catch (err) {
        console.error("Error executing MySQL query:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.put("/updateevent", upload.none(), async (req, res) => {
    const { eid, event_title, uid, date, start_time, end_time } = req.body;

    if (!eid || !event_title || !uid || !date || !start_time || !end_time) {
        return res.status(400).json({ message: "eid, event_title, uid, date, start_time, and end_time are required" });
    }

    const query = "UPDATE tbl_events SET event_title = ?, uid = ?, date = ?, start_time = ?, end_time = ? WHERE eid = ?";
    
    try {
        connection.query(query, [event_title, uid, date, start_time, end_time, eid], (err, results) => {
            if (err) throw err;
            if (results.affectedRows === 0) {
                return res.status(404).json({ message: "Event not found" });
            }
            res.status(200).json({ message: "Event updated successfully" });
        });
    } catch (err) {
        console.error("Error executing MySQL query:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.delete("/delevent/:eid", async (req, res) => {
    const { eid } = req.params;

    const query = "DELETE FROM tbl_events WHERE eid = ?";
    
    try {
        connection.query(query, [eid], (err, results) => {
            if (err) throw err;
            if (results.affectedRows === 0) {
                return res.status(404).json({ message: "Event not found" });
            }
            res.status(200).json({ message: "Event deleted successfully" });
        });
    } catch (err) {
        console.error("Error executing MySQL query:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/totalevents", async (req, res) => {
    const query = "SELECT COUNT(*) AS total FROM tbl_events";
    
    try {
        connection.query(query, (err, results) => {
            if (err) throw err;
            res.status(200).json({ message: "Total number of events", total: results[0].total });
        });
    } catch (err) {
        console.error("Error executing MySQL query:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});


app.use("/", (req, res) => {
    res.status(200).json({ "msg": "Hello From Events" });
});

app.listen(PORT,()=>{
    console.log("listening to port http://localhost:"+PORT);
});