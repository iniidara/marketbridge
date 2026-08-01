import { MarketBridgeAPI } from './api.js';

const API_URL = 'https://marketbridge-685x.onrender.com';
const SUPABASE_URL = 'https://qvtlepimthfzymawnwiz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dGxlcGltdGhmenltYXdud2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNDY0MDQsImV4cCI6MjEwMDcyMjQwNH0.Zk9znYSh9uU4Z_wrZ2wuMXSV-ngvnH0a3gSKkvKNSrY';

const api = new MarketBridgeAPI(API_URL, SUPABASE_URL, SUPABASE_KEY);

const token = localStorage.getItem('mb_session_token');
if (!token) {
    window.location.href = 'login.html';
}

// DOM elements
const bizNameHeader = document.getElementById('dashboard-business-name');
const bizMetaHeader = document.getElementById('dashboard-location-category');
const evidenceGrid = document.getElementById('evidence-grid');
const emptyState = document.getElementById('empty-vault-state');
const uploadForm = document.getElementById('upload-form');
const uploadAlert = document.getElementById('upload-alert');
const uploadBtn = document.getElementById('btn-upload');
const passportCard = document.getElementById('passport-status-card');
const logoutBtn = document.getElementById('btn-logout');

// Reference DOM elements (Feature 5)
const referenceForm = document.getElementById('reference-form');
const referenceAlert = document.getElementById('reference-alert');
const inviteBtn = document.getElementById('btn-invite-ref');
const referencesList = document.getElementById('references-list');
const emptyRefsState = document.getElementById('empty-references-state');

function displayUploadAlert(message, type = 'error') {
    uploadAlert.className = `alert alert-${type}`;
    uploadAlert.textContent = message;
    uploadAlert.classList.remove('hidden');
}

function displayReferenceAlert(message, type = 'error') {
    referenceAlert.className = `alert alert-${type}`;
    referenceAlert.textContent = message;
    referenceAlert.classList.remove('hidden');
}

function getReadableTypeLabel(type) {
    const labels = {
        'shop_photo': 'Shop Front Photo',
        'inventory_photo': 'Inventory Stock',
        'receipt': 'Purchase Receipt',
        'utility_bill': 'Utility Bill',
        'cac_certificate': 'CAC Certificate'
    };
    return labels[type] || type;
}

/**
 * Loads entire dashboard metadata
 */
