let lastseg = "";
let intervalId;
let segCount = 0;

if (!document.getElementById('response')) {
    const res = document.createElement('p');
    res.id = 'response';
    res.textContent = '';
    res.style.position = 'fixed';
    res.style.bottom = '0';
    res.style.left = '0';
    res.style.margin = '0';
    res.style.zIndex = '9998';
    document.body.insertBefore(res, document.body.firstChild);
}

const responseE = document.getElementById('response');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "responseCaptured") {
        let animeName = 'unk';
        animeName = document.title.replace(/\s+/g, '_'); // Replace spaces with underscores
        responseE.textContent = animeName;
        addDownloadBTN(message.text, animeName);
    }
});

function addDownloadBTN(text, animeName) {
    if (!document.getElementById('download')) {
        const downloadButton = document.createElement('button');
        downloadButton.id = 'download';
        downloadButton.textContent = 'Download';
        downloadButton.style.position = 'fixed';
        downloadButton.style.bottom = '20px';
        downloadButton.style.left = '0';
        downloadButton.style.margin = '0';
        downloadButton.style.zIndex = '9999';
        downloadButton.addEventListener('click', async () => {
            document.getElementById('response').textContent = 'Downloading...';
            try {
                const segmentUrls = await parseM3U8(text);
                const concatenatedBlob = await concatenateSegments(segmentUrls);
                await downloadBlob(concatenatedBlob, `${animeName}.mp4`);
                document.getElementById('download').textContent = 'Download';
            } catch (error) {
                responseE.textContent = `Download failed: ${error.message}`;
            }
        });
        document.body.insertBefore(downloadButton, responseE);
    }
}

// Function to parse the M3U8 file
async function parseM3U8(m3u8Content) {
    segCount = 0;
    const lines = m3u8Content.split('\n').filter(line => line && !line.startsWith('#')).slice(0, -1);
    let lastLine = lines[lines.length - 1];
    lastseg = lastLine.split('/').slice(-1)[0].slice(5, -5);
    return lines;
}

// Function to fetch a segment as a Blob with retries
async function fetchSegment(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            responseE.textContent = segCount + "/" + lastseg;
            segCount += 1;
            return await response.blob();
        } catch (error) {
            console.error(`Failed to fetch segment ${url}: ${error.message}`);
            if (i < retries - 1) {
                console.log(`Retrying... (${i + 1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
            } else {
                throw error;
            }
        }
    }
}

async function concatenateSegments(segmentUrls) {
    const blobs = await Promise.all(segmentUrls.map(fetchSegment));
    return new Blob(blobs, { type: 'video/webp' });
}

async function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const options = {
        url: url,
        filename: filename,
        conflictAction: 'overwrite',
        saveAs: true
    };
    chrome.runtime.sendMessage({ action: "download", options: options }, (response) => {
        if (response.success) {
            responseE.textContent = "Download successful!";
        } else {
            responseE.textContent = "Download failed!";
        }
    });
}
