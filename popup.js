var loadedFile; // loaded file in object: { file: File, content: File content }

$(document).ready(function () {

  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type == "selectionText") {
      $("#text").val(message.text);
    }
  });

  function randomPass() {
    var pass = "";
    for (i = 0; i < 20; i++) {
      var rand = Math.floor(33 + 94 * Math.random());
      pass += String.fromCharCode(rand);
    }
    return pass;
  }

  function copyText() {
    document.getElementById("text").select();
    document.execCommand("Copy", false, null);
  }

  /*
   * Encrypt or decrypt the specified string, using the cipher saved in the options.
   * Example: processData('encrypt', 'sometext')
   * @param string action Either 'encrypt' or 'decrypt'
   * @param string text The text to be encrypted or decrypted
   * @return A jQuery promise
   */
  function processData(action, text) {
    var d = $.Deferred();

    var cipher = "AES";
    chrome.storage.sync.get(['cipher'], function (items) {
      chrome.runtime.sendMessage({
        type: action,
        cipher: items['cipher'] || cipher,
        text: text,
        passphrase: $("#passphrase").val()
      }, function(response) {
        d.resolve(response);
      });
    });

    return d.promise();
  }

  function encryptAndDownloadFile() {
    var base64plaintext = window.btoa(loadedFile.content);
    processData('encrypt', base64plaintext).done(function (ciphertext) {
      var blob = new Blob([ciphertext]);
      // call saveAs, part of FileSaver.js
      saveAs(blob, loadedFile.file.name + '.cryptr');
    });
  }

  function decryptAndDownloadFile() {
    // decrypt base64-encoded string from loadedFile
    processData('decrypt', loadedFile.content).done(function (base64plaintext) {
      var decodedBinaryString = window.atob(base64plaintext);
      var arrayBuffer = new ArrayBuffer(decodedBinaryString.length);
      var arrayBufferView = new Uint8Array(arrayBuffer);
      for (var i = 0; i < decodedBinaryString.length; i++) {
        arrayBufferView[i] = decodedBinaryString.charCodeAt(i);
      }
      var blob = new Blob([arrayBuffer]);
      saveAs(blob, file.name);
    });
  }

  $("#encrypt").click(function() {
    if (loadedFile) {
      encryptAndDownloadFile(file);
    } else if ($("#text").val().length) {
      processData('encrypt', $("#text").val()).done(function (ciphertext) {
        $("#text").val(ciphertext);
        copyText();
      });
    } else {
      alert("Please enter either text or a file.");
    }
  });

  $("#decrypt").click(function() {
    if (loadedFile) {
      decryptAndDownloadFile(file);
    } else if ($("#text").val().length) {
      processData('encrypt', $("#text").val()).done(function (plaintext) {
        $("#text").val(plaintext);
        copyText();
      });
    } else {
      alert("Please enter either text or a file.");
    }
  });

  $("#random").click(function() {
    $('#passphrase').val(randomPass());
  });

  $("#options").click(function() {
    chrome.tabs.create({ url: "options.html" });
  });

  $("#copy").click(function() {
    copyText();
  });

  $("#clear").click(function() {
    $("#text").val("");
    chrome.storage.sync.remove('text');
  });

  // Store and load previous text
  chrome.storage.sync.get(['keep', 'text'], function (items) {
    if (items['keep']) {
      $("#text").change(function() {
        chrome.storage.sync.set({ 'text': $("#text").val() });
      });
      $("#text")
        .val(items['text'])
        .select();
    }
  });

  var fileReaderOptions = {
    dragClass: "drag",
    accept: false,
    readAsDefault: 'BinaryString',
    on: {
      load: function(e, file) {
        // triggered each time the reading operation is successfully completed
        loadedFile = { file: file, content: e.target.result };
        var fileInfo = [
          '<ul>',
          '<li><strong>', escape(file.name), '</strong> - ',
          file.size, ' bytes',
          '</li>',
          '</ul>'
        ].join('');
        $('#list').html(fileInfo);
      }
    }
  };

  $("#file, #dropzone").fileReaderJS(fileReaderOptions);
  $("#dropzone").click(function () {
    $("#file").click();
  });

});

