const express = require('express');
const { IgApiClient } = require('instagram-private-api');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let sessions = {}; 
let botConfig = {
    links: [],
    spamTexts: [],
    fncTexts: [],
    spamDelay: 30,
    ncDelay: 5,
    switchDelay: 5
};

let globalStats = {
    fncSent: 0,
    fncFailed: 0,
    spmSent: 0,
    spmFailed: 0
};

let botRunning = false;
let liveLogs = [];

function addLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    liveLogs.unshift(`[${timestamp}] ${message}`);
    if (liveLogs.length > 100) liveLogs.pop();
}

const dashboardHtml = (statusMsg = '') => `
<!DOCTYPE html>
<html>
<head>
    <title>𝙑𝙄𝘿𝙃𝘼𝙔𝘼𝙆 𝙑2 - Aesthetic Theme Panel</title>
    <style>
        body { 
            background: linear-gradient(rgba(13, 17, 23, 0.85), rgba(13, 17, 23, 0.85)), url('/background.jpg') no-repeat center center fixed;
            background-size: cover;
            color: #ff4757; 
            font-family: monospace; 
            padding: 20px; 
            margin: 0; 
        }
        .header { 
            text-align: center; 
            font-size: 16px; 
            font-weight: bold; 
            border: 2px solid #ff4757; 
            padding: 10px; 
            background: rgba(22, 27, 34, 0.9); 
            margin-bottom: 20px; 
            white-space: pre-wrap; 
            line-height: 1.4; 
            color: #ff6b81;
            box-shadow: 0 0 15px rgba(255, 71, 87, 0.3);
            border-radius: 6px;
        }
        .container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: rgba(17, 24, 39, 0.92); 
            backdrop-filter: blur(10px);
            border: 2px solid #ff4757; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 8px 25px rgba(0,0,0,0.8); 
        }
        .form-group { margin-bottom: 15px; }
        label { display: block; font-weight: bold; margin-bottom: 5px; color: #ff6b81; font-size: 13px; }
        input[type="text"], textarea { 
            width: 100%; background: #010409; color: #ff4757; 
            border: 1px solid #ff4757; padding: 10px; border-radius: 4px; 
            font-family: monospace; box-sizing: border-box; 
        }
        textarea { height: 65px; resize: vertical; }
        .row { display: flex; gap: 15px; }
        .col { flex: 1; }
        
        button { 
            background: #ff4757; color: #fff; border: none; padding: 12px 20px; 
            font-weight: bold; border-radius: 6px; cursor: pointer; width: 100%; 
            font-family: monospace; font-size: 14px; box-shadow: 0 4px #b3261e;
            transition: all 0.1s ease; margin-top: 5px;
        }
        button:active { transform: translateY(4px); box-shadow: 0 0 #b3261e; }
        .btn-stop { background: #d63031; box-shadow: 0 4px #8b0000; }
        .btn-fetch { background: #e84118; box-shadow: 0 4px #c23616; }

        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; font-weight: bold; font-size: 13px; }
        .stat-card { background: #010409; border: 1px dashed #ff4757; padding: 10px; text-align: center; border-radius: 4px; }
        .log-box { height: 200px; overflow-y: auto; background: #010409; border: 1px solid #ff4757; padding: 10px; font-size: 12px; margin-top: 15px; border-radius: 4px; white-space: pre-wrap; color: #00ff88; }
        .alert { background: rgba(232, 65, 24, 0.8); color: white; padding: 8px; margin-bottom: 15px; border-radius: 4px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">╭──────ᥫᩣ─────╮
                    ᥫᩣ𝑽𝒊𝒅𝒉𝒂𝒚𝒂𝒌🍂
╰──────ᥫᩣ─────╯</div>

        ${statusMsg ? `<div class="alert">${statusMsg}</div>` : ''}

        <form action="/connect" method="POST" class="form-group">
            <label>🌸 𝗔𝗰𝗰𝗼𝘂𝗻𝘁 - < paste your session id ></label>
            <div class="row">
                <div class="col"><input type="text" name="sessionid" placeholder="Paste sessionid cookie here" required></div>
                <div style="width: 130px;"><button type="submit">🌷 𝗖𝗼𝗻𝗻𝗲𝗰𝘁</button></div>
            </div>
        </form>

        <form action="/fetch_groups" method="POST" class="form-group">
            <button type="submit" class="btn-fetch">🏵️ 𝗙𝗲𝘁𝗰𝗵𝗚𝗿𝗼𝘂𝗽𝘀</button>
        </form>

        <form action="/start" method="POST">
            <div class="form-group">
                <label>💐 𝗟𝗶𝗻𝗸/𝘁𝗵𝗿𝗲𝗮𝗱𝘀 < paste your group links/threads per line, using comma ></label>
                <textarea name="links">${botConfig.links.join('\n')}</textarea>
            </div>

            <div class="form-group">
                <label>🌴 𝗧𝘅𝘁 - < paste your spam loopdata here ></label>
                <textarea name="spamTexts">${botConfig.spamTexts.join(', ')}</textarea>
            </div>

            <div class="form-group">
                <label>🌾 𝗙𝗻𝗰 - < Paste your group name changer loopdata ></label>
                <textarea name="fncTexts">${botConfig.fncTexts.join(', ')}</textarea>
            </div>

            <div class="row">
                <div class="col"><label>💮 𝗗𝗲𝗹𝗮𝘆 (Spam Sec)</label><input type="text" name="spamDelay" value="${botConfig.spamDelay}"></div>
                <div class="col"><label>⚡ Switch/NC Delay</label><input type="text" name="switchDelay" value="${botConfig.switchDelay}"></div>
            </div>

            <div class="row" style="margin-top: 15px;">
                <div class="col"><button type="submit">🍁 𝗦𝘁𝗮𝗿𝘁</button></div>
        </form>
                <div class="col">
                    <form action="/stop" method="POST"><button type="submit" class="btn-stop">🌻 𝗦𝘁𝗼𝗽</button></form>
                </div>
            </div>

        <div class="stats-grid">
            <div class="stat-card" style="color: #ff6b81;">🕷️ FNC-SENT [${globalStats.fncSent}]</div>
            <div class="stat-card" style="color: #ff4757;">🍃 FNC-FAILED [${globalStats.fncFailed}]</div>
            <div class="stat-card" style="color: #ffa502;">🌵 SPM SENT [${globalStats.spmSent}]</div>
            <div class="stat-card" style="color: #ff4757;">🍀 SPM FAILED [${globalStats.spmFailed}]</div>
        </div>

        <label style="margin-top: 15px;">🥀 𝗟𝗼𝗴 [ HERE YOU CAN SEE LOGS OF IDS ]</label>
        <div class="log-box">${liveLogs.join('\n')}</div>
    </div>
</body>
</html>
`;

