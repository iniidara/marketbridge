import { MarketBridgeAPI } from './api.js';

// Configuration parameters (Change project endpoints based on your .env settings)
const API_URL = 'https://marketbridge-685x.onrender.com';
const SUPABASE_URL = 'https://qvtlepimthfzymawnwiz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dGxlcGltdGhmenltYXdud2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNDY0MDQsImV4cCI6MjEwMDcyMjQwNH0.Zk9znYSh9uU4Z_wrZ2wuMXSV-ngvnH0a3gSKkvKNSrY';

const api = new MarketBridgeAPI(API_URL, SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById('register-form');
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
    
    const fullName = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    const result = await api.signUp(email, password, fullName, phone);

    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';

    if (result.success) {
        displayAlert('Account created successfully! Please sign in.', 'success');
        form.reset();
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    } else {
        displayAlert(result.error);
    }
});