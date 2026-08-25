const { IgApiClient } = require('instagram-private-api');
const activeBots = {};

async function startBot(sessionId, texts, ncList, delaySeconds, logCallback) {
    if (activeBots[sessionId]) {
        logCallback(`[!] Bot already running for session.`);
        return;
    }

    const ig = new IgApiClient();
    try {
        await ig.state.deserialize(JSON.parse(sessionId));
        logCallback(`[+] Successfully authenticated session.`);
    } catch (e) {
        logCallback(`[!] Session format error or invalid session. Please check input.`);
        return;
    }

    let isRunning = true;
    activeBots[sessionId] = { stop: () => { isRunning = false; } };

    (async () => {
        let textIndex = 0;
        let ncIndex = 0;

        while (isRunning) {
            try {
                const inbox = ig.feed.directInbox();
                const threads = await inbox.items();
                const groupThreads = threads.filter(t => t.is_group);

                if (groupThreads.length === 0) {
                    logCallback(`[!] No group chats found for this account.`);
                    await new Promise(r => setTimeout(r, 10000));
                    continue;
                }

                const currentText = texts[textIndex % texts.length];
                const currentNC = ncList[ncIndex % ncList.length];
                textIndex++;
                ncIndex++;

                for (const thread of groupThreads) {
                    if (!isRunning) break;

                    try {
                        await ig.entity.threads([thread.thread_id]).updateTitle(currentNC);
                        logCallback(`[SUCCESS] GC Name updated to: "${currentNC}"`);

                        await ig.entity.threads([thread.thread_id]).broadcastText(currentText);
                        logCallback(`[SUCCESS] Message sent to GC (${thread.thread_title || thread.thread_id}): "${currentText}"`);

                        const randomJitter = Math.floor(Math.random() * 2000);
                        await new Promise(r => setTimeout(r, (delaySeconds * 1000) + randomJitter));
                    } catch (err) {
                        logCallback(`[ERROR] Rate limit or API restriction on thread: ${err.message}`);
                        await new Promise(r => setTimeout(r, 30000));
                    }
                }
            } catch (loopErr) {
                logCallback(`[CRITICAL ERROR] ${loopErr.message}`);
                await new Promise(r => setTimeout(r, 15000));
            }
        }
    })();
}

function stopBot(sessionId) {
    if (activeBots[sessionId]) {
        activeBots[sessionId].stop();
        delete activeBots[sessionId];
    }
}

module.exports = { startBot, stopBot, activeBots };