// Static route to serve background image
app.get('/background.jpg', (req, res) => {
    res.sendFile(__dirname + '/22693.jpg');
});

app.get('/', (req, res) => res.send(dashboardHtml()));

app.post('/connect', async (req, res) => {
    const { sessionid } = req.body;
    try {
        const ig = new IgApiClient();
        ig.state.generateDevice('vidhayak_v2');
        await ig.state.deserializeCookie(sessionid);
        const user = await ig.user.info(ig.state.cookieUserId);
        sessions[user.username] = { igClient: ig };
        addLog(`✅ Connected: @${user.username}`);
        res.send(dashboardHtml(`Account @${user.username} connected successfully!`));
    } catch (e) {
        addLog(`❌ Connection Failed: ${e.message}`);
        res.send(dashboardHtml(`Connection Failed: Invalid Session ID.`));
    }
});

app.post('/fetch_groups', async (req, res) => {
    for (const [username, data] of Object.entries(sessions)) {
        try {
            const threads = await data.igClient.feed.directInbox().items();
            threads.forEach(t => { if (t.is_group) botConfig.links.push(t.thread_id); });
            addLog(`📁 Fetched groups for @${username}`);
        } catch (e) {
            addLog(`⚠ Fetch error for @${username}`);
        }
    }
    res.send(dashboardHtml("Groups fetched successfully!"));
});

app.post('/start', (req, res) => {
    const { links, spamTexts, fncTexts, spamDelay, switchDelay } = req.body;
    if (botRunning) return res.send(dashboardHtml("Bot already running!"));
    
    botConfig.links = links.split(/[\n,]+/).map(l => l.trim()).filter(Boolean);
    botConfig.spamTexts = spamTexts.split(',').map(t => t.trim()).filter(Boolean);
    botConfig.fncTexts = fncTexts.split(',').map(t => t.trim()).filter(Boolean);
    botConfig.spamDelay = parseInt(spamDelay) || 30;
    botConfig.switchDelay = parseInt(switchDelay) || 5;

    botRunning = true;
    addLog(`🚀 Bot started.`);
    
    for (const [username, data] of Object.entries(sessions)) {
        runBotWorker(username, data.igClient);
    }
    res.send(dashboardHtml("Bot started!"));
});

app.post('/stop', (req, res) => {
    botRunning = false;
    addLog(`🛑 Bot stopped.`);
    res.send(dashboardHtml("Bot stopped!"));
});

async function runBotWorker(username, ig) {
    let round = 0;
    while (botRunning) {
        round++;
        for (let i = 0; i < botConfig.links.length; i++) {
            if (!botRunning) break;
            const threadId = botConfig.links[i];

            if (botConfig.spamTexts.length > 0) {
                const text = botConfig.spamTexts[round % botConfig.spamTexts.length];
                try {
                    await ig.entity.directThread(threadId).broadcastText(text);
                    globalStats.spmSent++;
                    addLog(`🌵 [@${username}] SPM SENT → GC [${threadId}]`);
                } catch (e) {
                    globalStats.spmFailed++;
                    addLog(`🍀 [@${username}] SPM FAILED`);
                }
                await new Promise(r => setTimeout(r, botConfig.spamDelay * 1000));
            }

            if (botConfig.fncTexts.length > 0) {
                const newTitle = botConfig.fncTexts[round % botConfig.fncTexts.length];
                try {
                    await ig.directThread.updateTitle(threadId, newTitle);
                    globalStats.fncSent++;
                    addLog(`🕷️ [@${username}] FNC SENT → ${newTitle}`);
                } catch (e) {
                    globalStats.fncFailed++;
                    addLog(`🍃 [@${username}] FNC FAILED`);
                }
                await new Promise(r => setTimeout(r, botConfig.ncDelay * 1000));
            }

            await new Promise(r => setTimeout(r, botConfig.switchDelay * 1000));
        }
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Panel active on port ${PORT}`));
