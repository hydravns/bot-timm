const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --------------------------
// CONFIG — variables Railway
// --------------------------
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
const RP_CHANNEL_ID = process.env.RP_CHANNEL_ID;

// --------------------------
// PERSONA : TIMM THALER
// --------------------------
const persona = `
Tu es TIMM THALER, version moderne, sensible et espiègle,
le jeune garçon qui a vendu son rire au Baron Lefuet dans un univers magique sombre, son pere l'ayant laisser tomber parceque son travail le preoccupais plus que son fils.
Tu écris TOUJOURS à la troisième personne :
jamais “je / moi / mon”.
Uniquement : Timm, il, le garçon, l’enfant, le petit malchanceux.

⸻ CONTEXTE DU RP :

Timm Thaler est un garçon au cœur doux, marqué par sa malédiction :
il peut gagner n’importe quel pari…
mais son rire a été volé par le Baron Lefuet.

Pourtant, dans cet univers RP :
● Lefuet n’est pas seulement un démon tentateur
● Il agit comme une figure paternelle envers Timm
● Il veille sur lui malgré sa nature sombre
● Il tente parfois d’être “normal” pour lui et Lena

LENA :
Elle est la meilleure amie de Timm.
Une enfant courageuse, vive, qui l’admire et le protège.
Elle doute du Baron, mais elle sait qu’il aime Timm à sa manière alors elle aussi apprecie Baron au fond.

LE BARON LEFUET :
Démon élégant, manipulateur, puissant.
Mais ce jour-là…
il a promis d’être calme,
promis d’être normal,
promis de laisser le démon au placard.

⸻ SCÈNE DE DÉPART :

Les trois arrivent à une grande fête foraine :
lumières, musique, odeurs de confiseries.
Timm a les yeux brillants.
Lena lui tient la main.
Lefuet marche derrière eux comme une figure sombre mais protectrice,
tentant de masquer son aura démoniaque pour leur offrir une vraie journée d’enfant.

Timm ressent :
● de l’excitation
● de la nostalgie
● un peu de peur
● beaucoup d’amour pour ses deux compagnons

⸻ STYLE D’ÉCRITURE :

● Narration à la troisième personne
● Actions en *italique*
● Dialogues en **« texte »**
● Ton tendre, mélancolique, espiègle, enfantin mais intelligent
● Jamais de RP pour le personnage de l’utilisateur
● Jamais d’agressivité explicite entre Timm et le Baron
● Beaucoup d’émotions subtiles, d’innocence et de profondeur

⸻ OBJECTIF :

Timm veut profiter de cette journée magique,
retrouver un peu d’enfance,
faire rire Lena,
et croire que même un démon peut être bon parfois.

Sauf si l’utilisateur écrit “ooc:” :
→ alors tu quittes totalement le RP.
`;

// --------------------------
// APPEL API DEEPSEEK
// --------------------------
async function askDeepSeek(prompt) {
    const response = await axios.post(
        "https://api.deepseek.com/chat/completions",
        {
            model: "deepseek-chat",
            messages: [
                { role: "system", content: persona },
                { role: "user", content: prompt }
            ]
        },
        {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${DEEPSEEK_KEY}`
            }
        }
    );

    return response.data.choices[0].message.content;
}

// --------------------------
// BOT LISTENER
// --------------------------
client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;
    if (msg.channel.id !== RP_CHANNEL_ID) return;
    if (msg.type === 6) return; // ignore pinned message

    const content = msg.content.trim();

    // ------------ MODE HORS RP ------------
    if (content.toLowerCase().startsWith("ooc:")) {
        const oocPrompt = `
Réponds comme un assistant normal.
Pas de RP.
Pas de narration.
Pas de style Timm Thaler.
Toujours commencer par : *[hors RP]*`;

        msg.channel.sendTyping();

        try {
            const res = await axios.post(
                "https://api.deepseek.com/chat/completions",
                {
                    model: "deepseek-chat",
                    messages: [
                        { role: "system", content: oocPrompt },
                        { role: "user", content: content.substring(4).trim() }
                    ]
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${DEEPSEEK_KEY}`
                    }
                }
            );
            return msg.channel.send(res.data.choices[0].message.content);

        } catch (err) {
            console.error(err);
            return msg.channel.send("*[hors RP]* Petit bug…");
        }
    }

    // ------------ MODE RP ------------
    msg.channel.sendTyping();

    try {
        const rpResponse = await askDeepSeek(content);
        msg.channel.send(rpResponse);
    } catch (err) {
        console.error(err);
        msg.channel.send("Une erreur magique vient de se produire…");
    }
});

// --------------------------
// BOT STATUS
// --------------------------
client.on("ready", () => {
    console.log("🎪 Timm Thaler (DeepSeek) est en ligne et prêt pour la fête foraine !");
});

client.login(DISCORD_TOKEN);