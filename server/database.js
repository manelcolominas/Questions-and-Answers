const mysql = require('mysql2/promise');

// Create the connection pool. The pool-specific settings are the defaults
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'mysql',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function initDB() {
    let connection;
    try {
        // 1. Connect to the server (without specifying a database yet)
        connection = await pool.getConnection();
        console.log('Successfully connected to MySQL server.');

        // 2. Create the database if it doesn't exist
        const dbName = process.env.DB_NAME || 'qaa_db';
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        console.log(`Database '${dbName}' checked/created.`);

        // 3. Switch to the database
        await connection.changeUser({ database: dbName });
        console.log(`Switched to database '${dbName}'.`);
        
        // 4. Create users table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                jwt_sub VARCHAR(255) PRIMARY KEY
            )
        `);
        
        // 5. Check for old 'asked_questions' column and drop it if it exists
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'asked_questions'
        `, [dbName]);

        if (columns.length > 0) {
            console.log("Detected old column 'asked_questions'. Removing it to clean up DB...");
            await connection.execute('ALTER TABLE users DROP COLUMN asked_questions');
            console.log("Column removed successfully.");
        }

        // 6. Create user_questions table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS user_questions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(255),
                question_id INT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(jwt_sub) ON DELETE CASCADE
            )
        `);
        console.log('Tables initialized successfully.');

    } catch (err) {
        console.error('Error initializing database:', err);
        console.error('Connection details:', {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            // Do not log password
        });
    } finally {
        if (connection) connection.release();
    }
}

initDB();

async function getOrCreateUser(userId) {
    let connection;
    try {
        connection = await pool.getConnection();
        // Ensure we are using the correct database
        await connection.changeUser({ database: process.env.DB_NAME || 'qaa_db' });

        const [rows] = await connection.execute('SELECT * FROM users WHERE jwt_sub = ?', [userId]);
        if (rows.length > 0) {
            return rows[0];
        } else {
            await connection.execute('INSERT INTO users (jwt_sub) VALUES (?)', [userId]);
            const [newUser] = await connection.execute('SELECT * FROM users WHERE jwt_sub = ?', [userId]);
            return newUser[0];
        }
    } catch (error) {
        console.error("Error in getOrCreateUser:", error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function saveUserQuestion(userId, questionId) {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.changeUser({ database: process.env.DB_NAME || 'qaa_db' });

        await connection.execute(
            'INSERT INTO user_questions (user_id, question_id) VALUES (?, ?)',
            [userId, questionId]
        );
    } catch (error) {
        console.error("Error in saveUserQuestion:", error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function getAllUsers() {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.changeUser({ database: process.env.DB_NAME || 'qaa_db' });

        const [users] = await connection.execute('SELECT jwt_sub FROM users');
        
        if (users.length === 0) {
            return [];
        }

        const userIds = users.map(u => u.jwt_sub);
        const placeholders = userIds.map(() => '?').join(',');
        
        const [questions] = await connection.execute(
            `SELECT user_id, question_id FROM user_questions WHERE user_id IN (${placeholders})`,
            userIds
        );
        
        const questionsMap = {};
        questions.forEach(q => {
            if (!questionsMap[q.user_id]) {
                questionsMap[q.user_id] = [];
            }
            questionsMap[q.user_id].push(q.question_id);
        });

        return users.map(user => {
            const userQuestions = questionsMap[user.jwt_sub] || [];
            return { 
                userJwt: user.jwt_sub, 
                askedQuestionIds: userQuestions,
                totalNumberOfQuestionsAsked: userQuestions.length
            };
        });
    } catch (error) {
        console.error("Error in getAllUsers:", error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

module.exports = { getAllUsers, getOrCreateUser, saveUserQuestion };
