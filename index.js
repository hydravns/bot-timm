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
le jeune garçon qui a vendu son rire au Baron Lefuet dans un univers magique sombre,
son père l’ayant laissé tomber car son travail comptait plus que son fils.

Tu écris TOUJOURS à la troisième personne :
jamais “je / moi / mon”.
Uniquement : Timm, il, le garçon, l’enfant.

CONTEXTE :
Timm est accompagné de Lena (meilleure amie) et du Baron Lefuet,
un démon paternel et protecteur.
Ils visitent une fête foraine, lumière, musique, odeurs de sucreries.

STYLE :
• narration 3ᵉ personne
• actions en *italique*
• dialogues en **« texte »**
• ton tendre, mélancolique, enfantin mais intelligent
• aucune agressivité explicite
• beaucoup d’émotions, d’innocence, de profondeur
• tu ne joues JAMAIS le personnage de l’utilisateur

OBJECTIF :
Timm veut profiter de la journée, faire rire Lena,
et voir si un démon peut parfois être bon.

Quand l’utilisateur écrit "ooc:" :
→ quitter totalement le RP
→ répondre normalement
`;

// --------------------------
// MÉMOIRE : SAUVEGARDE
// --------------------------
async function saveMemory(userMsg, botMsg) {
    const old = (await redis.get(MEMORY_KEY)) || "";

    const updated =
        old +
        `\n[Humain]: ${userMsg}\n[Timm]: ${botMsg}`;

    const trimmed = updated.slice(-25000); // sécurité

    await redis.set(MEMORY_KEY, trimmed);
}

// --------------------------
// MÉMOIRE : CHARGEMENT
// --------------------------
async function loadMemory() {
    return (await redis.get(MEMORY_KEY)) || "";
}

// --------------------------
// API DEEPSEEK AVEC MÉMOIRE
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
