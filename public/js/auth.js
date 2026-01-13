const usernameInput = document.getElementById("username-input");
const passwordInput = document.getElementById("password-input");
const confirmPasswordInput = document.getElementById("confirm-password-input");
const errorDiv = document.getElementById("error-message");

function setError(text, visible) {
    if (text) {
        errorDiv.textContent = text;
    }

    errorDiv.classList.toggle('show', visible);
}

async function login(event) {
    event.preventDefault();

    const username = usernameInput.value;
    const password = passwordInput.value;

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            window.location.href = '/chat';
        } else {
            setError(data.error || 'Login failed', true);
        }
    } catch (err) {
        setError('Network error', true);
    }
}

async function signup(event) {
    event.preventDefault();

    const username = usernameInput.value;
    const password = passwordInput.value;
    const confirmedPassword = confirmPasswordInput.value;

    if (password !== confirmedPassword) {
        setError('Passwords do not match', true);
        return;
    }

    try {
        const response = await fetch('/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            window.location.href = '/chat';
        } else {
            setError(data.error || 'Signup failed', true);
        }
    } catch (err) {
        setError('Network error', true);
        console.error("Error during signup:", err);
    }
}

async function logout() {
    try {
        await fetch('/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (err) {
        console.error('Logout error:', err);
    }
}