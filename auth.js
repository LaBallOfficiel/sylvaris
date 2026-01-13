async function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorMsg = document.getElementById('error-message');
    
    if (loginStep === 'username') {
        if (!username) {
            showMessage('error-message', 'Veuillez entrer un pseudo.');
            return;
        }

        if (!CONFIG.AUTHORIZED_USERS.includes(username)) {
            showMessage('error-message', 'Accès refusé. Pseudo non autorisé.');
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_URL}/check-user/${encodeURIComponent(username)}`);
            const data = await response.json();

            if (data.exists) {
                if (data.hasPassword) {
                    loginStep = 'password';
                    document.getElementById('password-group').style.display = 'block';
                    errorMsg.style.display = 'none';
                } else {
                    loginStep = 'new-password';
                    document.getElementById('new-password-group').style.display = 'block';
                    document.getElementById('confirm-password-group').style.display = 'block';
                    errorMsg.style.display = 'none';
                }
            } else {
                loginStep = 'new-password';
                document.getElementById('new-password-group').style.display = 'block';
                document.getElementById('confirm-password-group').style.display = 'block';
                errorMsg.style.display = 'none';
            }
        } catch (error) {
            console.error('Erreur:', error);
            showMessage('error-message', 'Erreur de connexion au serveur.');
        }
    } else if (loginStep === 'password') {
        if (!password) {
            showMessage('error-message', 'Veuillez entrer votre mot de passe.');
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                onLoginSuccess(username);
            } else {
                showMessage('error-message', data.error || 'Mot de passe incorrect.');
            }
        } catch (error) {
            console.error('Erreur:', error);
            showMessage('error-message', 'Erreur de connexion au serveur.');
        }
    } else if (loginStep === 'new-password') {
        if (!newPassword || !confirmPassword) {
            showMessage('error-message', 'Veuillez remplir tous les champs.');
            return;
        }

        if (newPassword.length < 6) {
            showMessage('error-message', 'Le mot de passe doit contenir au moins 6 caractères.');
            return;
        }

        if (newPassword !== confirmPassword) {
            showMessage('error-message', 'Les mots de passe ne correspondent pas.');
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_URL}/set-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password: newPassword })
            });

            const data = await response.json();

            if (response.ok) {
                onLoginSuccess(username);
            } else {
                showMessage('error-message', data.error || 'Erreur lors de la création du mot de passe.');
            }
        } catch (error) {
            console.error('Erreur:', error);
            showMessage('error-message', 'Erreur de connexion au serveur.');
        }
    }
}

function onLoginSuccess(username) {
    currentUser = username;
    document.getElementById('current-user').textContent = username;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    if (currentUser === CONFIG.ADMIN_USER) {
        document.getElementById('admin-announcement-form').style.display = 'block';
        console.log('✅ Formulaire admin affiché pour:', currentUser);
    } else {
        console.log('ℹ️ Utilisateur non-admin:', currentUser);
    }
    
    loadKingdom();
}

function logout() {
    currentUser = null;
    currentKingdom = null;
    loginStep = 'username';
    editMode = false;
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    document.getElementById('password-group').style.display = 'none';
    document.getElementById('new-password-group').style.display = 'none';
    document.getElementById('confirm-password-group').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
}