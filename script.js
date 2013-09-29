function encrypt(cipher, plaintext, passphrase) {
  return CryptoJS[cipher].encrypt(plaintext, passphrase).toString();
}

function decrypt(cipher, ciphertext, passphrase) {
  return CryptoJS[cipher].decrypt(ciphertext, passphrase).toString(CryptoJS.enc.Utf8);
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type == "encrypt") {
    sendResponse(encrypt(message.cipher, message.text, message.passphrase));
  } else if (message.type == "decrypt") {
    sendResponse(decrypt(message.cipher, message.text, message.passphrase));
  } else if (message.type == "launchPopup") {
    launchPopup();
  }
});

function launchPopup(callback) {
  chrome.windows.getCurrent(function (currentWindow) {
    // var width = screen.width / 2 - 310 / 2;
    var width = screen.width - 350;
    var height = screen.height / 2 - 440 / 2;
    chrome.windows.create({
      url: chrome.extension.getURL('popup.html'),
      type: 'popup',
      top: height,
      left: width,
      width: 310,
      height: 440
    }, callback);
  });
}

function menuItemClicked(info, tab) {
  launchPopup(function (newWindow) {
    // called once newWindow is created
    setTimeout(function () {
      chrome.tabs.sendMessage(newWindow.tabs[0].id, {
        type: "selectionText",
        text: info.selectionText || info.linkUrl
      });
    }, 200);
  });
}

// Create the context menu item
chrome.contextMenus.create({
  title: "Encrypt/Decrypt with Cryptr",
  contexts: ["selection", "link", "editable"],
  onclick: menuItemClicked
});

// Launch popup when browser action is clicked
chrome.browserAction.onClicked.addListener(function () {
  launchPopup();
});

// Close the popup window if another Chrome window gains focus
chrome.windows.onFocusChanged.addListener(function (newWindowId) {
  chrome.windows.getAll({
    populate: true
  }, function (windows) {
    for (var i = 0; i < windows.length; i++) {
      // If the Cryptr popup is not focused...
      if (!windows[i].focused && windows[i].type == "popup" && windows[i].tabs[0].url == chrome.extension.getURL('popup.html')) {
        for (var j = 0; j < windows.length; j++) {
          // If another normal window is focused
          if (windows[j].focused && windows[j].type == "normal") {
            // close the Cryptr window
            chrome.windows.remove(windows[i].id);
          }
        }
      }
    }
  });
});