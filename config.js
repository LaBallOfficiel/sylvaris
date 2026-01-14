// ============================================
// 📁 config.js - CORRIGÉ
// ============================================
const CONFIG = {
    AUTHORIZED_USERS: [
        'LaVraiBall',
        'LaVraiBall2', 
        'Lulu Rose2208', 
        'LyricTitan92747', 
        'TheReaper', 
        'TheTnIsBack', 
        'superjaijai', 
        'WardedBrush1880'
    ],
    
    ADMIN_USER: 'LaVraiBall',
    
    // ✅ CORRECTION : URL corrigée
    API_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api'
        : 'https://sylvaris.onrender.com/api'  // ⚠️ CHANGEZ CETTE URL SELON VOTRE VRAIE URL RENDER
};

let currentUser = null;
let currentKingdom = null;
let loginStep = 'username';
let editMode = false;

// ============================================
// 📁 auth.js - CORRIGÉ
// ============================================
function showLoader() {
    document.getElementById('login-loader').classList.add('active');
    document.getElementById('login-btn').disabled = true;
    document.getElementById('reset-password-btn').disabled = true;
    document.getElementById('error-message').style.display = 'none';
}

function hideLoader() {
    document.getElementById('login-loader').classList.remove('active');
    document.getElementById('login-btn').disabled = false;
    document.getElementById('reset-password-btn').disabled = false;
}

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
            showLoader();
            const response = await fetch(`${CONFIG.API_URL}/check-user/${encodeURIComponent(username)}`);
            const data = await response.json();

            if (data.exists) {
                if (data.hasPassword) {
                    loginStep = 'password';
                    document.getElementById('password-group').style.display = 'block';
                    document.getElementById('forgot-password-link').style.display = 'block';
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
        } finally {
            hideLoader();
        }
    } else if (loginStep === 'password') {
        if (!password) {
            showMessage('error-message', 'Veuillez entrer votre mot de passe.');
            return;
        }

        try {
            showLoader();
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
        } finally {
            hideLoader();
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
            showLoader();
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
        } finally {
            hideLoader();
        }
    }
}

function showForgotPassword() {
    const username = document.getElementById('username').value.trim();
    
    if (!username) {
        showMessage('error-message', 'Veuillez d\'abord entrer votre pseudo.');
        return;
    }
    
    // Cacher le formulaire de connexion
    document.getElementById('password-group').style.display = 'none';
    document.getElementById('forgot-password-link').style.display = 'none';
    
    // Afficher le formulaire de reset
    document.getElementById('reset-password-group').style.display = 'block';
    document.getElementById('reset-confirm-password-group').style.display = 'block';
    document.getElementById('reset-password-btn').style.display = 'block';
    document.getElementById('cancel-reset-btn').style.display = 'inline-block';
    document.getElementById('login-btn').style.display = 'none';
    
    loginStep = 'reset-password';
    document.getElementById('error-message').style.display = 'none';
}

function cancelReset() {
    // Réafficher le formulaire de connexion
    document.getElementById('reset-password-group').style.display = 'none';
    document.getElementById('reset-confirm-password-group').style.display = 'none';
    document.getElementById('reset-password-btn').style.display = 'none';
    document.getElementById('cancel-reset-btn').style.display = 'none';
    document.getElementById('login-btn').style.display = 'block';
    
    document.getElementById('password-group').style.display = 'block';
    document.getElementById('forgot-password-link').style.display = 'block';
    
    // Vider les champs de reset
    document.getElementById('reset-password').value = '';
    document.getElementById('reset-confirm-password').value = '';
    
    loginStep = 'password';
    document.getElementById('error-message').style.display = 'none';
}

async function resetPassword() {
    const username = document.getElementById('username').value.trim();
    const newPassword = document.getElementById('reset-password').value;
    const confirmPassword = document.getElementById('reset-confirm-password').value;
    
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
        showLoader();
        console.log('🔄 Tentative de réinitialisation du mot de passe pour:', username);
        console.log('📡 URL appelée:', `${CONFIG.API_URL}/reset-password`);
        
        const response = await fetch(`${CONFIG.API_URL}/reset-password`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                username: username,
                newPassword: newPassword 
            })
        });
        
        console.log('📥 Statut de la réponse:', response.status);
        
        const data = await response.json();
        console.log('📦 Données reçues:', data);
        
        if (response.ok) {
            showMessage('success-message-reset', 'Mot de passe réinitialisé avec succès! Vous pouvez maintenant vous connecter.', 'success');
            
            // Réinitialiser le formulaire après 2 secondes
            setTimeout(() => {
                document.getElementById('reset-password').value = '';
                document.getElementById('reset-confirm-password').value = '';
                cancelReset();
                document.getElementById('success-message-reset').style.display = 'none';
            }, 2000);
        } else {
            showMessage('error-message', data.error || 'Erreur lors de la réinitialisation du mot de passe.');
        }
    } catch (error) {
        console.error('❌ Erreur complète:', error);
        showMessage('error-message', 'Erreur de connexion au serveur. Vérifiez votre connexion internet.');
    } finally {
        hideLoader();
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
    document.getElementById('reset-password').value = '';
    document.getElementById('reset-confirm-password').value = '';
    document.getElementById('password-group').style.display = 'none';
    document.getElementById('new-password-group').style.display = 'none';
    document.getElementById('confirm-password-group').style.display = 'none';
    document.getElementById('reset-password-group').style.display = 'none';
    document.getElementById('reset-confirm-password-group').style.display = 'none';
    document.getElementById('forgot-password-link').style.display = 'none';
    document.getElementById('reset-password-btn').style.display = 'none';
    document.getElementById('cancel-reset-btn').style.display = 'none';
    document.getElementById('login-btn').style.display = 'block';
    document.getElementById('error-message').style.display = 'none';
    hideLoader();
}

// ============================================
// 📁 server.js - VÉRIFICATION (Déjà correct)
// ============================================
// La route /api/reset-password existe déjà dans server.js (lignes 200-245)
// Elle est correcte et devrait fonctionner
// Assurez-vous que :
// 1. Le serveur est bien déployé sur Render
// 2. Les variables d'environnement sont configurées
// 3. L'URL dans config.js correspond à votre URL Render réelle