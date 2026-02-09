class GameManager {
    constructor() {
        this.ui = new TriviaUI(this);
        this.questionService = new QuestionService();
        this.currentQuestion = null;
        this.timer = null;
        this.timeLeft = 20;
        this.isGameActive = false;
        this.askedQuestionIds = new Set();
    }

    async initialize() {
        if (!this.questionService.getJwt()) {
            try {
                await this.questionService.login();
            } catch (error) {
                console.error("Failed to login", error);
                this.ui.displayError("Failed to connect to the server. Please refresh the page.");
                return;
            }
        }
        
        // Load the first question immediately in the background
        // We pass false so it doesn't start the timer yet
        await this.nextQuestion(false);
        
        // If the rules are NOT showing (returning user), start the game flow immediately
        // If rules ARE showing, the "Start Playing" button in UI will call startGame()
        if (!this.ui.isShowingRules) {
            this.startGame();
        }
    }

    startGame() {
        this.ui.hideElement('next-question');
        // Wait 2 seconds before starting the timer to let the user situate themselves
        setTimeout(() => {
            // Only start if we have a question loaded
            if (this.currentQuestion) {
                this.isGameActive = true;
                this.startTimer();
            }
        }, 2000);
    }

    async nextQuestion(autoStart = true) {
        this.isGameActive = false;
        this.timeLeft = 20;
        this.ui.resetTimerDisplay();
        this.ui.hideElement('next-question');
        this.ui.hideElement('result-message');

        try {
            this.currentQuestion = await this.questionService.getRandomQuestion({ exclude: Array.from(this.askedQuestionIds) });
            if (this.currentQuestion && this.currentQuestion.id) {
                this.askedQuestionIds.add(this.currentQuestion.id);
            }

            const options = this.currentQuestion.answers;
            const correctAnswerText = this.currentQuestion.answers[this.currentQuestion.correctAnswer];

            const shuffledOptions = [...options];
            for (let i = shuffledOptions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
            }

            this.currentQuestion.shuffledOptions = shuffledOptions;
            this.currentQuestion.correctAnswerIndex = shuffledOptions.indexOf(correctAnswerText);

            const questionForUi = {
                ...this.currentQuestion,
                answers: this.currentQuestion.shuffledOptions
            };

            this.ui.displayQuestion(questionForUi);
            
            if (autoStart) {
                this.isGameActive = true;
                this.startTimer();
            }
        } catch (error) {
            console.error('Error fetching question:', error);
            this.ui.displayError("Error loading question. Please check the server connection.");
        }
    }

    startTimer() {
        if (this.timer) clearInterval(this.timer);
        this.ui.startTimerAnimation(this.timeLeft);
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.ui.updateTimerDisplay(this.timeLeft);
            if (this.timeLeft <= 0) {
                this.handleTimeout();
            }
        }, 1000);
    }

    handleTimeout() {
        clearInterval(this.timer);
        this.isGameActive = false;
        this.ui.stopTimerAnimation();

        const result = {
            isCorrect: false,
            correctAnswer: this.currentQuestion.correctAnswerIndex,
            explanation: this.currentQuestion.explanation
        };
        this.ui.displayResult(result, -1);
    }

    async submitAnswer(answerIndex) {
        if (!this.isGameActive) return;
    
        clearInterval(this.timer);
        this.isGameActive = false;
        this.ui.stopTimerAnimation();
    
        const userAnswer = this.currentQuestion.shuffledOptions[answerIndex];
        
        try {
            const result = await this.questionService.postAnswer(this.currentQuestion.id, userAnswer);
            const resultForUi = {
                isCorrect: result.correct,
                correctAnswer: this.currentQuestion.correctAnswerIndex,
                explanation: result.explanation
            };
            this.ui.displayResult(resultForUi, answerIndex);
        } catch (error) {
            console.error('Error submitting answer:', error);
            this.ui.displayError("Could not submit your answer. Please try again.");
            
            // If the submission fails, we should probably re-enable the UI
            // to allow the user to try again, or handle it more gracefully.
            // For now, we'll just show an error.
        }
    }
}
