class TriviaUI {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.isShowingRules = false;
        this.setupEventListeners();
        this.init();
    }

    init() {
        if (!localStorage.getItem('hasSeenRules')) {
            this.showRulesPopup();
            this.isShowingRules = true;
            localStorage.setItem('hasSeenRules', 'true');
        }
    }

    setupEventListeners() {
        const elements = [
            { id: 'next-question', event: 'click', handler: () => this.gameManager.nextQuestion() },
            { id: 'start-playing', event: 'click', handler: () => {
                this.hideRulesPopup();
                this.isShowingRules = false;
                this.gameManager.startGame();
            }}
        ];

        elements.forEach(({ id, event, handler }) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('answer-btn')) {
                const answerIndex = parseInt(e.target.dataset.answer, 10);
                if (!isNaN(answerIndex)) {
                    this.gameManager.submitAnswer(answerIndex);
                }
            }
        });
    }

    showRulesPopup() {
        const popup = document.getElementById('rules-popup');
        if (popup) popup.style.display = 'flex';
    }

    hideRulesPopup() {
        const popup = document.getElementById('rules-popup');
        if (popup) popup.style.display = 'none';
    }

    displayQuestion(question) {
        if (!question) return;

        const questionEl = document.getElementById('question');
        const categoryEl = document.getElementById('question-category');
        const difficultyEl = document.getElementById('question-difficulty');
        const answersContainer = document.getElementById('answers');
        const explanationEl = document.getElementById('explanation');

        if (questionEl) questionEl.textContent = question.question;
        if (categoryEl) categoryEl.textContent = question.category;

        if (difficultyEl) {
            difficultyEl.textContent = question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1);
            difficultyEl.className = `difficulty ${question.difficulty}`;
        }

        if (answersContainer) {
            answersContainer.innerHTML = '';
            if (question.answers && Array.isArray(question.answers)) {
                question.answers.forEach((answer, index) => {
                    const button = document.createElement('button');
                    button.textContent = answer;
                    button.className = 'answer-btn';
                    button.dataset.answer = index;
                    answersContainer.appendChild(button);
                });
            }
        }

        if (explanationEl) {
            explanationEl.style.display = 'none';
            explanationEl.textContent = '';
        }
    }

    displayResult(result, userAnswerIndex) {
        if (!result) return;

        const answerButtons = document.querySelectorAll('.answer-btn');
        const correctAnswerIndex = result.correctAnswer;

        if (correctAnswerIndex >= 0 && correctAnswerIndex < answerButtons.length) {
            answerButtons[correctAnswerIndex].classList.add('correct');
        }

        if (userAnswerIndex >= 0 && userAnswerIndex !== correctAnswerIndex && userAnswerIndex < answerButtons.length) {
            answerButtons[userAnswerIndex].classList.add('incorrect');
        }

        if (result.explanation) {
            this.displayExplanation(result.explanation);
        }

        this.showElement('next-question');
    }

    displayExplanation(explanation) {
        const explanationEl = document.getElementById('explanation');
        if (explanationEl) {
            explanationEl.textContent = explanation;
            explanationEl.style.display = 'block';
        }
    }

    displayError(message) {
        const errorContainer = document.getElementById('error-message');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
        }
    }

    updateTimerDisplay(timeLeft) {
        const timeLeftEl = document.getElementById('time-left');
        const timeBar = document.getElementById('time-bar');

        const displayTime = Math.max(0, timeLeft);
        if (timeLeftEl) timeLeftEl.textContent = displayTime;

        if (timeBar) {
            const spectrumColors = [
                { r: 139, g: 0, b: 255, pos: 0 },
                { r: 75, g: 0, b: 130, pos: 0.143 },
                { r: 0, g: 0, b: 255, pos: 0.286 },
                { r: 0, g: 191, b: 255, pos: 0.429 },
                { r: 0, g: 255, b: 0, pos: 0.571 },
                { r: 255, g: 255, b: 0, pos: 0.714 },
                { r: 255, g: 69, b: 0, pos: 0.857 },
                { r: 255, g: 0, b: 0, pos: 1 }
            ];

            const progress = timeLeft / 20;
            const spectrumPosition = 1 - progress;

            let color1 = spectrumColors[0];
            let color2 = spectrumColors[1];

            for (let i = 0; i < spectrumColors.length - 1; i++) {
                if (spectrumPosition >= spectrumColors[i].pos && spectrumPosition <= spectrumColors[i + 1].pos) {
                    color1 = spectrumColors[i];
                    color2 = spectrumColors[i + 1];
                    break;
                }
            }

            const positionRange = color2.pos - color1.pos;
            const interpolationFactor = positionRange === 0 ? 0 : (spectrumPosition - color1.pos) / positionRange;

            const r = Math.round(color1.r + (color2.r - color1.r) * interpolationFactor);
            const g = Math.round(color1.g + (color2.g - color1.g) * interpolationFactor);
            const b = Math.round(color1.b + (color2.b - color1.b) * interpolationFactor);

            const darkerR = Math.max(0, Math.round(r * 0.85));
            const darkerG = Math.max(0, Math.round(g * 0.85));
            const darkerB = Math.max(0, Math.round(b * 0.85));

            const newColor = `rgb(${r}, ${g}, ${b})`;
            const newDarkerColor = `rgb(${darkerR}, ${darkerG}, ${darkerB})`;

            if (timeBar.dataset.lastColor !== newColor) {
                timeBar.dataset.lastColor = newColor;
                timeBar.style.background = `linear-gradient(90deg, ${newColor}, ${newDarkerColor})`;
                
                const glowIntensity = timeLeft <= 3 ? 0.9 : 0.4;
                const glowSize = timeLeft <= 3 ? 15 : 8;
                timeBar.style.boxShadow = `0 0 ${glowSize}px rgba(${r}, ${g}, ${b}, ${glowIntensity})`;
            }

            if (timeLeft <= 3) {
                if (!timeBar.classList.contains('critical-pulse')) {
                    timeBar.classList.add('critical-pulse');
                    timeBar.style.animation = 'pulse 0.4s infinite alternate ease-in-out';
                }
            } else {
                if (timeBar.classList.contains('critical-pulse')) {
                    timeBar.classList.remove('critical-pulse');
                    timeBar.style.animation = 'none';
                }
            }
        }
    }

    resetTimerDisplay() {
        const timeBar = document.getElementById('time-bar');
        const timeLeftEl = document.getElementById('time-left');
    
        if (timeLeftEl) timeLeftEl.textContent = 20;
    
        if (timeBar) {
            timeBar.style.transition = 'none';
            timeBar.style.width = '100%';
            timeBar.className = 'time-bar';
    
            const r = 139, g = 0, b = 255;
            const darkerR = Math.round(r * 0.85);
            const darkerG = Math.round(g * 0.85);
            const darkerB = Math.round(b * 0.85);
            const initialColor = `rgb(${r}, ${g}, ${b})`;
            const initialDarkerColor = `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
            
            timeBar.style.background = `linear-gradient(90deg, ${initialColor}, ${initialDarkerColor})`;
            timeBar.style.boxShadow = `0 0 8px rgba(${r}, ${g}, ${b}, 0.4)`;
            timeBar.style.animation = 'none';

            timeBar.offsetHeight;
        }
    }

    startTimerAnimation(duration) {
        const timeBar = document.getElementById('time-bar');
        if (timeBar) {
            timeBar.style.transition = 'none';
            timeBar.style.width = '100%';
            timeBar.offsetHeight;
            timeBar.style.transition = `width ${duration}s linear, background 0.1s ease-out, box-shadow 0.1s ease-out`;
            timeBar.style.width = '0%';
        }
    }

    stopTimerAnimation() {
        const timeBar = document.getElementById('time-bar');
        if (timeBar) {
            const computedStyle = window.getComputedStyle(timeBar);
            const currentWidth = computedStyle.width;
            timeBar.style.transition = 'none';
            timeBar.style.width = currentWidth;
        }
    }

    showElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'block';
        }
    }

    hideElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    }
}
