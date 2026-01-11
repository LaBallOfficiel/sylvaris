const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Dossier uploads créé');
}

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://zwoddwbqeubntijdwtzi.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_0Okn-uWpAyzNq4QCc0PLOA_zeyTFFzR';
const supabase = createClient(supabaseUrl, supabaseKey);

// URL de base pour les fichiers uploadés
const BASE_URL = process.env.RENDER_EXTERNAL_URL || process.env.BASE_URL || `http://localhost:${PORT}`;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Configuration Multer pour les uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
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

// ========== ROUTES ==========

// Route de base
app.get('/', (req, res) => {
    res.send('Backend Sylvaris - Serveur en ligne ✅');
});

// Route de santé
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Vérifier si un utilisateur existe
app.get('/api/check-user/:username', async (req, res) => {
    const username = req.params.username;
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('username, has_password')
            .eq('username', username)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            throw error;
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

// Définir un mot de passe
app.post('/api/set-password', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Pseudo et mot de passe requis' });
    }
    
    try {
        const { data, error } = await supabase
            .from('users')
            .upsert({ 
                username, 
                password_hash: password,
                has_password: true,
                created_at: new Date().toISOString()
            }, { onConflict: 'username' })
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur set-password:', error);
        res.status(500).json({ error: 'Erreur lors de la création du mot de passe' });
    }
});

// Connexion avec mot de passe
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
        
        if (error || !data || data.password_hash !== password) {
            return res.status(401).json({ error: 'Mot de passe incorrect' });
        }
        
        res.json({ success: true, user: username });
    } catch (error) {
        console.error('Erreur login:', error);
        res.status(500).json({ error: 'Erreur de connexion' });
    }
});

// Créer un royaume
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
        // Vérifier si l'utilisateur a déjà un royaume
        const { data: existing } = await supabase
            .from('kingdoms')
            .select('id')
            .eq('owner', user)
            .single();
        
        if (existing) {
            return res.status(400).json({ error: 'Vous avez déjà un royaume' });
        }
        
        const logoUrl = `${BASE_URL}/uploads/${req.files.logo[0].filename}`;
        const bannerUrl = req.files.banner ? `${BASE_URL}/uploads/${req.files.banner[0].filename}` : null;
        
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
        
        if (error) throw error;
        
        console.log('✅ Royaume créé:', data.name);
        res.json({ success: true, kingdom: data });
    } catch (error) {
        console.error('Erreur création royaume:', error);
        res.status(500).json({ error: 'Erreur lors de la création du royaume' });
    }
});

// Récupérer tous les royaumes
app.get('/api/kingdoms', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('kingdoms')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.json(data || []);
    } catch (error) {
        console.error('Erreur récupération royaumes:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Récupérer un royaume par utilisateur
app.get('/api/kingdom/:user', async (req, res) => {
    const user = req.params.user;
    
    try {
        const { data, error } = await supabase
            .from('kingdoms')
            .select('*')
            .eq('owner', user)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            throw error;
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

// Modifier un royaume
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
            .single();
        
        if (fetchError || !kingdom) {
            return res.status(404).json({ error: 'Royaume non trouvé' });
        }
        
        const updates = {};
        if (name) updates.name = name;
        if (king) updates.king = king;
        if (currency) updates.currency = currency;
        
        if (req.files?.logo) {
            updates.logo = `${BASE_URL}/uploads/${req.files.logo[0].filename}`;
        }
        
        if (req.files?.banner) {
            updates.banner = `${BASE_URL}/uploads/${req.files.banner[0].filename}`;
        }
        
        const { data, error } = await supabase
            .from('kingdoms')
            .update(updates)
            .eq('owner', user)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, kingdom: data });
    } catch (error) {
        console.error('Erreur modification royaume:', error);
        res.status(500).json({ error: 'Erreur lors de la modification' });
    }
});

// Ajouter un résident
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
        
        if (error) throw error;
        
        res.json({ success: true, residents: data.residents });
    } catch (error) {
        console.error('Erreur ajout résident:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Supprimer un résident
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
        
        if (error) throw error;
        
        res.json({ success: true, residents: data.residents });
    } catch (error) {
        console.error('Erreur suppression résident:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Modifier les lois
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
        
        if (error) throw error;
        
        res.json({ success: true, laws: data.laws });
    } catch (error) {
        console.error('Erreur modification lois:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Supprimer un royaume
app.delete('/api/kingdom/:user', async (req, res) => {
    const user = req.params.user;
    
    try {
        const { error } = await supabase
            .from('kingdoms')
            .delete()
            .eq('owner', user);
        
        if (error) throw error;
        
        console.log('✅ Royaume supprimé pour:', user);
        res.json({ success: true, message: 'Royaume supprimé avec succès' });
    } catch (error) {
        console.error('Erreur suppression royaume:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// ===== ANNONCES =====

// Créer une annonce
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
        const imageUrl = req.file ? `${BASE_URL}/uploads/${req.file.filename}` : null;
        
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
        
        if (error) throw error;
        
        console.log('✅ Annonce créée');
        res.json({ success: true, announcement: data });
    } catch (error) {
        console.error('Erreur création annonce:', error);
        res.status(500).json({ error: 'Erreur lors de la publication' });
    }
});

// Récupérer toutes les annonces
app.get('/api/announcements', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.json(data || []);
    } catch (error) {
        console.error('Erreur récupération annonces:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Supprimer une annonce
app.delete('/api/announcements/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        console.log('✅ Annonce supprimée');
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur suppression annonce:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// Gestion des erreurs Multer
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Le fichier est trop volumineux (max 5MB)' });
        }
        return res.status(400).json({ error: 'Erreur lors de l\'upload du fichier' });
    } else if (error) {
        return res.status(400).json({ error: error.message });
    }
    next();
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🟣 Serveur Sylvaris lancé sur le port ${PORT}`);
    console.log(`🌐 URL de base: ${BASE_URL}`);
    console.log(`💾 Base de données: Supabase`);
    console.log(`📁 Dossier uploads: ${uploadsDir}`);
});