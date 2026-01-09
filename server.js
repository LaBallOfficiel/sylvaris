const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Seules les images sont autorisées'));
        }
    }
});

const DB_FILE = './db.json';

function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = { users: {}, kingdoms: {} };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        return initialData;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Routes
app.get('/api/check-user/:username', (req, res) => {
    const username = req.params.username;
    const db = readDB();
    
    if (db.users[username]) {
        res.json({ exists: true, hasPassword: !!db.users[username].password });
    } else {
        res.json({ exists: false, hasPassword: false });
    }
});

app.post('/api/set-password', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Pseudo et mot de passe requis' });
    }
    
    const db = readDB();
    
    if (!db.users[username]) {
        db.users[username] = {};
    }
    
    db.users[username].password = hashPassword(password);
    db.users[username].createdAt = new Date().toISOString();
    
    writeDB(db);
    res.json({ success: true });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Pseudo et mot de passe requis' });
    }
    
    const db = readDB();
    const user = db.users[username];
    
    if (!user || user.password !== hashPassword(password)) {
        return res.status(401).json({ error: 'Mot de passe incorrect' });
    }
    
    res.json({ success: true, user: username });
});

app.post('/api/kingdom', upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), (req, res) => {
    const { name, king, currency, user } = req.body;
    
    if (!name || !king || !currency || !user) {
        return res.status(400).json({ error: 'Tous les champs sont requis' });
    }
    
    if (!req.files || !req.files.logo || !req.files.banner) {
        return res.status(400).json({ error: 'Logo et bannière requis' });
    }
    
    const db = readDB();
    
    if (db.kingdoms[user]) {
        return res.status(400).json({ error: 'Vous avez déjà un royaume' });
    }
    
    const logoUrl = `/uploads/${req.files.logo[0].filename}`;
    const bannerUrl = `/uploads/${req.files.banner[0].filename}`;
    
    db.kingdoms[user] = {
        name,
        king,
        currency,
        logo: `http://localhost:${PORT}${logoUrl}`,
        banner: `http://localhost:${PORT}${bannerUrl}`,
        residents: [],
        laws: '',
        createdAt: new Date().toISOString(),
        owner: user
    };
    
    writeDB(db);
    res.json({ success: true, kingdom: db.kingdoms[user] });
});

// Modifier un royaume
app.put('/api/kingdom/:user', upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), (req, res) => {
    const user = req.params.user;
    const { name, king, currency } = req.body;
    
    const db = readDB();
    const kingdom = db.kingdoms[user];
    
    if (!kingdom) {
        return res.status(404).json({ error: 'Royaume non trouvé' });
    }
    
    // Mettre à jour les informations
    if (name) kingdom.name = name;
    if (king) kingdom.king = king;
    if (currency) kingdom.currency = currency;
    
    // Mettre à jour le logo si fourni
    if (req.files && req.files.logo) {
        const logoUrl = `/uploads/${req.files.logo[0].filename}`;
        kingdom.logo = `http://localhost:${PORT}${logoUrl}`;
    }
    
    // Mettre à jour la bannière si fournie
    if (req.files && req.files.banner) {
        const bannerUrl = `/uploads/${req.files.banner[0].filename}`;
        kingdom.banner = `http://localhost:${PORT}${bannerUrl}`;
    }
    
    writeDB(db);
    res.json({ success: true, kingdom });
});

// Supprimer un royaume
app.delete('/api/kingdom/:user', (req, res) => {
    const user = req.params.user;
    const db = readDB();
    
    if (!db.kingdoms[user]) {
        return res.status(404).json({ error: 'Royaume non trouvé' });
    }
    
    // Supprimer le royaume
    delete db.kingdoms[user];
    writeDB(db);
    
    res.json({ success: true, message: 'Royaume supprimé avec succès' });
});

app.get('/api/kingdoms', (req, res) => {
    const db = readDB();
    const kingdoms = Object.values(db.kingdoms);
    res.json(kingdoms);
});

app.get('/api/kingdom/:user', (req, res) => {
    const user = req.params.user;
    const db = readDB();
    
    const kingdom = db.kingdoms[user];
    
    if (!kingdom) {
        return res.status(404).json({ error: 'Aucun royaume trouvé' });
    }
    
    res.json(kingdom);
});

app.post('/api/kingdom/:user/residents', (req, res) => {
    const user = req.params.user;
    const { resident } = req.body;
    
    if (!resident) {
        return res.status(400).json({ error: 'Nom du résident requis' });
    }
    
    const db = readDB();
    const kingdom = db.kingdoms[user];
    
    if (!kingdom) {
        return res.status(404).json({ error: 'Royaume non trouvé' });
    }
    
    if (!kingdom.residents.includes(resident)) {
        kingdom.residents.push(resident);
        writeDB(db);
    }
    
    res.json({ success: true, residents: kingdom.residents });
});

// Supprimer un résident
app.delete('/api/kingdom/:user/residents/:resident', (req, res) => {
    const user = req.params.user;
    const resident = req.params.resident;
    
    const db = readDB();
    const kingdom = db.kingdoms[user];
    
    if (!kingdom) {
        return res.status(404).json({ error: 'Royaume non trouvé' });
    }
    
    kingdom.residents = kingdom.residents.filter(r => r !== resident);
    writeDB(db);
    
    res.json({ success: true, residents: kingdom.residents });
});

app.put('/api/kingdom/:user/laws', (req, res) => {
    const user = req.params.user;
    const { laws } = req.body;
    
    const db = readDB();
    const kingdom = db.kingdoms[user];
    
    if (!kingdom) {
        return res.status(404).json({ error: 'Royaume non trouvé' });
    }
    
    kingdom.laws = laws;
    writeDB(db);
    
    res.json({ success: true, laws: kingdom.laws });
});

app.listen(PORT, () => {
    console.log(`🟣 Serveur Sylvaris lancé sur http://localhost:${PORT}`);
    console.log(`📁 Base de données: ${DB_FILE}`);
    console.log(`📸 Uploads: ./uploads/`);
});