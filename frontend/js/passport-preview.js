import { MarketBridgeAPI } from './api.js';

const API_URL = 'http://127.0.0.1:8000';
const SUPABASE_URL = 'https://qvtlepimthfzymawnwiz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dGxlcGltdGhmenltYXdud2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNDY0MDQsImV4cCI6MjEwMDcyMjQwNH0.Zk9znYSh9uU4Z_wrZ2wuMXSV-ngvnH0a3gSKkvKNSrY';

const api = new MarketBridgeAPI(API_URL, SUPABASE_URL, SUPABASE_KEY);

const token = localStorage.getItem('mb_session_token');
if (!token) {
    window.location.href = 'login.html';
}

// DOM elements
const bizName = document.getElementById('passport-biz-name');
const bizMeta = document.getElementById('passport-category-market');
const passportID = document.getElementById('passport-id');
const passportDate = document.getElementById('passport-date');
const qrCodeContainer = document.getElementById('passport-qr-code');

// Score DOM elements
const scoreOverall = document.getElementById('score-overall');
const scoreIdentity = document.getElementById('score-identity');
const scoreBusiness = document.getElementById('score-business');
const scoreEvidence = document.getElementById('score-evidence');
const scoreCommunity = document.getElementById('score-community');

// AI DOM elements
const aiLoading = document.getElementById('ai-loading');
const aiContent = document.getElementById('ai-content');
const aiSummary = document.getElementById('ai-summary');
const aiStrengths = document.getElementById('ai-strengths');
const aiWeaknesses = document.getElementById('ai-weaknesses');
const aiRecommendations = document.getElementById('ai-recommendations');
const aiConfidence = document.getElementById('ai-confidence');

const printBtn = document.getElementById('btn-print');

/**
 * Loads profile, calculates the trust score, and calls the Gemini explainer
 */
async function generatePassportData() {
    try {
        // 1. Fetch Profile Info
        const profileResult = await api.getProfile(token);
        if (!profileResult.success) {
            window.location.href = 'profile-setup.html';
            return;
        }
        const profile = profileResult.data;
        bizName.textContent = profile.business_name;
        bizMeta.textContent = `${profile.category} • ${profile.market}`;
        
        // Clean ID representation
        passportID.textContent = `MB-${profile.id.substring(0, 8).toUpperCase()}`;
        passportDate.textContent = new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        // Generate QR code referencing their direct verification profile URL
        const verificationURL = `${window.location.origin}/dashboard.html`;
        qrCodeContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(verificationURL)}" alt="Passport QR Code">`;

        // 2. Trigger Deterministic Trust Score Calculation Endpoint [1]
        const scoreResponse = await fetch(`${API_URL}/api/v1/traders/trust-score`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!scoreResponse.ok) throw new Error("Failed to calculate trust score");
        const score = await scoreResponse.json();

        // Render scores
        scoreOverall.textContent = score.overall_score;
        scoreIdentity.textContent = `${score.identity_score}/20`;
        scoreBusiness.textContent = `${score.business_score}/20`;
        scoreEvidence.textContent = `${score.evidence_score}/20`;
        scoreCommunity.textContent = `${score.community_score}/40`;

        // 3. Trigger Gemini AI Explanation Endpoint [1]
        // 3. Trigger Gemini AI Explanation Endpoint [1]
        const aiResponse = await fetch(`${API_URL}/api/v1/traders/explain`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const aiData = await aiResponse.json();
        
        if (!aiResponse.ok) {
            // Displays the actual error from the backend instead of masking it [1]
            throw new Error(aiData.detail || "AI explanation request failed.");
        }

        // Render AI data
        aiSummary.textContent = aiData.overall_summary;
        
        aiStrengths.innerHTML = aiData.strengths.map(s => `<li>${s}</li>`).join('');
        aiWeaknesses.innerHTML = aiData.weaknesses.map(w => `<li>${w}</li>`).join('');
        aiRecommendations.innerHTML = aiData.recommendations.map(r => `<li>${r}</li>`).join('');
        
        aiConfidence.textContent = aiData.confidence_level.toUpperCase();

        // Switch loader views
        aiLoading.classList.add('hidden');
        aiContent.classList.remove('hidden');

    } catch (error) {
        console.error(error);
        aiLoading.innerHTML = `
            <div style="color: var(--danger)">
                <strong>AI Generation Failed:</strong><br>
                ${error.message || 'Verification token or server timeout. Please refresh.'}
            </div>
        `;
    }
}

// Print Handler [1]
printBtn.addEventListener('click', () => {
    window.print();
});

document.addEventListener('DOMContentLoaded', generatePassportData);