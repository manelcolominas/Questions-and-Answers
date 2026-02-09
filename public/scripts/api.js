class QuestionService {
    constructor(baseUrl = '/api/v1') {
        this.baseUrl = baseUrl;
        this.jwt = null;
    }

    // --- JWT Management ---
    setJwt(token) {
        this.jwt = token;
        localStorage.setItem('jwt', token);
    }

    getJwt() {
        if (!this.jwt) {
            this.jwt = localStorage.getItem('jwt');
        }
        return this.jwt;
    }

    clearJwt() {
        this.jwt = null;
        localStorage.removeItem('jwt');
    }

    async login() {
        try {
            const response = await fetch(`${this.baseUrl}/login`, { method: 'POST' });
            if (!response.ok) {
                throw new Error('Login failed');
            }
            const { accessToken } = await response.json();
            this.setJwt(accessToken);
        } catch (error) {
            console.error('Login Error:', error);
            throw error;
        }
    }

    // --- API Calls ---
    _buildQueryString(params) {
        if (!params) return '';
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                if (Array.isArray(value)) {
                    value.forEach(v => query.append(key, v));
                } else {
                    query.append(key, value);
                }
            }
        });
        const queryString = query.toString();
        return queryString ? `?${queryString}` : '';
    }

    _getAuthHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        const token = this.getJwt();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    async _fetchWithAuth(url, options = {}) {
        let response = await fetch(url, { ...options, headers: this._getAuthHeaders() });

        if (response.status === 403) {
            console.log('Token expired or invalid. Attempting to re-login...');
            await this.login(); // Get a new token
            response = await fetch(url, { ...options, headers: this._getAuthHeaders() }); // Retry
        }

        return response;
    }

    async getRandomQuestion(filters = {}) {
        try {
            const queryString = this._buildQueryString(filters);
            const response = await this._fetchWithAuth(`${this.baseUrl}/questions/random${queryString}`);
            
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('QuestionService Error:', error);
            throw error;
        }
    }

    async postAnswer(question_id, user_answer) {
        try {
            const response = await this._fetchWithAuth(`${this.baseUrl}/answers`, {
                method: 'POST',
                body: JSON.stringify({ question_id, user_answer })
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('QuestionService Error:', error);
            throw error;
        }
    }
}
