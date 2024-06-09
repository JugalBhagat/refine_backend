const express = require("express");
const mysql = require("mysql");
const bodyParser = require('body-parser');
const multer = require('multer');

const upload = multer();
const app = express();

const PORT = 8003;

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

app.post("/addnote", upload.none(), async (req, res) => {
    const { title, desc, uid } = req.body;
    // console.log("Request Body:", req.body);  // Debugging line

    if (!title || !desc || !uid) {
        return res.status(400).json({ message: "All fields (title, desc, uid) are required" });
    }

    const query = "INSERT INTO tbl_notes (note_title, note_desc, uid, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())";

    try {
        connection.query(query, [title, desc, uid], (err, results) => {
            if (err) throw err;
            res.status(200).json({
                message: "Note added successfully",
                noteId: results.insertId
            });
        });
    } catch (err) {
        console.error("Error executing MySQL query:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/fetchall", async (req, res) => {
    const query = `
        SELECT
            n.nid,
            n.note_title,
            n.note_desc,
            n.created_at,
            u.username AS created_by
            FROM
            tbl_notes AS n
            INNER JOIN
            tbl_users AS u
            ON
            n.uid = u.user_id
    `;

    try {
        connection.query(query, (err, results) => {
            if (err) throw err;
            res.status(200).json({ message: "Fetched All Notes", data: results });
        });
    } catch (err) {
        console.error("Error executing MySQL query:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.put("/updatenote", upload.none(), async (req, res) => {
    const { nid, title, desc } = req.body;

    if (!nid || !title || !desc) {
        return res.status(400).json({ message: "nid, title, and desc are required" });
    }

    const query = "UPDATE tbl_notes SET note_title = ?, note_desc = ?, updated_at = NOW() WHERE nid = ?";

    try {
        connection.query(query, [title, desc, nid], (err, results) => {
            if (err) throw err;
            if (results.affectedRows === 0) {
                return res.status(404).json({ message: "Note not found" });
            }
            res.status(200).json({ message: "Note updated successfully" });
        });
    } catch (err) {
        console.error("Error executing MySQL query:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.delete("/deletenote/:nid", async (req, res) => {
    const { nid } = req.params;

    const query = "DELETE FROM tbl_notes WHERE nid = ?";

    try {
        connection.query(query, [nid], (err, results) => {
            if (err) throw err;
            if (results.affectedRows === 0) {
                return res.status(404).json({ message: "Note not found" });
            }
            res.status(200).json({ message: "Note deleted successfully" });
        });
    } catch (err) {
        console.error("Error executing MySQL query:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/totalnotes", async (req, res) => {
    const query = "SELECT COUNT(*) AS total FROM tbl_notes";

    try {
        connection.query(query, (err, results) => {
            if (err) throw err;
            res.status(200).json({ message: "Total number of notes", total: results[0].total });
        });
    } catch (err) {
        console.error("Error executing MySQL query:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/latestnotes", async (req, res) => {
    const query = "SELECT * FROM tbl_notes ORDER BY created_at DESC LIMIT 5";

    try {
        connection.query(query, (err, results) => {
            if (err) throw err;
            res.status(200).json({ message: "Latest 5 notes", data: results });
        });
    } catch (err) {
        console.error("Error executing MySQL query:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.use("/", (req, res) => {
    res.status(200).json({ "msg": "Hello From Notes" });
});

app.listen(PORT, () => {
    console.log("listening to port http://localhost:" + PORT);
});