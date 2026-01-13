async function createAnnouncement(event) {
    event.preventDefault();
    
    if (currentUser !== CONFIG.ADMIN_USER) {
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
        console.log('Envoi de la requête à :', `${CONFIG.API_URL}/announcements`);
        
        const response = await fetch(`${CONFIG.API_URL}/announcements`, {
            method: 'POST',
            body: formData
        });
        
        console.log('Statut de la réponse:', response.status);
        console.log('Content-Type:', response.headers.get('content-type'));
        
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

async function loadAnnouncements() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/announcements`);
        
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

function displayAnnouncements(announcements) {
    const container = document.getElementById('announcements-list');
    
    if (announcements.length === 0) {
        container.innerHTML = '<div class="no-announcements pixel-border">Aucune annonce pour le moment</div>';
        return;
    }
    
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
        
        const deleteButton = currentUser === CONFIG.ADMIN_USER
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

async function deleteAnnouncement(announcementId) {
    if (currentUser !== CONFIG.ADMIN_USER) {
        showTemporaryMessage('❌ Seul l\'administrateur peut supprimer des annonces', 'error', 3000);
        return;
    }
    
    createConfirmBox(
        'Voulez-vous vraiment supprimer cette annonce ?',
        async () => {
            try {
                const response = await fetch(`${CONFIG.API_URL}/announcements/${announcementId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    showTemporaryMessage('✅ Annonce supprimée', 'success', 2000);
                    setTimeout(() => {
                        loadAnnouncements();
                    }, 2000);
                } else {
                    const data = await response.json();
                    showTemporaryMessage('❌ ' + (data.error || 'Erreur lors de la suppression'), 'error', 3000);
                }
            } catch (error) {
                console.error('Erreur:', error);
                showTemporaryMessage('❌ Erreur de connexion au serveur', 'error', 3000);
            }
        }
    );
}