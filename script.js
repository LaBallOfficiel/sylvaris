// Liste des pseudos autorisés
const AUTHORIZED_USERS = [
    'LaVraiBall',
    'LaVraiBall2', 
    'Lulu Rose2208', 
    'LyricTitan92747', 
    'TheReaper', 
    'TheTnIsBack', 
    'superjaijai', 
    'WardedBrush1880'
];

// Admin du serveur
const ADMIN_USER = 'LaVraiBall';

// URL de l'API hébergée sur Render
const API_URL = 'https://sylvaris.onrender.com/api';

let currentUser = null;
let currentKingdom = null;
let loginStep = 'username';
let editMode = false;

// Fonction pour afficher les messages
function showMessage(elementId, message, type = 'error') {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        
        // Masquer après 5 secondes pour les messages de succès
        if (type === 'success') {
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    }
}

// Test de connexion à l'API au chargement
async function testAPIConnection() {
    try {
        const response = await fetch(`${API_URL.replace('/api', '')}/health`);
        if (response.ok) {
            console.log('✅ Connexion à l\'API réussie');
        } else {
            console.warn('⚠️ L\'API répond mais avec un statut:', response.status);
        }
    } catch (error) {
        console.error('❌ Impossible de se connecter à l\'API:', error);
        console.log('URL testée:', API_URL);
    }
}

// Navigation menu
document.addEventListener('DOMContentLoaded', () => {
    // Test de connexion
    testAPIConnection();
    
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            
            item.classList.add('active');
            const section = item.getAttribute('data-section');
            document.getElementById(section).classList.add('active');
            
            if (section === 'royaumes') {
                loadAllKingdoms();
            }
            
            if (section === 'annonces') {
                loadAnnouncements();
            }
        });
    });

    document.getElementById('username').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
    
    document.getElementById('password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
    
    document.getElementById('confirm-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });

    // Remplir le select des résidents avec les joueurs autorisés
    populateResidentSelect();
});

// Remplir la liste déroulante des résidents
function populateResidentSelect() {
    const select = document.getElementById('new-resident');
    if (!select) return;
    
    select.innerHTML = '<option value="">Sélectionne un joueur...</option>';
    
    AUTHORIZED_USERS.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        select.appendChild(option);
    });
}

// Connexion avec gestion du mot de passe
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

        if (!AUTHORIZED_USERS.includes(username)) {
            showMessage('error-message', 'Accès refusé. Pseudo non autorisé.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/check-user/${encodeURIComponent(username)}`);
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
                
                // Afficher le formulaire d'annonce si admin
                if (currentUser === ADMIN_USER) {
                    document.getElementById('admin-announcement-form').style.display = 'block';
                    console.log('✅ Formulaire admin affiché pour:', currentUser);
                } else {
                    console.log('ℹ️ Utilisateur non-admin:', currentUser);
                }
                
                loadKingdom();
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
                
                // Afficher le formulaire d'annonce si admin
                if (currentUser === ADMIN_USER) {
                    document.getElementById('admin-announcement-form').style.display = 'block';
                }
                
                loadKingdom();
            } else {
                showMessage('error-message', data.error || 'Erreur lors de la création du mot de passe.');
            }
        } catch (error) {
            console.error('Erreur:', error);
            showMessage('error-message', 'Erreur de connexion au serveur.');
        }
    }
}

