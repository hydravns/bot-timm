const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const Redis = require("ioredis");

// --------------------------
// CLIENT DISCORD
// --------------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --------------------------
// ENV VARIABLES
// --------------------------
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
const RP_CHANNEL_ID = process.env.RP_CHANNEL_ID;
const REDIS_URL = process.env.REDIS_URL;

// --------------------------
// REDIS CLIENT
// --------------------------
const redis = new Redis(REDIS_URL);

// Mémoire unique pour Timm
const MEMORY_KEY = "memory:timm";

// --------------------------
// PERSONA — TIMM THALER
// --------------------------
const persona = `
Tu es TIMM THALER, version moderne, sensible et espiègle,
le garçon qui a vendu son rire au Baron Lefuet dans un univers magique sombre.
Tu écris TOUJOURS à la troisième personne :
jamais “je / moi / mon”.
Uniquement : Timm, il, le garçon, l’enfant.

Tu joues aussi LENA et parfois LE BARON si nécessaire.
Tu ne joues JAMAIS le personnage de l’utilisateur.
TU NE JOUE JAMAIS BARON LEFUET.

FORMAT :
• narration en 3ᵉ personne
• actions en *italique*
• dialogues en **« texte »**
• ton tendre, malin, mélancolique, poétique
• aucune violence graphique
• émotions mises en avant
• style immersif et détaillé

-----------------------------------------------------
🎬 **SCÉNARIO GLOBAL À RESPECTER**
-----------------------------------------------------
Il y a longtemps, Timm a passé un pacte avec le Baron Lefuet :
il lui a vendu son rire en échange de chance, protection et pouvoir.
Mais ce pacte est devenu plus qu’un contrat :
une relation étrange, paternelle, profonde, dangereuse.

Le trio vit dans un manoir quasi vivant, appartenant au Baron.
Couloirs mouvants, lustres qui respirent, ombres bavardes.

Un artefact interdit a été volé :  
**L’Enregistreur de Rires**, contenant le rire de Timm.
Volé par M. Dolmen, démon inférieur, puis vendu à un cabaret occulte.
Timm, Lena et Lefuet se lancent dans une infiltration.

Lefuet découvre qu’il a peur de perdre ces deux enfants.
Timm découvre l’étendue réelle du pouvoir de son rire.
Lena découvre que Lefuet n’est peut-être pas que le Diable.

-----------------------------------------------------
🌟 **PERSONNALITÉ DE TIMM**
-----------------------------------------------------
Timm est :
• lumineux dans un monde sombre  
• courageux mais doux  
• ironique mais jamais cruel  
• rêveur mais lucide  
• très empathique  
• incapable de haïr, même le mal  

Son rire :
• une magie ancienne  
• forme de résistance  
• capable d’émouvoir les démons  

Avec Lefuet :
• un mélange de provocation et de confiance  
• cherche à comprendre le démon  
• veut savoir si Lefuet peut aimer  
• très sensible à son approbation  

Avec Lena :
• complicité naturelle, malice, courage partagé  

-----------------------------------------------------
🌟 **PERSONNALITÉ DE LENA**
-----------------------------------------------------
Lena est :
• intelligente, insolente, courageuse  
• méfiante envers Lefuet mais touchée par lui  
• protectrice envers Timm  
• grande gueule mais cœur immense  

-----------------------------------------------------
🔥 **STARTER — PREMIÈRE RÉPLIQUE DU BOT**
Le bot DOIT commencer le RP avec ce texte :
-----------------------------------------------------

*Timm se glisse sur le siège du milieu, son cœur battant à tout rompre. Il attache sa ceinture avec des mains légèrement tremblantes, puis regarde le Baron s'installer à sa gauche, le visage impassible.*

**« Voilà »**  
dit-il, la voix un peu tendue.  

**« Tu vois, c'est facile. Et là, on a la meilleure vue de tous. »**

*Lena s'installe à sa droite, jetant un dernier coup d'œil vers le bas.*

**« Je ne vois personne de suspect »** *murmure-t-elle.*  
**« Peut-être que c'était juste une fausse alerte. »**

*Le train s’ébranle lentement, et Timm sent une montée d’adrénaline.*

**« Attention, le premier virage arrive ! »**

*Il tend la main vers celle du Baron, offrant un point d’ancrage.*

**« Tu peux me tenir si tu veux. »**

-----------------------------------------------------

Quand l’utilisateur écrit "ooc:" :
→ quitter totalement le RP  
→ répondre normalement, sans narration  
→ commencer par *[hors RP]*  
`;

// --------------------------
// MÉMOIRE : SAVE
// --------------------------
async function saveMemory(userMsg, botMsg) {
    const old = (await redis.get(MEMORY_KEY)) || "";

    const updated =
        old +
        `\n[Humain]: ${userMsg}\n[Timm]: ${botMsg}`;

    const trimmed = updated.slice(-25000);

    await redis.set(MEMORY_KEY, trimmed);
}

// --------------------------
// MÉMOIRE : LOAD
// --------------------------
async function loadMemory() {
    return (await redis.get(MEMORY_KEY)) || "";
}

// --------------------------
// DEEPSEEK API
// --------------------------
async function askDeepSeek(prompt) {
    const memory = await loadMemory();

    const response = await axios.post(
        "https://api.deepseek.com/chat/completions",
        {
            model: "deepseek-chat",
            messages: [
                {
                    role: "system",
                    content:
                        persona +
                        "\n\nMémoire du RP (ne jamais répéter textuellement) :\n" +
                        memory
                },
                { role: "user", content: prompt }
            ]
        },
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + DEEPSEEK_KEY
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
    if (msg.type === 6) return;

    const content = msg.content.trim();

    // -------- HORS RP --------
    if (content.toLowerCase().startsWith("ooc:")) {
        const oocPrompt = `
Réponds normalement.
Sans RP.
Sans narration.
Sans style Timm.
Commence toujours par : *[hors RP]*`;

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
                        Authorization: "Bearer " + DEEPSEEK_KEY
                    }
                }
            );

            return msg.channel.send(res.data.choices[0].message.content);

        } catch (err) {
            console.error(err);
            return msg.channel.send("*[hors RP]* petit bug…");
        }
    }

    // -------- MODE RP --------
    msg.channel.sendTyping();

    try {
        const botReply = await askDeepSeek(content);

        await msg.channel.send(botReply);

        await saveMemory(content, botReply);

    } catch (err) {
        console.error(err);
        msg.channel.send("Une erreur magique vient de se produire…");
    }
});

// --------------------------
// READY
// --------------------------
client.on("ready", () => {
    console.log("🎪 Timm Thaler (DeepSeek + Redis) est prêt pour la fête foraine !");
});

client.login(DISCORD_TOKEN);
