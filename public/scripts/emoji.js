class FloatingEmojiAnimator {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'emoji-background';
        document.body.insertBefore(this.container, document.body.firstChild);

        this.emojiSeries = [
            ['✨', '🌟', '⭐', '💫', '🌈'],
            ['🌸', '🌺', '🌻', '🌷', '🌹', '🍀', '🍃', '🌿', '🦋', '🐝', '🐞'],
            ['🎉', '🎊', '🎈', '🎁', '🎂', '🎪', '🎭', '🎨'],
            ['🎵', '🎶', '🎤', '🎧', '🎸', '🎷', '🎺', '🎻'],
            ['🐙', '🐠', '🐟', '🐡', '🦑', '🦐', '🦀', '🌊', '💧']
        ];
        this.currentSeriesIndex = 0;
        this.isAnimating = true;
        this.animationInterval = null;
        this.seriesInterval = null;
        this.logInterval = null;

        this.init();
    }

    init() {
        // Start with a number of emojis within the desired range
        for (let i = 0; i < 100; i++) {
            const delay = -Math.random() * 70;
            this.createRandomEmoji(delay);
        }
        this.startContinuousGeneration();
        this.startSeriesTransition();
        this.startLoggingEmojiCount();
    }

    createRandomEmoji(animationDelay = null) {
        if (!this.isAnimating) return;

        const emoji = document.createElement('div');
        emoji.className = 'floating-emoji';
        emoji.textContent = this.getRandomEmoji();

        const isHorizontal = Math.random() < 0.5;

        if (isHorizontal) {
            emoji.classList.add('horizontal');
            this.setHorizontalPosition(emoji);
        } else {
            this.setVerticalPosition(emoji);
        }

        // Weighted font sizes: small (20%), medium (40%), normal (40%)
        const fontSizes = [0.75, 1.25, 1.25, 1.75, 1.75];
        const randomSize = fontSizes[Math.floor(Math.random() * fontSizes.length)];
        emoji.style.fontSize = `${randomSize}rem`;

        if (animationDelay === null) {
            animationDelay = Math.random() * 5;
        }
        emoji.style.animationDelay = `${animationDelay}s`;
        emoji.style.opacity = `${Math.random() * 0.4 + 0.3}`;

        this.container.appendChild(emoji);

        emoji.addEventListener('animationend', () => {
            const fadeOutDuration = Math.random() * 3 + 2;
            emoji.style.transition = `opacity ${fadeOutDuration}s linear`;
            emoji.style.opacity = '0';

            setTimeout(() => {
                if (emoji.parentNode) {
                    emoji.remove();
                }
            }, fadeOutDuration * 1000);
        }, { once: true });
    }

    setVerticalPosition(emoji) {
        emoji.style.left = `${Math.random() * 100}%`;
        emoji.style.top = `${100 + Math.random() * 10}%`;
    }

    setHorizontalPosition(emoji) {
        emoji.style.top = `${Math.random() * 100}%`;
        if (Math.random() < 0.5) {
            emoji.style.left = `${-10 - Math.random() * 10}%`;
        } else {
            emoji.style.left = `${100 + Math.random() * 10}%`;
            emoji.style.animationDirection = 'reverse';
        }
    }

    getRandomEmoji() {
        const currentSeries = this.emojiSeries[this.currentSeriesIndex];
        return currentSeries[Math.floor(Math.random() * currentSeries.length)];
    }

    startContinuousGeneration() {
        this.animationInterval = setInterval(() => {
            if (this.isAnimating) {
                const currentCount = this.container.children.length;
                // Only create new emojis if we are below the upper limit.
                if (currentCount < 120) {
                    this.createRandomEmoji();
                }
            }
        }, 450);
    }

    startSeriesTransition() {
        this.seriesInterval = setInterval(() => {
            this.currentSeriesIndex = (this.currentSeriesIndex + 1) % this.emojiSeries.length;
        }, 20000); // Switch series every 20 seconds
    }

    startLoggingEmojiCount() {
        this.logInterval = setInterval(() => {
            console.log(`Current number of emojis: ${this.container.children.length}`);
        }, 5000); // Log every 5 seconds
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FloatingEmojiAnimator();
});
