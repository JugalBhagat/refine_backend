const express = require("express");
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const mysql = require("mysql");

const app = express();
const PORT = 8005;

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
app.use(fileUpload());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/add", async (req, res) => {
    const { cname, type, size, country, revenue } = req.body;

    // Check if file is uploaded
    if (!req.files || !req.files.file) {
        return res.status(400).json({ message: "File not uploaded" });
    }

    let file = req.files.file;
    let filename = file.name;
    let data = file.data;

    try {
        connection.query("SELECT * FROM tbl_company WHERE cname = ?", [cname], async (err, results) => {
            if (err) {
                console.error("Error executing MySQL query:", err);
                return res.status(500).json({ message: "Internal server error" });
            }

            if (results.length > 0) {
                return res.status(400).json({ message: "Company Name already exists" });
            }

            connection.query(
                "INSERT INTO tbl_company (cname, type, size, country, revenue, logo) VALUES (?, ?, ?, ?, ?, ?)",
                [cname, type, size, country, revenue, data],
                (err, results) => {
                    if (err) {
                        console.error("Error executing MySQL query:", err);
                        return res.status(500).json({ message: "Internal server error" });
                    }

                    res.status(200).json({ message: "Company Added successful" });
                }
            );
        });
    } catch (error) {
        console.error("Error during Company add process:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get('/allcompanies', (req, res) => {
    const query = 'SELECT * FROM tbl_company';
    connection.query(query, (err, results) => {
      if (err) {
        console.error('Error executing MySQL query:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: 'No companies found' });
      }
      res.status(200).json({ message: 'All data fetched', data: results });
    });
});

app.delete('/delcompany/:id', (req, res) => {
    const companyId = req.params.id;
    const query = 'DELETE FROM tbl_company WHERE cid = ?';
    
    connection.query(query, [companyId], (err, results) => {
        if (err) {
            console.error('Error executing MySQL query:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Company not found or already deleted' });
        }
        
        res.status(200).json({ message: 'Company deleted successfully' });
    });
});

app.get("/fetchcountry", (req, res) => {

    const query = `SELECT
        tbl_country.country_name AS name, tbl_country.country_code AS code,
        COUNT(tbl_company.country) AS count, JSON_ARRAY(tbl_country.lat, tbl_country.lng) AS latLng,
        GROUP_CONCAT(tbl_company.cname SEPARATOR ',') AS companies
        FROM tbl_country
        JOIN tbl_company ON tbl_country.country_name = tbl_company.country
        GROUP BY tbl_country.country_name, 
        tbl_country.country_code, tbl_country.lat, tbl_country.lng`;

    connection.query(query, (err, results) => {
        if (err) {
            console.error("Error executing MySQL query:", err);
            return res.status(500).json({ message: "Internal server error" });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: "No Data Found" });
        }

        res.status(200).json({ message: "Fetch All Country and Company Data successfully", data: results });
    });
});

app.get("/totcompany", (req, res) => {

    const query = `SELECT count(*) AS total from tbl_company`;

    connection.query(query, (err, results) => {
        if (err) {
            console.error("Error executing MySQL query:", err);
            return res.status(500).json({ message: "Internal server error" });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: "No Data Found" });
        }

        const totalCompanies = results[0].total;

        res.status(200).json({ message: "Total Companies are "+totalCompanies , total_company : totalCompanies });
    });
});

app.use("/", (req, res) => {
    res.status(200).json({ "msg": "Hello From Companies" });
});

app.listen(PORT, () => {
    console.log("listening to port http://localhost:" + PORT);
})