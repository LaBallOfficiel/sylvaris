function populateResidentSelect() {
    const select = document.getElementById('new-resident');
    if (!select) return;
    
    select.innerHTML = '<option value="">Sélectionne un joueur...</option>';
    
    CONFIG.AUTHORIZED_USERS.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        select.appendChild(option);
    });
}

function updateResidentSelect() {
    const select = document.getElementById('new-resident');
    if (!select) return;
    
    select.innerHTML = '<option value="">Sélectionne un joueur...</option>';
    
    CONFIG.AUTHORIZED_USERS.forEach(user => {
        if (currentKingdom && currentKingdom.residents && !currentKingdom.residents.includes(user)) {
            const option = document.createElement('option');
            option.value = user;
            option.textContent = user;
            select.appendChild(option);
        }
    });
}

async function addResident() {
    const residentName = document.getElementById('new-resident').value;
    if (!residentName) {
        showTemporaryMessage('Veuillez sélectionner un joueur', 'error', 3000);
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_URL}/kingdom/${encodeURIComponent(currentUser)}/residents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resident: residentName })
        });

        if (response.ok) {
            document.getElementById('new-resident').value = '';
            loadKingdom();
        } else {
            const data = await response.json();
            showTemporaryMessage(data.error || 'Erreur lors de l\'ajout du résident', 'error', 3000);
        }
    } catch (error) {
        console.error('Erreur:', error);
        showTemporaryMessage('Erreur de connexion au serveur', 'error', 3000);
    }
}

async function removeResident(residentName) {
    createConfirmBox(
        `Voulez-vous vraiment retirer ${residentName} du royaume ?`,
        async () => {
            try {
                const response = await fetch(`${CONFIG.API_URL}/kingdom/${encodeURIComponent(currentUser)}/residents/${encodeURIComponent(residentName)}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    showTemporaryMessage(`${residentName} a été retiré du royaume`, 'success', 2000);
                    setTimeout(() => {
                        loadKingdom();
                    }, 2000);
                } else {
                    const data = await response.json();
                    showTemporaryMessage(data.error || 'Erreur lors de la suppression du résident', 'error', 3000);
                }
            } catch (error) {
                console.error('Erreur:', error);
                showTemporaryMessage('Erreur de connexion au serveur', 'error', 3000);
            }
        }
    );
}

async function saveLaws() {
    const laws = document.getElementById('kingdom-laws').value;

    try {
        const response = await fetch(`${CONFIG.API_URL}/kingdom/${encodeURIComponent(currentUser)}/laws`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ laws })
        });

        if (response.ok) {
            showTemporaryMessage('Lois sauvegardées avec succès!', 'success', 2000);
            setTimeout(() => {
                loadKingdom();
            }, 2000);
        } else {
            const data = await response.json();
            showTemporaryMessage(data.error || 'Erreur lors de la sauvegarde des lois', 'error', 3000);
        }
    } catch (error) {
        console.error('Erreur:', error);
        showTemporaryMessage('Erreur de connexion au serveur', 'error', 3000);
    }
}