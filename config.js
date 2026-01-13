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
    
    API_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api'
        : 'https://sylvaris.onrender.com/api'
};

let currentUser = null;
let currentKingdom = null;
let loginStep = 'username';
let editMode = false;