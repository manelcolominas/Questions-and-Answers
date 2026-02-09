document.addEventListener('DOMContentLoaded', async () => {
    try {
        const gameManager = new GameManager();
        await gameManager.initialize();
        window.gameManager = gameManager;
    } catch (error) {
        console.error("Failed to initialize the game:", error);
        // Optionally, display a user-friendly error message on the UI
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = "Oops! Something went wrong while starting the game. Please refresh the page to try again.";
            errorDiv.style.display = 'block';
        }
    }
});
