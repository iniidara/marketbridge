import { MarketBridgeAPI } from './api.js';

const API_URL = 'http://127.0.0.1:8000';
const SUPABASE_URL = 'https://qvtlepimthfzymawnwiz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dGxlcGltdGhmenltYXdud2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNDY0MDQsImV4cCI6MjEwMDcyMjQwNH0.Zk9znYSh9uU4Z_wrZ2wuMXSV-ngvnH0a3gSKkvKNSrY';

const api = new MarketBridgeAPI(API_URL, SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById('profile-form');
const alertBox = document.getElementById('alert-box');
const saveBtn = document.getElementById('btn-save');
const logoutBtn = document.getElementById('btn-logout');

// 1. Verify user is logged in
const token = localStorage.getItem('mb_session_token');
if (!token) {
    window.location.href = 'login.html';
}

function displayAlert(message, type = 'error') {
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    alertBox.classList.remove('hidden');
}

// 2. Pre-populate form if the profile already exists
async function loadExistingProfile() {
    const result = await api.getProfile(token);
    if (result.success && result.data) {
        const p = result.data;
        document.getElementById('business-name').value = p.business_name;
        document.getElementById('category').value = p.category;
        document.getElementById('years-operating').value = p.years_operating;
        document.getElementById('market').value = p.market;
        document.getElementById('description').value = p.description || '';
        document.getElementById('shop-address').value = p.shop_address;
        
        saveBtn.textContent = 'Update Business Profile';
    }
}

// 3. Handle Form Submit
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.classList.add('hidden');

    const profileData = {
        business_name: document.getElementById('business-name').value.trim(),
        category: document.getElementById('category').value,
        years_operating: parseInt(document.getElementById('years-operating').value, 10),
        market: document.getElementById('market').value.trim(),
        description: document.getElementById('description').value.trim() || null,
        shop_address: document.getElementById('shop-address').value.trim()
    };

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving business details...';

    const result = await api.saveProfile(token, profileData);

    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Profile & Enter Dashboard';

    if (result.success) {
        displayAlert('Your profile details have been securely updated!', 'success');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    } else {
        displayAlert(result.error);
    }
});

// 4. Handle Logout
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('mb_session_token');
    localStorage.removeItem('mb_user');
    window.location.href = 'login.html';
});

// Run load on init
document.addEventListener('DOMContentLoaded', loadExistingProfile);