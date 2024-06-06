let activeTabId = null;

// Listen for tab updates to clear old responses
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    chrome.storage.local.remove(`lastResponse_${tabId}`, () => {
      console.log("Cleared old response on tab update.");
    });
  }
});

// Listen for tab switches to update the active tab ID and clear old responses
chrome.tabs.onActivated.addListener((activeInfo) => {
  activeTabId = activeInfo.tabId;
  chrome.storage.local.get(`lastResponse_${activeTabId}`, (data) => {
    if (data[`lastResponse_${activeTabId}`]) {
      console.log("Restored response for tab switch.");
    }
  });
});

// Capture network responses and store them if they come from the active tab
chrome.webRequest.onCompleted.addListener(
  async (details) => {
    if (details.tabId === activeTabId && details.url.includes('1080/')) {
      fetch(details.url)
        .then(response => response.text())
        .then(text => {
          chrome.storage.local.set({ [`lastResponse_${activeTabId}`]: text }, () => {
            console.log("Captured response:", text);
            chrome.tabs.sendMessage(activeTabId, { action: "responseCaptured", text: text }, (response) => {
              if (chrome.runtime.lastError) {
                console.error(`Could not send message to tab: ${chrome.runtime.lastError.message}`);
              }
            });
          });
        })
        .catch(error => console.error("Failed to fetch response:", error));
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "download") {
      chrome.downloads.download(message.options, (downloadId) => {
          if (chrome.runtime.lastError) {
              console.error(`Error downloading file: ${chrome.runtime.lastError.message}`);
              sendResponse({ success: false });
          } else {
              console.log(`File downloaded with ID: ${downloadId}`);
              sendResponse({ success: true });
          }
      });
      return true;
  }
});
