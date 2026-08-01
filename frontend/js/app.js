import { MarketBridgeAPI } from './api.js';

const API_URL = 'http://127.0.0.1:8000';
const SUPABASE_URL = 'https://qvtlepimthfzymawnwiz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dGxlcGltdGhmenltYXdud2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNDY0MDQsImV4cCI6MjEwMDcyMjQwNH0.Zk9znYSh9uU4Z_wrZ2wuMXSV-ngvnH0a3gSKkvKNSrY';

const api = new MarketBridgeAPI(API_URL, SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const statusBadge = document.getElementById('status-badge');
const statusText = document.getElementById('status-text');
const backendStatusVal = document.getElementById('backend-status');
const dbStatusVal = document.getElementById('db-status');
const apiLatencyVal = document.getElementById('api-latency');
const retryBtn = document.getElementById('btn-retry-health');

function setUIStateChecking() {
    statusBadge.className = 'status-badge status-loading';
    statusText.textContent = 'Verifying setup...';
    backendStatusVal.className = 'value text-warning';
    backendStatusVal.textContent = 'Validating';
    dbStatusVal.className = 'value text-warning';
    dbStatusVal.textContent = 'Validating';
    apiLatencyVal.textContent = '--';
    retryBtn.disabled = true;
}

async function runHealthCheck() {
    setUIStateChecking();
    const result = await api.getSystemHealth();
    retryBtn.disabled = false;

    if (result.success && result.data.status === 'healthy') {
        statusBadge.className = 'status-badge status-online';
        statusText.textContent = 'System Operational';
        backendStatusVal.className = 'value text-success';
        backendStatusVal.textContent = 'Active (200 OK)';
        apiLatencyVal.textContent = result.latency;

        if (result.data.database.connected) {
            dbStatusVal.className = 'value text-success';
            dbStatusVal.textContent = 'Connected (Supabase)';
        } else {
            dbStatusVal.className = 'value text-danger';
            dbStatusVal.textContent = `Error: ${result.data.database.error || 'Connection Failed'}`;
            statusBadge.className = 'status-badge status-offline';
            statusText.textContent = 'Partial Outage';
        }
    } else {
        statusBadge.className = 'status-badge status-offline';
        statusText.textContent = 'Offline';
        backendStatusVal.className = 'value text-danger';
        backendStatusVal.textContent = 'Connection Refused';
        dbStatusVal.className = 'value text-danger';
        dbStatusVal.textContent = 'Unreachable';
        apiLatencyVal.textContent = result.latency;
    }
}

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
                window.location.href = 'profile-setup.html';
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
            // User is logged in but hasn't created a business profile yet -> redirect to onboarding
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

retryBtn.addEventListener('click', runHealthCheck);

document.addEventListener('DOMContentLoaded', () => {
    runHealthCheck();
    runSessionCheck();
});