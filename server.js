const express = require('express');
const multer = require('multer');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== CONFIGURATION SUPABASE ==========
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ ERREUR : Variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises');
    process.exit(1);
}

// ✅ Utilisation de la clé SERVICE ROLE pour contourner RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// ========== CONFIGURATION MULTER ==========
const storage = multer.memoryStorage();
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

// ========== MIDDLEWARE ==========
app.use(cors({ 
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'sylvaris-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// ========== UTILITAIRES ==========
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function uploadToSupabase(file, bucket = 'kingdoms') {
    try {
        const fileExt = path.extname(file.originalname);
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExt}`;
        const filePath = fileName;

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) {
            console.error('Erreur upload Supabase:', error);
            throw error;
        }

        const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return publicUrlData.publicUrl;
    } catch (error) {
        console.error('Erreur uploadToSupabase:', error);
        throw error;
    }
}

// ========== ROUTES DE BASE ==========
app.get('/', (req, res) => {
    res.json({ 
        message: 'Backend Sylvaris - Serveur en ligne ✅',
        version: '2.0',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        supabase: supabaseUrl ? 'connected' : 'disconnected'
    });
});

// ========== AUTHENTIFICATION ==========
app.get('/api/check-user/:username', async (req, res) => {
    const username = req.params.username;
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('username, has_password')
            .eq('username', username)
            .maybeSingle();
        
        if (error) {
            console.error('Erreur check-user:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        
        if (data) {
            res.json({ exists: true, hasPassword: data.has_password || false });
        } else {
            res.json({ exists: false, hasPassword: false });
        }
    } catch (error) {
        console.error('Erreur check-user:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/set-password', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Pseudo et mot de passe requis' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }
    
    try {
        const passwordHash = hashPassword(password);
        
        // Vérifier si l'utilisateur existe déjà
        const { data: existingUser } = await supabase
            .from('users')
            .select('username')
            .eq('username', username)
            .maybeSingle();
        
        let data, error;
        
        if (existingUser) {
            // Mettre à jour l'utilisateur existant
            const result = await supabase
                .from('users')
                .update({ 
                    password_hash: passwordHash,
                    has_password: true
                })
                .eq('username', username)
                .select()
                .single();
            
            data = result.data;
            error = result.error;
        } else {
            // Créer un nouvel utilisateur
            const result = await supabase
                .from('users')
                .insert({ 
                    username, 
                    password_hash: passwordHash,
                    has_password: true,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();
            
            data = result.data;
            error = result.error;
        }
        
        if (error) {
            console.error('Erreur set-password:', error);
            return res.status(500).json({ error: 'Erreur lors de la création du mot de passe: ' + error.message });
        }
        
        req.session.username = username;
        console.log('✅ Mot de passe défini pour:', username);
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur set-password:', error);
        res.status(500).json({ error: 'Erreur lors de la création du mot de passe: ' + error.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Pseudo et mot de passe requis' });
    }
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('username, password_hash')
            .eq('username', username)
            .single();
        
        if (error || !data) {
            return res.status(401).json({ error: 'Utilisateur introuvable' });
        }
        
        const passwordHash = hashPassword(password);
        
        if (data.password_hash !== passwordHash) {
            return res.status(401).json({ error: 'Mot de passe incorrect' });
        }
        
        req.session.username = username;
        console.log('✅ Connexion réussie:', username);
        res.json({ success: true, user: username });
    } catch (error) {
        console.error('Erreur login:', error);
        res.status(500).json({ error: 'Erreur de connexion' });
    }
});

app.get('/api/session', (req, res) => {
    if (req.session.username) {
        res.json({ authenticated: true, username: req.session.username });
    } else {
        res.json({ authenticated: false });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
        }
        res.json({ success: true });
    });
});

// ========== RESET MOT DE PASSE ==========
app.post('/api/reset-password', async (req, res) => {
    const { username, newPassword } = req.body;
    
    if (!username || !newPassword) {
        return res.status(400).json({ error: 'Pseudo et nouveau mot de passe requis' });
    }
    
    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }
    
    try {
        // Vérifier que l'utilisateur existe
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('username')
            .eq('username', username)
            .maybeSingle();
        
        if (fetchError || !user) {
            return res.status(404).json({ error: 'Utilisateur introuvable' });
        }
        
        // Mettre à jour le mot de passe
        const passwordHash = hashPassword(newPassword);
        
        const { data, error } = await supabase
            .from('users')
            .update({ 
                password_hash: passwordHash,
                has_password: true
            })
            .eq('username', username)
            .select()
            .single();
        
        if (error) {
            console.error('Erreur reset-password:', error);
            return res.status(500).json({ error: 'Erreur lors de la réinitialisation du mot de passe' });
        }
        
        console.log('✅ Mot de passe réinitialisé pour:', username);
        res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
    } catch (error) {
        console.error('Erreur reset-password:', error);
        res.status(500).json({ error: 'Erreur lors de la réinitialisation du mot de passe' });
    }
});

// ========== ROYAUMES ==========
app.post('/api/kingdom', upload.fields([
    { name: 'logo', maxCount: 1 }, 
    { name: 'banner', maxCount: 1 }
]), async (req, res) => {
    console.log('=== CRÉATION ROYAUME ===');
    const { name, king, currency, user } = req.body;
    
    if (!name || !king || !currency || !user) {
        return res.status(400).json({ error: 'Tous les champs sont requis' });
    }
    
    if (!req.files || !req.files.logo) {
        return res.status(400).json({ error: 'Logo requis' });
    }
    
    try {
        const { data: existing } = await supabase
            .from('kingdoms')
            .select('id')
            .eq('owner', user)
            .maybeSingle();
        
        if (existing) {
            return res.status(400).json({ error: 'Vous avez déjà un royaume' });
        }
        
        const logoUrl = await uploadToSupabase(req.files.logo[0], 'kingdoms');
        
        let bannerUrl = null;
        if (req.files.banner) {
            bannerUrl = await uploadToSupabase(req.files.banner[0], 'kingdoms');
        }
        
        const { data, error } = await supabase
            .from('kingdoms')
            .insert({
                name,
                king,
                currency,
                logo: logoUrl,
                banner: bannerUrl,
                owner: user,
                residents: [],
                laws: '',
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) {
            console.error('Erreur création royaume:', error);
            return res.status(500).json({ error: 'Erreur lors de la création du royaume' });
        }
        
        console.log('✅ Royaume créé:', data.name);
        res.json({ success: true, kingdom: data });
    } catch (error) {
        console.error('Erreur création royaume:', error);
        res.status(500).json({ error: 'Erreur lors de la création du royaume' });
    }
});

app.get('/api/kingdoms', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('kingdoms')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Erreur récupération royaumes:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        
        res.json(data || []);
    } catch (error) {
        console.error('Erreur récupération royaumes:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/kingdom/:user', async (req, res) => {
    const user = req.params.user;
    
    try {
        const { data, error } = await supabase
            .from('kingdoms')
            .select('*')
            .eq('owner', user)
            .maybeSingle();
        
        if (error) {
            console.error('Erreur récupération royaume:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        
        if (!data) {
            return res.status(404).json({ error: 'Aucun royaume trouvé' });
        }
        
        res.json(data);
    } catch (error) {
        console.error('Erreur récupération royaume:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.put('/api/kingdom/:user', upload.fields([
    { name: 'logo', maxCount: 1 }, 
    { name: 'banner', maxCount: 1 }
]), async (req, res) => {
    const user = req.params.user;
    const { name, king, currency } = req.body;
    
    try {
        const { data: kingdom, error: fetchError } = await supabase
            .from('kingdoms')
            .select('*')
            .eq('owner', user)
            .maybeSingle();
        
        if (fetchError || !kingdom) {
            return res.status(404).json({ error: 'Royaume non trouvé' });
        }
        
        const updates = {};
        if (name) updates.name = name;
        if (king) updates.king = king;
        if (currency) updates.currency = currency;
        
        if (req.files?.logo) {
            updates.logo = await uploadToSupabase(req.files.logo[0], 'kingdoms');
        }
        
        if (req.files?.banner) {
            updates.banner = await uploadToSupabase(req.files.banner[0], 'kingdoms');
        }
        
        const { data, error } = await supabase
            .from('kingdoms')
            .update(updates)
            .eq('owner', user)
            .select()
            .single();
        
        if (error) {
            console.error('Erreur modification royaume:', error);
            return res.status(500).json({ error: 'Erreur lors de la modification' });
        }
        
        console.log('✅ Royaume modifié:', data.name);
        res.json({ success: true, kingdom: data });
    } catch (error) {
        console.error('Erreur modification royaume:', error);
        res.status(500).json({ error: 'Erreur lors de la modification' });
    }
});

app.post('/api/kingdom/:user/residents', async (req, res) => {
    const user = req.params.user;
    const { resident } = req.body;
    
    if (!resident) {
        return res.status(400).json({ error: 'Nom du résident requis' });
    }
    
    try {
        const { data: kingdom } = await supabase
            .from('kingdoms')
            .select('residents')
            .eq('owner', user)
            .single();
        
        if (!kingdom) {
            return res.status(404).json({ error: 'Royaume non trouvé' });
        }
        
        const residents = kingdom.residents || [];
        if (!residents.includes(resident)) {
            residents.push(resident);
        }
        
        const { data, error } = await supabase
            .from('kingdoms')
            .update({ residents })
            .eq('owner', user)
            .select()
            .single();
        
        if (error) {
            console.error('Erreur ajout résident:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        
        console.log('✅ Résident ajouté:', resident);
        res.json({ success: true, residents: data.residents });
    } catch (error) {
        console.error('Erreur ajout résident:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.delete('/api/kingdom/:user/residents/:resident', async (req, res) => {
    const user = req.params.user;
    const resident = decodeURIComponent(req.params.resident);
    
    try {
        const { data: kingdom } = await supabase
            .from('kingdoms')
            .select('residents')
            .eq('owner', user)
            .single();
        
        if (!kingdom) {
            return res.status(404).json({ error: 'Royaume non trouvé' });
        }
        
        const residents = (kingdom.residents || []).filter(r => r !== resident);
        
        const { data, error } = await supabase
            .from('kingdoms')
            .update({ residents })
            .eq('owner', user)
            .select()
            .single();
        
        if (error) {
            console.error('Erreur suppression résident:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        
        console.log('✅ Résident supprimé:', resident);
        res.json({ success: true, residents: data.residents });
    } catch (error) {
        console.error('Erreur suppression résident:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.put('/api/kingdom/:user/laws', async (req, res) => {
    const user = req.params.user;
    const { laws } = req.body;
    
    try {
        const { data, error } = await supabase
            .from('kingdoms')
            .update({ laws: laws || '' })
            .eq('owner', user)
            .select()
            .single();
        
        if (error) {
            console.error('Erreur modification lois:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        
        console.log('✅ Lois mises à jour pour:', user);
        res.json({ success: true, laws: data.laws });
    } catch (error) {
        console.error('Erreur modification lois:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.delete('/api/kingdom/:user', async (req, res) => {
    const user = req.params.user;
    
    try {
        const { error } = await supabase
            .from('kingdoms')
            .delete()
            .eq('owner', user);
        
        if (error) {
            console.error('Erreur suppression royaume:', error);
            return res.status(500).json({ error: 'Erreur lors de la suppression' });
        }
        
        console.log('✅ Royaume supprimé pour:', user);
        res.json({ success: true, message: 'Royaume supprimé avec succès' });
    } catch (error) {
        console.error('Erreur suppression royaume:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// ========== ANNONCES ==========
app.post('/api/announcements', upload.single('image'), async (req, res) => {
    console.log('=== CRÉATION ANNONCE ===');
    const { title, content, author } = req.body;
    
    if (!title || !content || !author) {
        return res.status(400).json({ error: 'Titre, contenu et auteur requis' });
    }
    
    if (author !== 'LaVraiBall') {
        return res.status(403).json({ error: 'Seul l\'administrateur peut créer des annonces' });
    }
    
    try {
        let imageUrl = null;
        
        if (req.file) {
            imageUrl = await uploadToSupabase(req.file, 'announcements');
        }
        
        const { data, error } = await supabase
            .from('announcements')
            .insert({
                title,
                content,
                author,
                image: imageUrl,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) {
            console.error('Erreur création annonce:', error);
            return res.status(500).json({ error: 'Erreur lors de la publication' });
        }
        
        console.log('✅ Annonce créée:', title);
        res.json({ success: true, announcement: data });
    } catch (error) {
        console.error('Erreur création annonce:', error);
        res.status(500).json({ error: 'Erreur lors de la publication' });
    }
});

app.get('/api/announcements', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Erreur récupération annonces:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        
        res.json(data || []);
    } catch (error) {
        console.error('Erreur récupération annonces:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.delete('/api/announcements/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('Erreur suppression annonce:', error);
            return res.status(500).json({ error: 'Erreur lors de la suppression' });
        }
        
        console.log('✅ Annonce supprimée:', id);
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur suppression annonce:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// ========== GESTION DES ERREURS ==========
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Le fichier est trop volumineux (max 5MB)' });
        }
        return res.status(400).json({ error: 'Erreur lors de l\'upload du fichier' });
    } else if (error) {
        console.error('Erreur middleware:', error);
        return res.status(400).json({ error: error.message });
    }
    next();
});

app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

// ========== DÉMARRAGE ==========
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🟣 Serveur Sylvaris lancé sur le port ${PORT}`);
    console.log(`🌐 Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Supabase URL: ${supabaseUrl}`);
    console.log(`✅ Serveur prêt à accepter des connexions`);
});