require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { getAllUsers, getOrCreateUser, saveUserQuestion } = require('./database');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30';

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- JWT Verification Middleware ---
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

const authenticateAdminJWT = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded.role !== 'ADMIN') {
                return res.sendStatus(403);
            }
            req.user = decoded;
            next();
        } catch (err) {
            return res.sendStatus(403);
        }
    } else {
        res.sendStatus(401);
    }
};

// --- Static File Serving ---
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// --- API ---
const apiRouter = express.Router();
app.use('/api/v1', apiRouter);

// --- Login Route ---
apiRouter.post('/login', async (req, res) => {
    try {
        const userId = uuidv4();
        await getOrCreateUser(userId);
        const accessToken = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ accessToken });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- Questions Route ---
apiRouter.get('/questions/random', async (req, res) => {
    try {
        const questionsPath = path.join(__dirname, 'questions.json');
        const questionsData = await fs.readFile(questionsPath, 'utf-8');
        const questions = JSON.parse(questionsData);
        const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
        res.json(randomQuestion);
    } catch (error) {
        console.error('Error getting random question:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- Answers Route ---
apiRouter.post('/answers', authenticateJWT, async (req, res) => {
    try {
        const { question_id, user_answer } = req.body;
        const userId = req.user.sub;

        const questionsPath = path.join(__dirname, 'questions.json');
        const questionsData = await fs.readFile(questionsPath, 'utf-8');
        const questions = JSON.parse(questionsData);
        const question = questions.find(q => q.id === question_id);

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        await saveUserQuestion(userId, question_id);

        const isCorrect = (question.correctAnswer === user_answer);
        res.json({
            correct: isCorrect,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation
        });
    } catch (error) {
        console.error('Error processing answer:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- Admin Routes ---
const adminRouter = express.Router();
adminRouter.use(authenticateAdminJWT);
apiRouter.use('/metrics', adminRouter);

adminRouter.get('/users', async (req, res) => {
    try {
        const users = await getAllUsers();
        const totalNumberOfUsers = users.length;
        const totalNumberOfQuestions = users.reduce((sum, user) => sum + user.totalNumberOfQuestionsAsked, 0);

        res.json({
            totalNumberOfUsers,
            totalNumberOfQuestions,
            users
        });
    } catch (error) {
        console.error('Metrics error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- Health Check ---
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// --- Favicon Handler (Fix for 440 error) ---
app.get('/favicon.ico', (req, res) => res.status(204).end());

// --- Error Handling ---
app.use((req, res, _next) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

// --- Server Start ---
const startServer = async () => {
    // HTTP Setup
    app.listen(port, '0.0.0.0', () => {
        console.log(`HTTP Server running at http://0.0.0.0:${port}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Error: Port ${port} is already in use.`);
            process.exit(1);
        } else {
            console.error('Failed to start HTTP server:', err);
            process.exit(1);
        }
    });
};

startServer().catch(error => {
    console.error("Failed to start the server:", error);
    process.exit(1);
});
