/**
 * MarketBridge API Wrapper Service.
 */
export class MarketBridgeAPI {
    constructor(baseURL, supabaseURL, supabaseKey) {
        this.baseURL = baseURL;
        this.supabaseURL = supabaseURL;
        this.supabaseKey = supabaseKey;
    }

    /**
     * Checks backend service state and active connectivity to Supabase.
     * @returns {Promise<Object>} API Health Status Response payload
     */
    async getSystemHealth() {
        const startTime = performance.now();
        try {
            const response = await fetch(`${this.baseURL}/api/v1/health`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`API returned HTTP error status ${response.status}`);
            }

            const data = await response.json();
            const latency = Math.round(performance.now() - startTime);
            return {
                success: true,
                latency: `${latency}ms`,
                data
            };
        } catch (error) {
            const latency = Math.round(performance.now() - startTime);
            return {
                success: false,
                latency: `${latency}ms`,
                error: error.message
            };
        }
    }

    /**
     * Registers a new user directly in Supabase.
     */
    async signUp(email, password, fullName, phone) {
        try {
            const response = await fetch(`${this.supabaseURL}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'apikey': this.supabaseKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    data: {
                        full_name: fullName,
                        phone: phone
                    }
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.msg || data.error_description || 'Registration failed.');
            }
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Signs in an existing user directly to Supabase.
     */
    async signIn(email, password) {
        try {
            const response = await fetch(`${this.supabaseURL}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'apikey': this.supabaseKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error_description || 'Invalid email or password.');
            }
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Retrieves the current authenticated trader's business profile.
     */
    async getProfile(token) {
        try {
            const response = await fetch(`${this.baseURL}/api/v1/traders/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            if (!response.ok) {
                return { success: false, status: response.status, error: data.detail || 'Failed to fetch profile.' };
            }
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Saves or updates (upserts) the trader's business profile.
     */
    async saveProfile(token, profileData) {
        try {
            const response = await fetch(`${this.baseURL}/api/v1/traders/profile`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(profileData)
            });
            const data = await response.json();
            if (!response.ok) {
                return { success: false, error: data.detail || 'Failed to save profile.' };
            }
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}