// Créer un royaume
async function createKingdom(event) {
    event.preventDefault();
    
    console.log('=== CRÉATION DU ROYAUME ===');
    
    const nameValue = document.getElementById('kingdom-name').value;
    const kingValue = document.getElementById('king-name').value;
    const currencyValue = document.getElementById('currency-type').value;
    const logoInput = document.getElementById('kingdom-logo');
    const bannerInput = document.getElementById('kingdom-banner');
    
    // Vérifications
    if (!nameValue || !kingValue || !currencyValue) {
        showMessage('create-error', 'Veuillez remplir tous les champs obligatoires');
        return;
    }
    
    if (!logoInput.files || logoInput.files.length === 0) {
        showMessage('create-error', 'Veuillez sélectionner un logo pour votre royaume');
        return;
    }
    
    const logoFile = logoInput.files[0];
    
    // Créer le FormData
    const formData = new FormData();
    formData.append('name', nameValue);
    formData.append('king', kingValue);
    formData.append('currency', currencyValue);
    formData.append('logo', logoFile);
    formData.append('user', currentUser);
    
    // Ajouter la bannière si elle existe
    if (bannerInput.files && bannerInput.files.length > 0) {
        const bannerFile = bannerInput.files[0];
        formData.append('banner', bannerFile);
    }

    try {
        const response = await fetch(`${API_URL}/kingdom`, {
            method: 'POST',
            body: formData
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Réponse non-JSON reçue:', text);
            showMessage('create-error', 'Erreur serveur: le serveur a renvoyé une réponse invalide');
            return;
        }

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Royaume créé avec succès!');
            showMessage('create-success', 'Royaume créé avec succès!', 'success');
            document.getElementById('create-error').style.display = 'none';
            setTimeout(() => {
                document.getElementById('kingdom-form').reset();
                document.getElementById('create-success').style.display = 'none';
                loadKingdom();
            }, 2000);
        } else {
            console.error('❌ Erreur:', data.error);
            showMessage('create-error', data.error || 'Erreur lors de la création du royaume');
        }
    } catch (error) {
        console.error('❌ Erreur complète:', error);
        showMessage('create-error', 'Erreur de connexion au serveur: ' + error.message);
    }
}

// Toggle mode édition
function toggleEditMode() {
    editMode = !editMode;
    const editSection = document.getElementById('edit-mode');
    
    if (editMode) {
        editSection.style.display = 'block';
        document.getElementById('edit-kingdom-name').value = currentKingdom.name;
        document.getElementById('edit-king-name').value = currentKingdom.king;
        document.getElementById('edit-currency-type').value = currentKingdom.currency;
    } else {
        editSection.style.display = 'none';
    }
}

