import { MarketBridgeAPI } from './api.js';

const API_URL = 'https://marketbridge-685x.onrender.com'; // Your Render URL
const SUPABASE_URL = 'https://qvtlepimthfzymawnwiz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dGxlcGltdGhmenltYXdud2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNDY0MDQsImV4cCI6MjEwMDcyMjQwNH0.Zk9znYSh9uU4Z_wrZ2wuMXSV-ngvnH0a3gSKkvKNSrY';

const api = new MarketBridgeAPI(API_URL, SUPABASE_URL, SUPABASE_KEY);

// Check session and control profile setup redirect gateway
async function runSessionCheck() {
    const token = localStorage.getItem('mb_session_token');
    const heroBtn = document.querySelector('.cta-group .btn-primary');
    const navLinksContainer = document.querySelector('.nav-links');

    if (token) {
        // Authenticated users: change buttons to display edit state
        if (heroBtn) {
            heroBtn.disabled = false;
            heroBtn.textContent = 'Enter Setup Dashboard';
            heroBtn.addEventListener('click', () => {
                window.location.href = 'dashboard.html';
            });
        }

        if (navLinksContainer) {
            navLinksContainer.innerHTML = `
                <a href="#features">Features</a>
                <a href="profile-setup.html" class="nav-bold">Business Profile</a>
                <button id="btn-nav-logout" class="btn btn-secondary">Logout</button>
            `;
            document.getElementById('btn-nav-logout').addEventListener('click', () => {
                localStorage.removeItem('mb_session_token');
                localStorage.removeItem('mb_user');
                window.location.reload();
            });
        }

        // Auto-redirect if profile registration setup is completely missing
        const profile = await api.getProfile(token);
        if (profile.status === 404) {
            window.location.href = 'profile-setup.html';
        }
    } else {
        // Guest users: make hero buttons redirect to auth forms
        if (heroBtn) {
            heroBtn.disabled = false;
            heroBtn.textContent = 'Create Your Profile';
            heroBtn.addEventListener('click', () => {
                window.location.href = 'register.html';
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    runSessionCheck();
});