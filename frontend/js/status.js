import { MarketBridgeAPI } from './api.js';

const API_URL = 'https://marketbridge-685x.onrender.com'; // Your Render URL
const SUPABASE_URL = 'https://qvtlepimthfzymawnwiz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dGxlcGltdGhmenltYXdud2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNDY0MDQsImV4cCI6MjEwMDcyMjQwNH0.Zk9znYSh9uU4Z_wrZ2wuMXSV-ngvnH0a3gSKkvKNSrY';

const api = new MarketBridgeAPI(API_URL, SUPABASE_URL, SUPABASE_KEY);

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

retryBtn.addEventListener('click', runHealthCheck);

document.addEventListener('DOMContentLoaded', () => {
    runHealthCheck();
});