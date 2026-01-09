// Liste des pseudos autorisés
const AUTHORIZED_USERS = [
    'LaVraisBall', 
    'LaVraiBall2', 
    'Lulu Rose2208', 
    'LyricTitan92747', 
    'TheReaper', 
    'TheTnIsBack', 
    'superjaijai', 
    'WardedBrush1880'
];

const API_URL = 'http://localhost:3000/api';
let currentUser = null;
let currentKingdom = null;
let loginStep = 'username'; // 'username', 'password', 'new-password'

// Navigation menu
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            
            item.classList.add('active');
            const section = item.getAttribute('data-section');
            document.getElementById(section).classList.add('active');
            
            // Charger les royaumes si on va sur la page royaumes
            if (section === 'royaumes') {
                loadAllKingdoms();
            }
        });
    });

    // Entrée pour se connecter
    document.getElementById('username').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
    
    document.getElementById('password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
    
    document.getElementById('confirm-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
});

// Connexion avec gestion du mot de passe
async function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorMsg = document.getElementById('error-message');
    
    if (loginStep === 'username') {
        if (!username) {
            errorMsg.textContent = 'Veuillez entrer un pseudo.';
            errorMsg.style.display = 'block';
            return;
        }

        // Vérification côté client
        if (!AUTHORIZED_USERS.includes(username)) {
            errorMsg.textContent = 'Accès refusé. Pseudo non autorisé.';
            errorMsg.style.display = 'block';
            return;
        }

        try {
            // Vérifier si l'utilisateur existe
            const response = await fetch(`${API_URL}/check-user/${username}`);
            const data = await response.json();

            if (data.exists) {
                if (data.hasPassword) {
                    // Demander le mot de passe
                    loginStep = 'password';
                    document.getElementById('password-group').style.display = 'block';
                    errorMsg.style.display = 'none';
                } else {
                    // Première connexion, créer un mot de passe
                    loginStep = 'new-password';
                    document.getElementById('new-password-group').style.display = 'block';
                    document.getElementById('confirm-password-group').style.display = 'block';
                    errorMsg.style.display = 'none';
                }
            } else {
                // Nouvel utilisateur
                loginStep = 'new-password';
                document.getElementById('new-password-group').style.display = 'block';
                document.getElementById('confirm-password-group').style.display = 'block';
                errorMsg.style.display = 'none';
            }
        } catch (error) {
            errorMsg.textContent = 'Erreur de connexion au serveur.';
            errorMsg.style.display = 'block';
        }
    } else if (loginStep === 'password') {
        // Connexion avec mot de passe existant
        if (!password) {
            errorMsg.textContent = 'Veuillez entrer votre mot de passe.';
            errorMsg.style.display = 'block';
            return;
        }

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                currentUser = username;
                document.getElementById('current-user').textContent = username;
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('main-app').style.display = 'block';
                loadKingdom();
            } else {
                errorMsg.textContent = data.error || 'Mot de passe incorrect.';
                errorMsg.style.display = 'block';
            }
        } catch (error) {
            errorMsg.textContent = 'Erreur de connexion au serveur.';
            errorMsg.style.display = 'block';
        }
    } else if (loginStep === 'new-password') {
        // Création d'un nouveau mot de passe
        if (!newPassword || !confirmPassword) {
            errorMsg.textContent = 'Veuillez remplir tous les champs.';
            errorMsg.style.display = 'block';
            return;
        }

        if (newPassword.length < 6) {
            errorMsg.textContent = 'Le mot de passe doit contenir au moins 6 caractères.';
            errorMsg.style.display = 'block';
            return;
        }

        if (newPassword !== confirmPassword) {
            errorMsg.textContent = 'Les mots de passe ne correspondent pas.';
            errorMsg.style.display = 'block';
            return;
        }

        try {
            const response = await fetch(`${API_URL}/set-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password: newPassword })
            });

            const data = await response.json();

            if (response.ok) {
                currentUser = username;
                document.getElementById('current-user').textContent = username;
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('main-app').style.display = 'block';
                loadKingdom();
            } else {
                errorMsg.textContent = data.error || 'Erreur lors de la création du mot de passe.';
                errorMsg.style.display = 'block';
            }
        } catch (error) {
            errorMsg.textContent = 'Erreur de connexion au serveur.';
            errorMsg.style.display = 'block';
        }
    }
}

// Créer un royaume
async function createKingdom(event) {
    event.preventDefault();
    
    const formData = new FormData();
    formData.append('name', document.getElementById('kingdom-name').value);
    formData.append('king', document.getElementById('king-name').value);
    formData.append('currency', document.getElementById('currency-type').value);
    formData.append('logo', document.getElementById('kingdom-logo').files[0]);
    formData.append('user', currentUser);

    try {
        const response = await fetch(`${API_URL}/kingdom`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('create-success').style.display = 'block';
            setTimeout(() => {
                document.getElementById('kingdom-form').reset();
                document.getElementById('create-success').style.display = 'none';
                loadKingdom();
            }, 2000);
        } else {
            alert(data.error || 'Erreur lors de la création du royaume');
        }
    } catch (error) {
        alert('Erreur de connexion au serveur');
    }
}

// Charger le royaume de l'utilisateur connecté
async function loadKingdom() {
    try {
        const response = await fetch(`${API_URL}/kingdom/${currentUser}`);

        if (response.ok) {
            const kingdom = await response.json();
            currentKingdom = kingdom;
            displayKingdom(kingdom);
        }
    } catch (error) {
        console.error('Erreur lors du chargement du royaume');
    }
}

// Charger tous les royaumes
async function loadAllKingdoms() {
    try {
        const response = await fetch(`${API_URL}/kingdoms`);

        if (response.ok) {
            const kingdoms = await response.json();
            displayAllKingdoms(kingdoms);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des royaumes');
    }
}

// Afficher tous les royaumes
function displayAllKingdoms(kingdoms) {
    const container = document.getElementById('kingdoms-list');
    
    if (kingdoms.length === 0) {
        container.innerHTML = '<div class="no-kingdoms pixel-border">Aucun royaume créé pour le moment.</div>';
        return;
    }
    
    container.innerHTML = '<div class="kingdoms-grid"></div>';
    const grid = container.querySelector('.kingdoms-grid');
    
    kingdoms.forEach(kingdom => {
        const card = document.createElement('div');
        card.className = 'kingdom-card pixel-border';
        
        const residentsHTML = kingdom.residents && kingdom.residents.length > 0
            ? `<div class="kingdom-residents">
                <div class="kingdom-residents-title">👥 Résidents:</div>
                <div class="kingdom-residents-list">
                    ${kingdom.residents.map(r => `<span class="resident-tag">${r}</span>`).join('')}
                </div>
               </div>`
            : '';
        
        const lawsHTML = kingdom.laws
            ? `<div class="kingdom-laws-preview">
                <h4>📜 Lois du royaume:</h4>
                <p>${kingdom.laws}</p>
               </div>`
            : '';
        
        card.innerHTML = `
            <div class="kingdom-card-header">
                <img src="${kingdom.logo}" alt="Logo" class="kingdom-card-logo">
                <div class="kingdom-card-title">
                    <h3>${kingdom.name}</h3>
                    <p>Roi: ${kingdom.king}</p>
                </div>
            </div>
            <div class="kingdom-card-info">
                <p><strong>💰 Monnaie:</strong> ${kingdom.currency}</p>
                <p><strong>📅 Créé le:</strong> ${new Date(kingdom.createdAt).toLocaleDateString('fr-FR')}</p>
            </div>
            ${residentsHTML}
            ${lawsHTML}
        `;
        
        grid.appendChild(card);
    });
}

// Afficher le royaume de l'utilisateur
function displayKingdom(kingdom) {
    document.getElementById('kingdom-management').style.display = 'block';
    document.getElementById('display-logo').src = kingdom.logo;
    document.getElementById('display-kingdom-name').textContent = kingdom.name;
    document.getElementById('display-king-name').textContent = kingdom.king;
    document.getElementById('display-currency').textContent = kingdom.currency;
    document.getElementById('kingdom-laws').value = kingdom.laws || '';
    
    const residentsList = document.getElementById('residents-list');
    residentsList.innerHTML = '';
    kingdom.residents.forEach(resident => {
        const li = document.createElement('li');
        li.textContent = resident;
        residentsList.appendChild(li);
    });
}

// Ajouter un résident
async function addResident() {
    const residentName = document.getElementById('new-resident').value.trim();
    if (!residentName) return;

    try {
        const response = await fetch(`${API_URL}/kingdom/${currentUser}/residents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resident: residentName })
        });

        if (response.ok) {
            document.getElementById('new-resident').value = '';
            loadKingdom();
        } else {
            alert('Erreur lors de l\'ajout du résident');
        }
    } catch (error) {
        alert('Erreur de connexion au serveur');
    }
}

// Sauvegarder les lois
async function saveLaws() {
    const laws = document.getElementById('kingdom-laws').value;

    try {
        const response = await fetch(`${API_URL}/kingdom/${currentUser}/laws`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ laws })
        });

        if (response.ok) {
            alert('Lois sauvegardées avec succès!');
        } else {
            alert('Erreur lors de la sauvegarde des lois');
        }
    } catch (error) {
        alert('Erreur de connexion au serveur');
    }
}

// Déconnexion
function logout() {
    currentUser = null;
    currentKingdom = null;
    loginStep = 'username';
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

// Fonction pour gérer l'ouverture/fermeture des règles
function toggleRule(ruleNumber) {
    const content = document.getElementById(`rule-${ruleNumber}`);
    const arrow = document.getElementById(`arrow-${ruleNumber}`);
    
    if (content.classList.contains('open')) {
        content.classList.remove('open');
        arrow.classList.remove('open');
    } else {
        content.classList.add('open');
        arrow.classList.add('open');
    }
}