async function loadDashboard() {
    // 1. Fetch Business Profile
    const profileResult = await api.getProfile(token);
    if (!profileResult.success) {
        window.location.href = 'profile-setup.html';
        return;
    }
    const profile = profileResult.data;
    bizNameHeader.textContent = profile.business_name;
    bizMetaHeader.textContent = `${profile.category} • ${profile.market}`;

    // 2. Fetch Uploaded Evidence List [1]
    const evidenceResponse = await fetch(`${API_URL}/api/v1/traders/evidence`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const evidenceList = evidenceResponse.ok ? await evidenceResponse.json() : [];

    // Render Evidence Grid
    evidenceGrid.innerHTML = '';
    if (evidenceList.length === 0) {
        emptyState.classList.remove('hidden');
        evidenceGrid.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        evidenceGrid.classList.remove('hidden');

        evidenceList.forEach(item => {
            const card = document.createElement('div');
            card.className = 'evidence-card';
            card.innerHTML = `
                <div class="evidence-card-img-wrapper">
                    <img src="${item.file_url}" alt="${item.evidence_type}">
                </div>
                <div class="evidence-card-details">
                    <h5>${getReadableTypeLabel(item.evidence_type)}</h5>
                    <button class="btn-delete-evidence" data-id="${item.id}">Delete</button>
                </div>
            `;
            evidenceGrid.appendChild(card);
        });

        document.querySelectorAll('.btn-delete-evidence').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                e.target.disabled = true;
                e.target.textContent = 'Deleting...';
                const deleteResponse = await fetch(`${API_URL}/api/v1/traders/evidence/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (deleteResponse.ok) {
                    loadDashboard();
                } else {
                    e.target.disabled = false;
                    e.target.textContent = 'Delete';
                    alert('Deletion failed.');
                }
            });
        });
    }

    // 3. Fetch Verifiers List [1]
    const verifiersResponse = await fetch(`${API_URL}/api/v1/traders/verifiers`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const verifiersList = verifiersResponse.ok ? await verifiersResponse.json() : [];

    // Render Verifiers List [1]
    referencesList.innerHTML = '';
    if (verifiersList.length === 0) {
        emptyRefsState.classList.remove('hidden');
        referencesList.classList.add('hidden');
    } else {
        emptyRefsState.classList.add('hidden');
        referencesList.classList.remove('hidden');

        verifiersList.forEach(item => {
            const row = document.createElement('div');
            row.className = 'reference-row';
            
            // Build absolute verification link
            const verificationLink = `${window.location.origin}/verify.html?token=${item.token}`;

            const statusClass = item.status === 'completed' ? 'text-success' : 'text-warning';
            const statusLabel = item.status === 'completed' ? 'Verified' : 'Pending';

            row.innerHTML = `
                <div class="reference-row-meta">
                    <strong>${item.name}</strong>
                    <span>${item.relationship} • ${item.phone}</span>
                </div>
                <div class="reference-row-actions">
                    <span class="value ${statusClass}">${statusLabel}</span>
                    ${item.status === 'pending' 
                        ? `<button class="btn btn-secondary btn-copy-link" data-link="${verificationLink}">Copy Link</button>`
                        : `<span class="badge-completed">Done</span>`
                    }
                </div>
            `;
            referencesList.appendChild(row);
        });

        // Copy button action
        document.querySelectorAll('.btn-copy-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const link = e.target.getAttribute('data-link');
                navigator.clipboard.writeText(link).then(() => {
                    const originalText = e.target.textContent;
                    e.target.textContent = 'Copied!';
                    setTimeout(() => {
                        e.target.textContent = originalText;
                    }, 1500);
                });
            });
        });
    }

    // 4. Update Global Trust Metrics
    updateTrustScoreMetrics(evidenceList, verifiersList);
}

/**
 * Calculates deterministic preview score (Evidence + Community)
 */
function updateTrustScoreMetrics(evidenceList, verifiersList) {
    // 1. Evidence: 5 points per unique document, max 20
    const uniqueTypes = new Set(evidenceList.map(e => e.evidence_type));
    const evidenceScore = Math.min(uniqueTypes.size * 5, 20);

    // 2. Community: 10 points per completed reference verification, max 40
    const completedVerifications = verifiersList.filter(v => v.status === 'completed');
    const communityScore = Math.min(completedVerifications.length * 10, 40);

    // Identity (Complete profile) is 20 points
    const overallScore = 20 + evidenceScore + communityScore;

    const scoreTextElement = document.getElementById('trust-score-val');
    const progressBar = document.getElementById('trust-progress-bar');

    scoreTextElement.textContent = overallScore;
    progressBar.style.width = `${overallScore}%`;

    // Passport activation logic (requires profile + at least 1 verified reference + at least 1 evidence)
    if (completedVerifications.length >= 1 && evidenceList.length >= 1) {
        passportCard.innerHTML = `
            <span class="metric-label">Passport Status</span>
            <span class="metric-status status-success">Active & Verified</span>
            <p class="metric-desc">Your Reputation Trust Passport is officially complete and ready for lending evaluations [1]!</p>
        `;
    } else {
        passportCard.innerHTML = `
            <span class="metric-label">Passport Status</span>
            <span class="metric-status status-warning">Pending References</span>
            <p class="metric-desc">To activate your passport, upload at least one evidence document and get at least one completed reference survey [1].</p>
        `;
    }
}

// Upload Evidence Handler [1]
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    uploadAlert.classList.add('hidden');

    const fileInput = document.getElementById('file-input');
    const evidenceType = document.getElementById('evidence-type').value;

    if (!fileInput.files || fileInput.files.length === 0) {
        displayUploadAlert('Please choose an image file.');
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('evidence_type', evidenceType);

    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    try {
        const response = await fetch(`${API_URL}/api/v1/traders/evidence`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Document';

        if (response.ok) {
            displayUploadAlert('Evidence uploaded successfully!', 'success');
            uploadForm.reset();
            loadDashboard();
        } else {
            displayUploadAlert(data.detail || 'Upload failed.');
        }
    } catch (err) {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Document';
        displayUploadAlert(err.message);
    }
});

// Invite Reference Form Submission Handler [1]
referenceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    referenceAlert.classList.add('hidden');

    const refName = document.getElementById('ref-name').value.trim();
    const refPhone = document.getElementById('ref-phone').value.trim();
    const refRelationship = document.getElementById('ref-relationship').value;

    inviteBtn.disabled = true;
    inviteBtn.textContent = 'Registering reference...';

    try {
        const response = await fetch(`${API_URL}/api/v1/traders/verifiers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: refName,
                phone: refPhone,
                relationship: refRelationship
            })
        });

        const data = await response.json();
        inviteBtn.disabled = false;
        inviteBtn.textContent = 'Generate Verification Link';

        if (response.ok) {
            displayReferenceAlert('Invitation link generated! Check the list below to copy it.', 'success');
            referenceForm.reset();
            loadDashboard(); // Refresh references
        } else {
            displayReferenceAlert(data.detail || 'Failed to register reference.');
        }
    } catch (err) {
        inviteBtn.disabled = false;
        inviteBtn.textContent = 'Generate Verification Link';
        displayReferenceAlert(err.message);
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('mb_session_token');
    localStorage.removeItem('mb_user');
    window.location.href = 'login.html';
});

document.addEventListener('DOMContentLoaded', loadDashboard);