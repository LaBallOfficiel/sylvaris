// URL de ton serveur
const API_URL = "https://sylvaris.onrender.com";

// -------------------- LOGIN --------------------
async function login() {
    const username = document.getElementById("pseudo").value;
    const password = document.getElementById("password").value; // si tu as un champ password

    if (!username || !password) {
        alert("Pseudo et mot de passe requis");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            document.getElementById("login").style.display = "none";
            document.getElementById("app").style.display = "block";
            console.log(`Connecté en tant que ${data.user}`);
        } else {
            alert(data.error || "Accès refusé");
        }
    } catch (err) {
        console.error(err);
        alert("Erreur serveur, réessayez plus tard");
    }
}

// -------------------- CRÉER ROYAUME --------------------
async function createKingdom() {
    const name = document.getElementById("kingdomName").value;
    const king = document.getElementById("kingName").value;
    const currency = document.getElementById("currency").value;
    const user = document.getElementById("pseudo").value;
    const logoFile = document.getElementById("logo").files[0];

    if (!name || !king || !currency || !user || !logoFile) {
        alert("Tous les champs sont requis !");
        return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("king", king);
    formData.append("currency", currency);
    formData.append("user", user);
    formData.append("logo", logoFile);

    try {
        const res = await fetch(`${API_URL}/api/kingdom`, {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        if (res.ok && data.success) {
            alert("Royaume créé !");
            console.log(data.kingdom);
        } else {
            alert(data.error || "Impossible de créer le royaume");
        }
    } catch (err) {
        console.error(err);
        alert("Erreur serveur, réessayez plus tard");
    }
}

// -------------------- LISTER ROYAUMES --------------------
async function listKingdoms() {
    try {
        const res = await fetch(`${API_URL}/api/kingdoms`);
        const kingdoms = await res.json();

        const container = document.getElementById("kingdomList");
        container.innerHTML = "";

        kingdoms.forEach(k => {
            const div = document.createElement("div");
            div.innerHTML = `
                <h3>${k.name} (${k.king})</h3>
                <img src="${k.logo}" width="100">
                <p>Devise: ${k.currency}</p>
                <p>Loi: ${k.laws || "Aucune"}</p>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}

// -------------------- AJOUTER RÉSIDENT --------------------
async function addResident(user) {
    const resident = prompt("Nom du résident à ajouter :");
    if (!resident) return;

    try {
        const res = await fetch(`${API_URL}/api/kingdom/${user}/residents`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resident })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            alert("Résident ajouté !");
            console.log(data.residents);
        } else {
            alert(data.error || "Erreur ajout résident");
        }
    } catch (err) {
        console.error(err);
    }
}

// -------------------- MODIFIER LOIS --------------------
async function updateLaws(user) {
    const laws = prompt("Nouvelle loi :");
    if (!laws) return;

    try {
        const res = await fetch(`${API_URL}/api/kingdom/${user}/laws`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ laws })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            alert("Loi mise à jour !");
            console.log(data.laws);
        } else {
            alert(data.error || "Erreur mise à jour lois");
        }
    } catch (err) {
        console.error(err);
    }
}
