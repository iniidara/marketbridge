const API_URL = 'http://127.0.0.1:8000';

const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

const surveyForm = document.getElementById('survey-form');
const alertBox = document.getElementById('alert-box');
const surveyTitle = document.getElementById('survey-title');
const surveySubtitle = document.getElementById('survey-subtitle');
const submitBtn = document.getElementById('btn-submit');

function displayAlert(message, type = 'error') {
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    alertBox.classList.remove('hidden');
}

/**
 * Resolves token context on load [1]
 */
async function checkTokenValidity() {
    if (!token) {
        displayAlert('Invalid access. Verification link is missing its secure authentication token.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/v1/verify/${token}`);
        const data = await response.json();

        if (response.ok) {
            // Render specific context details [1]
            surveyTitle.textContent = `Verify ${data.trader_business_name}`;
            surveySubtitle.innerHTML = `Hi <strong>${data.verifier_name}</strong>, you have been invited to verify your business relationship as a <strong>${data.relationship}</strong>. Your honest assessment helps build their reputation passport.`;
            surveyForm.classList.remove('hidden');
        } else {
            displayAlert(data.detail || 'Invalid or expired verification link.');
        }
    } catch (error) {
        displayAlert('Unreachable server. Please try again later.');
    }
}

// Handle Survey Submission [1]
surveyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.classList.add('hidden');

    const knownYears = parseInt(document.getElementById('known-years').value, 10);
    const trustRating = parseInt(document.getElementById('trust-rating').value, 10);
    const wouldLendValue = document.querySelector('input[name="would-lend"]:checked').value === 'true';
    const comments = document.getElementById('comments').value.trim() || null;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting verification...';

    try {
        const response = await fetch(`${API_URL}/api/v1/verify/${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                known_years: knownYears,
                trust_rating: trustRating,
                would_lend: wouldLendValue,
                comments: comments
            })
        });

        const data = await response.json();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Verification Survey';

        if (response.ok) {
            displayAlert(data.message, 'success');
            surveyForm.reset();
            surveyForm.classList.add('hidden');
            surveySubtitle.textContent = 'Your responses have been recorded and locked securely. You can safely close this browser window.';
        } else {
            displayAlert(data.detail || 'Failed to submit verification survey.');
        }
    } catch (error) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Verification Survey';
        displayAlert(error.message);
    }
});

document.addEventListener('DOMContentLoaded', checkTokenValidity);