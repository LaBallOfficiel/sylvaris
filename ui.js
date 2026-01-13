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

document.addEventListener('DOMContentLoaded', () => {
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

    populateResidentSelect();
});