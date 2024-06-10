const express = require("express");
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require("cors");
const jwt = require("jsonwebtoken");
const mysql = require("mysql");

const app = express();
const PORT = 8000;
const SECRET_KEY = "jugal2511bhagat";

app.use(cors());
app.use(express.json());

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

function verifyToken(req, res, next) {
    const token = req.headers["authorization"]

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Failed to authenticate token" });
        }
        req.decoded = decoded;
        next();
    });
}

// Create proxy middleware without altering the body
const commonProxyOptions = (target) => ({
    target,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
        // Explicitly set the 'Content-Type' header to 'multipart/form-data'
        if (req.headers['content-type']) {
            proxyReq.setHeader('content-type', req.headers['content-type']);
        }
    },
    onError: (err, req, res) => {
        res.status(500).json({ error: 'Proxy error', details: err.message });
    }
});

app.use("/companies", verifyToken, createProxyMiddleware(commonProxyOptions('http://localhost:8005')));
app.use("/events", verifyToken, createProxyMiddleware(commonProxyOptions('http://localhost:8004')));
app.use("/notes", verifyToken, createProxyMiddleware(commonProxyOptions('http://localhost:8003')));
app.use("/users", createProxyMiddleware(commonProxyOptions('http://localhost:8002')));
// app.use("/", verifyToken, createProxyMiddleware(commonProxyOptions('http://localhost:8001')));

app.get("/fetchcountry", async (req, res) => {
    const query = "SELECT country_name FROM tbl_country";
    try {
        connection.query(query, (err, results) => {
            if (err) throw err;
            const countries = results.map(row => row.country_name);
            res.status(200).json({ message: "Fetched All Countries", "countries": countries });
        });
    } catch (err) {
        console.error("Error executing MySQL query:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/fetchcompany", async (req, res) => {
    const query = "SELECT cid, cname FROM tbl_company";
    try {
        connection.query(query, (err, results) => {
            if (err) throw err;
            res.status(200).json({ message: "Fetched All Companies", companies: results });
        });
    } catch (err) {
        console.error("Error executing MySQL query:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});


app.use("/", (req, res) => {
    res.status(200).json({ "msg": "Hello From Gateaway" });
});


app.listen(PORT, () => {
    console.log("Gateway listening to port http://localhost:" + PORT);
});
