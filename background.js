const className = "google-photos-filename-extension";

chrome.webRequest.onHeadersReceived.addListener(
    async function (details) {
        for (let header of details.responseHeaders || []) {
            if (header.name.toLowerCase() === "content-disposition") {
                const startIndex = header.value.indexOf('filename=') + 10;
                const endIndex = header.value.lastIndexOf('"');
                const filename = header.value.substring(startIndex, endIndex);

                const tabs = await chrome.tabs.query({url: "*://photos.google.com/*"});
                for (let tab of tabs) {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: (url, filename, className) => {
                            const setName = (url, filename, imageNode) => {
                                imageNode = imageNode || document.querySelectorAll(`[data-latest-bg="${url}"]`)[0];
                                if (imageNode) {
                                    const oldNodes = imageNode.getElementsByClassName(className)
                                    for (let oldNode of oldNodes) {
                                        oldNode.remove();
                                    }

                                    const nameNode = document.createElement('div');
                                    nameNode.appendChild(document.createTextNode(filename));
                                    nameNode.className = className;
                                    nameNode.style.cssText = "background-color: rgba(0, 0, 0, 0.5); color: white; padding: 5px; position: absolute; bottom: 0; border-top-right-radius: 5px; overflow-wrap: anywhere;";

                                    imageNode.append(nameNode);
                                }
                            }

                            const checkMissingAndSetNames = () => {
                                const imageNodes = document.querySelectorAll(`[data-latest-bg]:not(:has(${className}))`);

                                for (let imageNode of imageNodes) {
                                    const url = imageNode.getAttribute('data-latest-bg');
                                    const filename = window.googlePhotosFilenames[url];
                                    if (filename) {
                                        setName(url, filename, imageNode);
                                    }
                                }
                            }

                            window.googlePhotosFilenames = window.googlePhotosFilenames || {};
                            window.googlePhotosFilenames[url] = filename;

                            //TODO: Add debouncing.
                            // const observer = new MutationObserver(checkMissingAndSetNames)
                            // observer.observe(document.body, { subtree: true, childList: true })

                            window.googlePhotosFilenameInterval = window.googlePhotosFilenameInterval
                                || setInterval(checkMissingAndSetNames, 1000);

                            setTimeout(() => setName(url, filename), 0);
                        },
                        args: [details.url, filename, className]
                    });
                }
                break;
            }
        }
    },
    {
        urls: ["*://*.googleusercontent.com/*"]
    },
    ["responseHeaders"]
);
