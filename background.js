// Service worker. Its jobs:
//  1. create the offscreen document (the only place that can keep audio playing)
//  2. read chrome.storage (offscreen documents have NO access to chrome.storage)
//  3. relay messages between the popup and the offscreen document
//
// NOTE: chrome.tabCapture.getMediaStreamId() only works for a tab the user has
// just "invoked" the extension on (opening the popup counts). That is why the
// popup requests the stream id, not this worker.

let creatingOffscreen = null;

async function ensureOffscreenDocument() {
  if (await chrome.offscreen.hasDocument()) return;
  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen
      .createDocument({
        url: 'offscreen.html',
        reasons: ['USER_MEDIA'],
        justification: 'Process captured tab audio with the Web Audio API.'
      })
      .finally(() => { creatingOffscreen = null; });
  }
  await creatingOffscreen;
}

function toOffscreen(message) {
  return chrome.runtime.sendMessage({ target: 'offscreen', ...message });
}

async function getAudiogram() {
  const { leftEar, rightEar, strength } = await chrome.storage.local.get(['leftEar', 'rightEar', 'strength']);
  return { leftEar, rightEar, strength: (strength ?? 75) / 100 };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'background') return; // ignore everything not meant for us

  (async () => {
    switch (message.type) {
      case 'START_CAPTURE': {
        await ensureOffscreenDocument();
        const audiogram = await getAudiogram();
        return await toOffscreen({
          type: 'START_AUDIO',
          tabId: message.tabId,
          streamId: message.streamId,
          ...audiogram
        });
      }
      case 'STOP_CAPTURE': {
        if (!(await chrome.offscreen.hasDocument())) return { ok: true };
        return await toOffscreen({ type: 'STOP_AUDIO', tabId: message.tabId });
      }
      case 'GET_STATUS': {
        if (!(await chrome.offscreen.hasDocument())) return { active: false };
        return await toOffscreen({ type: 'GET_STATUS', tabId: message.tabId });
      }
    }
  })()
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));

  return true; // keep the channel open for the async response
});

// Push saved audiogram changes to any running audio sessions.
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local' || !(changes.leftEar || changes.rightEar || changes.strength)) return;
  if (!(await chrome.offscreen.hasDocument())) return;
  const audiogram = await getAudiogram();
  toOffscreen({ type: 'AUDIOGRAM_UPDATED', ...audiogram }).catch(() => {});
});

// Release the capture when its tab closes.
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (!(await chrome.offscreen.hasDocument())) return;
  toOffscreen({ type: 'STOP_AUDIO', tabId }).catch(() => {});
});
