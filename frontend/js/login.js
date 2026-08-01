import { MarketBridgeAPI } from './api.js';

const API_URL = 'http://127.0.0.1:8000';
const SUPABASE_URL = 'https://qvtlepimthfzymawnwiz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dGxlcGltdGhmenltYXdud2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNDY0MDQsImV4cCI6MjEwMDcyMjQwNH0.Zk9znYSh9uU4Z_wrZ2wuMXSV-ngvnH0a3gSKkvKNSrY';

const api = new MarketBridgeAPI(API_URL, SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById('login-form');
const alertBox = document.getElementById('alert-box');
const submitBtn = document.getElementById('btn-submit');

function displayAlert(message, type = 'error') {
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    alertBox.classList.remove('hidden');
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.classList.add('hidden');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    const result = await api.signIn(email, password);

    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';

    if (result.success) {
        // Save token and user details to localStorage
        localStorage.setItem('mb_session_token', result.data.access_token);
        localStorage.setItem('mb_user', JSON.stringify(result.data.user));

        displayAlert('Signed in successfully! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    } else {
        displayAlert(result.error);
    }
});