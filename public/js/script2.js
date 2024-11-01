document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById('Email').value;
    const password = document.getElementById('Contrasena').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                Email: email,
                Contrasena: password
            })
        });

        const data = await response.json();

        if (data.userId) {
            // Store the user ID
            localStorage.setItem('userId', data.userId);
            window.location.href = data.redirectUrl;
        } else {
            alert('Login failed: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during login');
    }
});