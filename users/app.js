
const express = require("express");
const mysql = require("mysql");
const jwt = require("jsonwebtoken");
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

const app = express();
const PORT = 8002;
dotenv.config();
// const SECRET_KEY = "jugal2511bhagat"; 
const SECRET_KEY = process.env.SECRET_KEY;


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

app.post("/signup", async (req, res) => {
    const { username, email, password, cid, role } = req.body;
    console.log(username + "," + email + "," + role);

    // Check if file is uploaded
    if (!req.files || !req.files.file) {
        return res.status(400).json({ message: "File not uploaded" });
    }

    let file = req.files.file;
    let data = file.data;

    try {
        connection.query("SELECT * FROM tbl_users WHERE email = ?", [email], async (err, results) => {
            if (err) {
                console.error("Error executing MySQL query:", err);
                return res.status(500).json({ message: "Internal server error" });
            }

            if (results.length > 0) {
                return res.status(400).json({ message: "Email Id already exists" });
            }

            // Hash the password
            // const hashedPassword = await bcrypt.hash(password, 10);

            connection.query(
                "INSERT INTO tbl_users (username, email, password, cid, role, dp, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
                [username, email, password, cid, role, data], // Assuming `data` is your profile picture
                (err, results) => {
                    if (err) {
                        console.error("Error executing MySQL query:", err);
                        return res.status(500).json({ message: "Internal server error" });
                    }

                    const userId = results.insertId; // Get the inserted user ID

                    // Generate JWT token for the new user
                    const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: "10h" });

                    // Return user information along with the token
                    res.status(200).json({
                        message: "Signup successful",
                        token,
                        user_id: userId, // Include the user ID
                        username,
                        email,
                        dp: data, // Assuming you want to return the profile picture data
                        role,
                        cid,
                        created_at: new Date().toISOString(), // Include the created_at field
                    });
                }
            );
        });
    } catch (error) {
        console.error("Error during signup process:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    // Find user by email and password
    connection.query("SELECT * FROM tbl_users WHERE email = ? AND password = ?", [email, password], (err, results) => {
        if (err) {
            console.error("Error executing MySQL query:", err);
            return res.status(500).json({ message: "Internal server error" });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        // Extract user information
        const user = results[0];
        const { user_id, username, email, dp, role, cid, created_at } = user;

        // Generate JWT token for the authenticated user
        const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: "120h" });

        // Return user information along with the token
        res.status(200).json({
            message: "Login successful",
            token,
            user_id, // Include the user ID
            username,
            email,
            dp,
            role,
            cid,
            created_at, // Include the created_at field
        });
    });
});

app.get("/fetchuser/:user_id", verifyToken, (req, res) => {
    const { user_id } = req.params;

    // Validate input
    if (!user_id) {
        return res.status(400).json({ message: "User ID is required" });
    }

    // Find user by user_id
    connection.query("SELECT * FROM tbl_users WHERE user_id = ?", [user_id], (err, results) => {
        if (err) {
            console.error("Error executing MySQL query:", err);
            return res.status(500).json({ message: "Internal server error" });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        // Extract user information
        const user = results[0];
        const { user_id, username, email, dp, role, cid, created_at } = user;

        // Return user information
        res.status(200).json({
            user_id,
            username,
            email,
            dp,
            role,
            cid,
            created_at, // Include the created_at field
        });
    });
});

app.put("/updateuser",verifyToken, (req, res) => {
    const { user_id, username, role, email } = req.body;

    const query = `
        UPDATE tbl_users
        SET username = ?, role = ?, email = ?
        WHERE user_id = ?
    `;

    connection.query(query, [username, role, email, user_id], (err, results) => {
        if (err) {
            console.error("Error executing MySQL query:", err);
            return res.status(500).json({ message: "Internal server error" });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "User updated successfully" });
    });
});

app.get("/fetchall", verifyToken, (req, res) => {
    const query = `
        SELECT u.*, c.cname
        FROM tbl_users u
        LEFT JOIN tbl_company c ON u.cid = c.cid
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error("Error executing MySQL query:", err);
            return res.status(500).json({ message: "Internal server error" });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: "Data is Empty" });
        }

        res.status(200).json({ message: "Fetch All Data successful", total_result: results.length, data: results});
    });
});

app.get('/monstats', verifyToken, (req, res) => {
    const sql = `
        SELECT
            COUNT(*) AS count,
            DATE_FORMAT(created_at, '%b') AS month
        FROM
            tbl_users
        GROUP BY
            DATE_FORMAT(created_at, '%b')
        ORDER BY
            MIN(created_at)
    `;
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error executing MySQL query:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        const userCounts = Array.from({ length: 12 }, () => 0);
        results.forEach(item => {
            const monthIndex = new Date(item.month + ' 1, 2000').getMonth();
            userCounts[monthIndex] = item.count;
        });

        // Return the results
        res.status(200).json(userCounts);
    });
});

app.use("/", (req, res) => {
    res.status(200).json({ "msg": "Hello From users" });
});

app.listen(PORT, () => {
    console.log("Users service listening to port http://localhost:" + PORT);
});