// Sauvegarder les modifications du royaume
async function saveKingdomEdits() {
    const formData = new FormData();
    formData.append('name', document.getElementById('edit-kingdom-name').value);
    formData.append('king', document.getElementById('edit-king-name').value);
    formData.append('currency', document.getElementById('edit-currency-type').value);
    
    const logoFile = document.getElementById('edit-kingdom-logo').files[0];
    if (logoFile) {
        formData.append('logo', logoFile);
    }
    
    const bannerFile = document.getElementById('edit-kingdom-banner').files[0];
    if (bannerFile) {
        formData.append('banner', bannerFile);
    }

    try {
        const response = await fetch(`${API_URL}/kingdom/${encodeURIComponent(currentUser)}`, {
            method: 'PUT',
            body: formData
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Réponse non-JSON reçue:', text);
            const errorBox = document.createElement('div');
            errorBox.className = 'error-message';
            errorBox.style.display = 'block';
            errorBox.textContent = 'Erreur serveur: réponse invalide';
            document.getElementById('edit-mode').appendChild(errorBox);
            setTimeout(() => errorBox.remove(), 5000);
            return;
        }

        if (response.ok) {
            const successBox = document.createElement('div');
            successBox.className = 'success-message';
            successBox.style.display = 'block';
            successBox.textContent = 'Royaume modifié avec succès!';
            document.getElementById('edit-mode').appendChild(successBox);
            
            setTimeout(() => {
                successBox.remove();
                toggleEditMode();
                loadKingdom();
            }, 2000);
        } else {
            const data = await response.json();
            const errorBox = document.createElement('div');
            errorBox.className = 'error-message';
            errorBox.style.display = 'block';
            errorBox.textContent = data.error || 'Erreur lors de la modification du royaume';
            document.getElementById('edit-mode').appendChild(errorBox);
            
            setTimeout(() => errorBox.remove(), 5000);
        }
    } catch (error) {
        console.error('Erreur:', error);
        const errorBox = document.createElement('div');
        errorBox.className = 'error-message';
        errorBox.style.display = 'block';
        errorBox.textContent = 'Erreur de connexion au serveur';
        document.getElementById('edit-mode').appendChild(errorBox);
        
        setTimeout(() => errorBox.remove(), 5000);
    }
}

// Charger le royaume de l'utilisateur connecté
async function loadKingdom() {
    try {
        const response = await fetch(`${API_URL}/kingdom/${encodeURIComponent(currentUser)}`);

        if (response.ok) {
            const kingdom = await response.json();
            currentKingdom = kingdom;
            displayKingdom(kingdom);
        } else {
            // Pas de royaume, afficher le formulaire de création
            document.getElementById('kingdom-management').style.display = 'none';
        }
    } catch (error) {
        console.error('Erreur lors du chargement du royaume:', error);
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
        console.error('Erreur lors du chargement des royaumes:', error);
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
                <img src="${kingdom.logo}" alt="Logo" class="kingdom-card-logo" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27100%27 height=%27100%27%3E%3Crect fill=%27%238b5cf6%27 width=%27100%27 height=%27100%27/%3E%3C/svg%3E'">
                <div class="kingdom-card-title">
                    <h3>${kingdom.name}</h3>
                    <p>Roi: ${kingdom.king}</p>
                </div>
            </div>
            <div class="kingdom-card-info">
                <p><strong>💰 Monnaie:</strong> ${kingdom.currency}</p>
                <p><strong>📅 Créé le:</strong> ${new Date(kingdom.created_at).toLocaleDateString('fr-FR')}</p>
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
    
    // Afficher le logo
    const logoElement = document.getElementById('display-logo');
    if (kingdom.logo) {
        logoElement.src = kingdom.logo;
        logoElement.style.display = 'block';
        logoElement.onerror = function() {
            this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%238b5cf6' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='12' fill='white' text-anchor='middle' dominant-baseline='middle'%3ELogo%3C/text%3E%3C/svg%3E";
        };
    } else {
        logoElement.style.display = 'none';
    }
    
    // Afficher la bannière
    const bannerElement = document.getElementById('display-banner');
    if (kingdom.banner) {
        bannerElement.src = kingdom.banner;
        bannerElement.style.display = 'block';
        bannerElement.onerror = function() {
            this.style.display = 'none';
        };
    } else {
        bannerElement.style.display = 'none';
    }
    
    document.getElementById('display-kingdom-name').textContent = kingdom.name;
    document.getElementById('display-king-name').textContent = kingdom.king;
    document.getElementById('display-currency').textContent = kingdom.currency;
    document.getElementById('kingdom-laws').value = kingdom.laws || '';
    
    const residentsList = document.getElementById('residents-list');
    residentsList.innerHTML = '';
    
    // Vérifier que residents existe et est un tableau
    if (kingdom.residents && Array.isArray(kingdom.residents)) {
        kingdom.residents.forEach(resident => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${resident}</span>
                <button class="remove-resident-btn" data-resident="${resident}">🗑️ Supprimer</button>
            `;
            
            // Ajouter l'événement directement sur le bouton créé
            const deleteBtn = li.querySelector('.remove-resident-btn');
            deleteBtn.addEventListener('click', function() {
                const residentToRemove = this.getAttribute('data-resident');
                removeResident(residentToRemove);
            });
            
            residentsList.appendChild(li);
        });
    }

    // Mettre à jour la liste déroulante pour exclure les résidents déjà ajoutés
    updateResidentSelect();
}

// Mettre à jour la liste déroulante des résidents
function updateResidentSelect() {
    const select = document.getElementById('new-resident');
    if (!select) return;
    
    select.innerHTML = '<option value="">Sélectionne un joueur...</option>';
    
    AUTHORIZED_USERS.forEach(user => {
        // Ne pas afficher les résidents déjà dans le royaume
        if (currentKingdom && currentKingdom.residents && !currentKingdom.residents.includes(user)) {
            const option = document.createElement('option');
            option.value = user;
            option.textContent = user;
            select.appendChild(option);
        }
    });
}

// Ajouter un résident
async function addResident() {
    const residentName = document.getElementById('new-resident').value;
    if (!residentName) {
        const errorBox = document.createElement('div');
        errorBox.className = 'error-message';
        errorBox.style.display = 'block';
        errorBox.textContent = 'Veuillez sélectionner un joueur';
        document.querySelector('.add-resident-form').appendChild(errorBox);
        setTimeout(() => errorBox.remove(), 3000);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/kingdom/${encodeURIComponent(currentUser)}/residents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resident: residentName })
        });

        if (response.ok) {
            document.getElementById('new-resident').value = '';
            loadKingdom();
        } else {
            const data = await response.json();
            const errorBox = document.createElement('div');
            errorBox.className = 'error-message';
            errorBox.style.display = 'block';
            errorBox.textContent = data.error || 'Erreur lors de l\'ajout du résident';
            document.querySelector('.add-resident-form').appendChild(errorBox);
            setTimeout(() => errorBox.remove(), 3000);
        }
    } catch (error) {
        console.error('Erreur:', error);
        const errorBox = document.createElement('div');
        errorBox.className = 'error-message';
        errorBox.style.display = 'block';
        errorBox.textContent = 'Erreur de connexion au serveur';
        document.querySelector('.add-resident-form').appendChild(errorBox);
        setTimeout(() => errorBox.remove(), 3000);
    }
}

// Supprimer un résident
async function removeResident(residentName) {
    const confirmBox = document.createElement('div');
    confirmBox.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(45, 27, 78, 0.95);
        padding: 30px;
        border: 4px solid #8b5cf6;
        z-index: 10000;
        text-align: center;
        max-width: 400px;
    `;
    confirmBox.innerHTML = `
        <p style="margin-bottom: 20px; color: #e0d4ff;">Voulez-vous vraiment retirer ${residentName} du royaume ?</p>
        <button class="btn-small pixel-border" id="confirm-yes" style="margin-right: 10px;">Oui</button>
        <button class="btn-small pixel-border" id="confirm-no" style="background: #dc2626; border-color: #ef4444;">Non</button>
    `;
    document.body.appendChild(confirmBox);
    
    document.getElementById('confirm-yes').onclick = async () => {
        confirmBox.remove();
        
        try {
            const response = await fetch(`${API_URL}/kingdom/${encodeURIComponent(currentUser)}/residents/${encodeURIComponent(residentName)}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                const successBox = document.createElement('div');
                successBox.className = 'success-message';
                successBox.style.display = 'block';
                successBox.textContent = `${residentName} a été retiré du royaume`;
                document.getElementById('kingdom-management').insertBefore(successBox, document.getElementById('kingdom-management').firstChild);
                setTimeout(() => {
                    successBox.remove();
                    loadKingdom();
                }, 2000);
            } else {
                const data = await response.json();
                const errorBox = document.createElement('div');
                errorBox.className = 'error-message';
                errorBox.style.display = 'block';
                errorBox.textContent = data.error || 'Erreur lors de la suppression du résident';
                document.getElementById('kingdom-management').insertBefore(errorBox, document.getElementById('kingdom-management').firstChild);
                setTimeout(() => errorBox.remove(), 3000);
            }
        } catch (error) {
            console.error('Erreur:', error);
            const errorBox = document.createElement('div');
            errorBox.className = 'error-message';
            errorBox.style.display = 'block';
            errorBox.textContent = 'Erreur de connexion au serveur';
            document.getElementById('kingdom-management').insertBefore(errorBox, document.getElementById('kingdom-management').firstChild);
            setTimeout(() => errorBox.remove(), 3000);
        }
    };
    
    document.getElementById('confirm-no').onclick = () => {
        confirmBox.remove();
    };
}

// Sauvegarder les lois
async function saveLaws() {
    const laws = document.getElementById('kingdom-laws').value;

    try {
        const response = await fetch(`${API_URL}/kingdom/${encodeURIComponent(currentUser)}/laws`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ laws })
        });

        if (response.ok) {
            const successBox = document.createElement('div');
            successBox.className = 'success-message';
            successBox.style.display = 'block';
            successBox.textContent = 'Lois sauvegardées avec succès!';
            document.getElementById('kingdom-laws').parentElement.appendChild(successBox);
            setTimeout(() => {
                successBox.remove();
                loadKingdom();
            }, 2000);
        } else {
            const data = await response.json();
            const errorBox = document.createElement('div');
            errorBox.className = 'error-message';
            errorBox.style.display = 'block';
            errorBox.textContent = data.error || 'Erreur lors de la sauvegarde des lois';
            document.getElementById('kingdom-laws').parentElement.appendChild(errorBox);
            setTimeout(() => errorBox.remove(), 3000);
        }
    } catch (error) {
        console.error('Erreur:', error);
        const errorBox = document.createElement('div');
        errorBox.className = 'error-message';
        errorBox.style.display = 'block';
        errorBox.textContent = 'Erreur de connexion au serveur';
        document.getElementById('kingdom-laws').parentElement.appendChild(errorBox);
        setTimeout(() => errorBox.remove(), 3000);
    }
}

// Supprimer un royaume
async function deleteKingdom() {
    const confirmBox1 = document.createElement('div');
    confirmBox1.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(45, 27, 78, 0.95);
        padding: 30px;
        border: 4px solid #dc2626;
        z-index: 10000;
        text-align: center;
        max-width: 500px;
    `;
    confirmBox1.innerHTML = `
        <p style="margin-bottom: 20px; color: #fca5a5; line-height: 1.6;">
            ⚠️ ATTENTION ! Êtes-vous sûr de vouloir supprimer définitivement votre royaume ?<br><br>
            Cette action est irréversible et supprimera :<br>
            - Le royaume<br>
            - Tous les résidents<br>
            - Toutes les lois<br>
            - Le logo et la bannière
        </p>
        <button class="btn-small pixel-border" id="delete-yes1" style="margin-right: 10px; background: #dc2626; border-color: #ef4444;">Oui, supprimer</button>
        <button class="btn-small pixel-border" id="delete-no1">Annuler</button>
    `;
    document.body.appendChild(confirmBox1);
    
    document.getElementById('delete-yes1').onclick = () => {
        confirmBox1.remove();
        
        // Deuxième confirmation
        const confirmBox2 = document.createElement('div');
        confirmBox2.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(45, 27, 78, 0.95);
            padding: 30px;
            border: 4px solid #dc2626;
            z-index: 10000;
            text-align: center;
            max-width: 400px;
        `;
        confirmBox2.innerHTML = `
            <p style="margin-bottom: 20px; color: #fca5a5;">Dernière confirmation : Voulez-vous vraiment supprimer votre royaume ?</p>
            <button class="btn-small pixel-border" id="delete-yes2" style="margin-right: 10px; background: #dc2626; border-color: #ef4444;">Oui, définitivement</button>
            <button class="btn-small pixel-border" id="delete-no2">Non, annuler</button>
        `;
        document.body.appendChild(confirmBox2);
        
        document.getElementById('delete-yes2').onclick = async () => {
            confirmBox2.remove();
            
            try {
                const response = await fetch(`${API_URL}/kingdom/${encodeURIComponent(currentUser)}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (response.ok) {
                    const successBox = document.createElement('div');
                    successBox.className = 'success-message';
                    successBox.style.cssText = `
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        z-index: 10001;
                        padding: 30px;
                        font-size: 14px;
                    `;
                    successBox.textContent = '✅ Royaume supprimé avec succès';
                    document.body.appendChild(successBox);
                    
                    setTimeout(() => {
                        successBox.remove();
                        currentKingdom = null;
                        document.getElementById('kingdom-management').style.display = 'none';
                        document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
                        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
                        document.querySelector('[data-section="creer-royaume"]').classList.add('active');
                        document.getElementById('creer-royaume').classList.add('active');
                    }, 2000);
                } else {
                    const data = await response.json();
                    const errorBox = document.createElement('div');
                    errorBox.className = 'error-message';
                    errorBox.style.cssText = `
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        z-index: 10001;
                        padding: 30px;
                        font-size: 12px;
                        max-width: 400px;
                    `;
                    errorBox.textContent = '❌ ' + (data.error || 'Erreur lors de la suppression du royaume');
                    document.body.appendChild(errorBox);
                    setTimeout(() => errorBox.remove(), 5000);
                }
            } catch (error) {
                console.error('Erreur:', error);
                const errorBox = document.createElement('div');
                errorBox.className = 'error-message';
                errorBox.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 10001;
                    padding: 30px;
                    font-size: 12px;
                    max-width: 400px;
                `;
                errorBox.textContent = '❌ Erreur de connexion';
                document.body.appendChild(errorBox);
                setTimeout(() => errorBox.remove(), 5000);
            }
        };
        
        document.getElementById('delete-no2').onclick = () => {
            confirmBox2.remove();
        };
    };
    
    document.getElementById('delete-no1').onclick = () => {
        confirmBox1.remove();
    };
}

// Déconnexion
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

// ===== GESTION DES ANNONCES =====

// Créer une annonce (admin uniquement)
async function createAnnouncement(event) {
    event.preventDefault();
    
    if (currentUser !== ADMIN_USER) {
        showMessage('announcement-error', 'Seul l\'administrateur peut publier des annonces');
        return;
    }
    
    console.log('=== CRÉATION D\'UNE ANNONCE ===');
    
    const titleValue = document.getElementById('announcement-title').value;
    const contentValue = document.getElementById('announcement-content').value;
    const imageInput = document.getElementById('announcement-image');
    
    if (!titleValue || !contentValue) {
        showMessage('announcement-error', 'Veuillez remplir le titre et le contenu');
        return;
    }
    
    const formData = new FormData();
    formData.append('title', titleValue);
    formData.append('content', contentValue);
    formData.append('author', currentUser);
    
    if (imageInput.files && imageInput.files.length > 0) {
        const imageFile = imageInput.files[0];
        console.log('Fichier image sélectionné:', imageFile.name, imageFile.size, 'bytes', imageFile.type);
        formData.append('image', imageFile);
    }
    
    try {
        console.log('Envoi de la requête à :', `${API_URL}/announcements`);
        
        const response = await fetch(`${API_URL}/announcements`, {
            method: 'POST',
            body: formData
        });
        
        console.log('Statut de la réponse:', response.status);
        console.log('Content-Type:', response.headers.get('content-type'));
        
        // Vérifier le type de contenu de la réponse
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Réponse non-JSON reçue:', text.substring(0, 500));
            showMessage('announcement-error', 'Erreur serveur: le serveur a renvoyé une réponse invalide. Vérifiez la console pour plus de détails.');
            return;
        }
        
        const data = await response.json();
        console.log('Données reçues:', data);
        
        if (response.ok) {
            console.log('✅ Annonce créée avec succès');
            showMessage('announcement-success', 'Annonce publiée avec succès!', 'success');
            document.getElementById('announcement-error').style.display = 'none';
            setTimeout(() => {
                document.getElementById('announcement-form').reset();
                document.getElementById('announcement-success').style.display = 'none';
                loadAnnouncements();
            }, 2000);
        } else {
            console.error('❌ Erreur serveur:', data.error);
            showMessage('announcement-error', data.error || 'Erreur lors de la publication');
        }
    } catch (error) {
        console.error('❌ Erreur complète:', error);
        showMessage('announcement-error', 'Erreur de connexion au serveur: ' + error.message);
    }
}

// Charger toutes les annonces
async function loadAnnouncements() {
    try {
        const response = await fetch(`${API_URL}/announcements`);
        
        if (response.ok) {
            const announcements = await response.json();
            displayAnnouncements(announcements);
        } else {
            console.error('Erreur lors du chargement des annonces');
            document.getElementById('announcements-list').innerHTML = 
                '<div class="no-announcements pixel-border">Erreur lors du chargement des annonces</div>';
        }
    } catch (error) {
        console.error('Erreur:', error);
        document.getElementById('announcements-list').innerHTML = 
            '<div class="no-announcements pixel-border">Erreur de connexion au serveur</div>';
    }
}

// Afficher les annonces
function displayAnnouncements(announcements) {
    const container = document.getElementById('announcements-list');
    
    if (announcements.length === 0) {
        container.innerHTML = '<div class="no-announcements pixel-border">Aucune annonce pour le moment</div>';
        return;
    }
    
    // Trier par date (plus récent en premier)
    announcements.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    container.innerHTML = '';
    
    announcements.forEach(announcement => {
        const card = document.createElement('div');
        card.className = 'announcement-card pixel-border';
        
        const dateObj = new Date(announcement.created_at);
        const formattedDate = dateObj.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const imageHTML = announcement.image 
            ? `<img src="${announcement.image}" alt="Image annonce" class="announcement-image" onerror="this.style.display='none'">`
            : '';
        
        const deleteButton = currentUser === ADMIN_USER
            ? `<button class="btn-small pixel-border" style="background: #dc2626; border-color: #ef4444; margin-top: 15px;" onclick="deleteAnnouncement('${announcement.id}')">🗑️ Supprimer</button>`
            : '';
        
        card.innerHTML = `
            <div class="announcement-header">
                <h3>${announcement.title}</h3>
                <span class="announcement-date">📅 ${formattedDate}</span>
            </div>
            ${imageHTML}
            <div class="announcement-content">
                <p>${announcement.content.replace(/\n/g, '<br>')}</p>
            </div>
            <div class="announcement-footer">
                <span class="announcement-author">✏️ Par ${announcement.author}</span>
                ${deleteButton}
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Supprimer une annonce (admin uniquement)
async function deleteAnnouncement(announcementId) {
    if (currentUser !== ADMIN_USER) {
        const errorBox = document.createElement('div');
        errorBox.className = 'error-message';
        errorBox.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10001;
            padding: 30px;
            font-size: 12px;
        `;
        errorBox.textContent = '❌ Seul l\'administrateur peut supprimer des annonces';
        document.body.appendChild(errorBox);
        setTimeout(() => errorBox.remove(), 3000);
        return;
    }
    
    const confirmBox = document.createElement('div');
    confirmBox.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(45, 27, 78, 0.95);
        padding: 30px;
        border: 4px solid #8b5cf6;
        z-index: 10000;
        text-align: center;
        max-width: 400px;
    `;
    confirmBox.innerHTML = `
        <p style="margin-bottom: 20px; color: #e0d4ff;">Voulez-vous vraiment supprimer cette annonce ?</p>
        <button class="btn-small pixel-border" id="ann-yes" style="margin-right: 10px; background: #dc2626; border-color: #ef4444;">Oui</button>
        <button class="btn-small pixel-border" id="ann-no">Non</button>
    `;
    document.body.appendChild(confirmBox);
    
    document.getElementById('ann-yes').onclick = async () => {
        confirmBox.remove();
        
        try {
            const response = await fetch(`${API_URL}/announcements/${announcementId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                const successBox = document.createElement('div');
                successBox.className = 'success-message';
                successBox.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 10001;
                    padding: 30px;
                    font-size: 12px;
                `;
                successBox.textContent = '✅ Annonce supprimée';
                document.body.appendChild(successBox);
                setTimeout(() => {
                    successBox.remove();
                    loadAnnouncements();
                }, 2000);
            } else {
                const data = await response.json();
                const errorBox = document.createElement('div');
                errorBox.className = 'error-message';
                errorBox.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 10001;
                    padding: 30px;
                    font-size: 12px;
                `;
                errorBox.textContent = '❌ ' + (data.error || 'Erreur lors de la suppression');
                document.body.appendChild(errorBox);
                setTimeout(() => errorBox.remove(), 3000);
            }
        } catch (error) {
            console.error('Erreur:', error);
            const errorBox = document.createElement('div');
            errorBox.className = 'error-message';
            errorBox.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10001;
                padding: 30px;
                font-size: 12px;
            `;
            errorBox.textContent = '❌ Erreur de connexion au serveur';
            document.body.appendChild(errorBox);
            setTimeout(() => errorBox.remove(), 3000);
        }
    };
    
    document.getElementById('ann-no').onclick = () => {
        confirmBox.remove();
    };
}