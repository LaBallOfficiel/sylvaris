function showMessage(elementId, message, type = 'error') {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    }
}

async function testAPIConnection() {
    try {
        const response = await fetch(`${CONFIG.API_URL.replace('/api', '')}/health`);
        if (response.ok) {
            console.log('✅ Connexion à l\'API réussie');
        } else {
            console.warn('⚠️ L\'API répond mais avec un statut:', response.status);
        }
    } catch (error) {
        console.error('❌ Impossible de se connecter à l\'API:', error);
        console.log('URL testée:', CONFIG.API_URL);
    }
}

function createConfirmBox(message, onConfirm, onCancel) {
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
        <p style="margin-bottom: 20px; color: #e0d4ff;">${message}</p>
        <button class="btn-small pixel-border" id="confirm-yes" style="margin-right: 10px;">Oui</button>
        <button class="btn-small pixel-border" id="confirm-no" style="background: #dc2626; border-color: #ef4444;">Non</button>
    `;
    document.body.appendChild(confirmBox);
    
    document.getElementById('confirm-yes').onclick = () => {
        confirmBox.remove();
        if (onConfirm) onConfirm();
    };
    
    document.getElementById('confirm-no').onclick = () => {
        confirmBox.remove();
        if (onCancel) onCancel();
    };
    
    return confirmBox;
}

function showTemporaryMessage(message, type = 'success', duration = 3000) {
    const msgBox = document.createElement('div');
    msgBox.className = type === 'success' ? 'success-message' : 'error-message';
    msgBox.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10001;
        padding: 30px;
        font-size: 12px;
        max-width: 400px;
        display: block;
    `;
    msgBox.textContent = message;
    document.body.appendChild(msgBox);
    
    setTimeout(() => msgBox.remove(), duration);
}