async function createKingdom(event) {
    event.preventDefault();
    
    console.log('=== CRÉATION DU ROYAUME ===');
    
    const nameValue = document.getElementById('kingdom-name').value;
    const kingValue = document.getElementById('king-name').value;
    const currencyValue = document.getElementById('currency-type').value;
    const logoInput = document.getElementById('kingdom-logo');
    const bannerInput = document.getElementById('kingdom-banner');
    
    if (!nameValue || !kingValue || !currencyValue) {
        showMessage('create-error', 'Veuillez remplir tous les champs obligatoires');
        return;
    }
    
    if (!logoInput.files || logoInput.files.length === 0) {
        showMessage('create-error', 'Veuillez sélectionner un logo pour votre royaume');
        return;
    }
    
    const logoFile = logoInput.files[0];
    const formData = new FormData();
    formData.append('name', nameValue);
    formData.append('king', kingValue);
    formData.append('currency', currencyValue);
    formData.append('logo', logoFile);
    formData.append('user', currentUser);
    
    if (bannerInput.files && bannerInput.files.length > 0) {
        const bannerFile = bannerInput.files[0];
        formData.append('banner', bannerFile);
    }

    try {
        const response = await fetch(`${CONFIG.API_URL}/kingdom`, {
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

async function loadKingdom() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/kingdom/${encodeURIComponent(currentUser)}`);

        if (response.ok) {
            const kingdom = await response.json();
            currentKingdom = kingdom;
            displayKingdom(kingdom);
        } else {
            document.getElementById('kingdom-management').style.display = 'none';
        }
    } catch (error) {
        console.error('Erreur lors du chargement du royaume:', error);
    }
}

async function loadAllKingdoms() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/kingdoms`);

        if (response.ok) {
            const kingdoms = await response.json();
            displayAllKingdoms(kingdoms);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des royaumes:', error);
    }
}

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

function displayKingdom(kingdom) {
    document.getElementById('kingdom-management').style.display = 'block';
    
    const logoElement = document.getElementById('display-logo');
    if (kingdom.logo) {
        logoElement.src = kingdom.logo;
        logoElement.style.display = 'block';
        logoElement.onerror = function() {
            this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%238b5cf6' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='12' fill='white' text-anchor='middle' dominant-baseline='middle'%3ELogo%3C/svg%3E";
        };
    } else {
        logoElement.style.display = 'none';
    }
    
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
    
    if (kingdom.residents && Array.isArray(kingdom.residents)) {
        kingdom.residents.forEach(resident => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${resident}</span>
                <button class="remove-resident-btn" data-resident="${resident}">🗑️ Supprimer</button>
            `;
            
            const deleteBtn = li.querySelector('.remove-resident-btn');
            deleteBtn.addEventListener('click', function() {
                const residentToRemove = this.getAttribute('data-resident');
                removeResident(residentToRemove);
            });
            
            residentsList.appendChild(li);
        });
    }

    updateResidentSelect();
}

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
        const response = await fetch(`${CONFIG.API_URL}/kingdom/${encodeURIComponent(currentUser)}`, {
            method: 'PUT',
            body: formData
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Réponse non-JSON reçue:', text);
            showTemporaryMessage('Erreur serveur: réponse invalide', 'error', 5000);
            return;
        }

        if (response.ok) {
            showTemporaryMessage('Royaume modifié avec succès!', 'success', 2000);
            setTimeout(() => {
                toggleEditMode();
                loadKingdom();
            }, 2000);
        } else {
            const data = await response.json();
            showTemporaryMessage(data.error || 'Erreur lors de la modification du royaume', 'error', 5000);
        }
    } catch (error) {
        console.error('Erreur:', error);
        showTemporaryMessage('Erreur de connexion au serveur', 'error', 5000);
    }
}

async function deleteKingdom() {
    createConfirmBox(
        '⚠️ ATTENTION ! Êtes-vous sûr de vouloir supprimer définitivement votre royaume ?<br><br>Cette action est irréversible et supprimera :<br>- Le royaume<br>- Tous les résidents<br>- Toutes les lois<br>- Le logo et la bannière',
        () => {
            createConfirmBox(
                'Dernière confirmation : Voulez-vous vraiment supprimer votre royaume ?',
                async () => {
                    try {
                        const response = await fetch(`${CONFIG.API_URL}/kingdom/${encodeURIComponent(currentUser)}`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' }
                        });

                        if (response.ok) {
                            showTemporaryMessage('✅ Royaume supprimé avec succès', 'success', 2000);
                            setTimeout(() => {
                                currentKingdom = null;
                                document.getElementById('kingdom-management').style.display = 'none';
                                document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
                                document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
                                document.querySelector('[data-section="creer-royaume"]').classList.add('active');
                                document.getElementById('creer-royaume').classList.add('active');
                            }, 2000);
                        } else {
                            const data = await response.json();
                            showTemporaryMessage('❌ ' + (data.error || 'Erreur lors de la suppression du royaume'), 'error', 5000);
                        }
                    } catch (error) {
                        console.error('Erreur:', error);
                        showTemporaryMessage('❌ Erreur de connexion', 'error', 5000);
                    }
                }
            );
        }
    );
}