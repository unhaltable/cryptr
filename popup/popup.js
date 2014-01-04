/** Loaded file in object: { file: File, content: File content as ArrayBuffer } */
var loadedFile;
/** Local Chrome storage for settings and such. */
var storage = chrome.storage.local;


$(document).ready(function () {

  /**
   * Generates and returns a random password.
   * @return A password consisting of 20 random characters.
   */
  function randomPass() {
    var pass = "";

    for (i = 0; i < 20; i++)
      pass += String.fromCharCode(Math.floor(33 + 94 * Math.random()));

    return pass;
  }

  /**
   * Copies the text in the #text element into the clipboard.
   */
  function copyText() {
    document.getElementById("text").select();
    document.execCommand("Copy", false, null);
  }

  /**
   * Gets the cipher saved in the options.
   * @return A jQuery promise that's resolved with the cipher string.
   */
  function getCipher() {
    var d = $.Deferred();

    storage.get("cipher", function (items) {
      d.resolve(items.cipher || "AES");
    });

    return d.promise();
  }

  function uint8ArrayToString(uint8View) {
    return String.fromCharCode.apply(null, uint8View);
  }

  function stringToUint8Array(string) {
    var uint8View = new Uint8Array(string.length);
    for (var i = 0, strLen = string.length; i < strLen; i++) {
      uint8View[i] = string.charCodeAt(i);
    }
    return uint8View;
  }

  function wordArrayToArrayBuffer(wordArray) {
    // Create buffer
    var arrayBuffer = new ArrayBuffer(wordArray.sigBytes);
    var uint8View = new Uint8Array(arrayBuffer);

    // Copy data into buffer
    for (var i = 0; i < wordArray.sigBytes; i++) {
      uint8View[i] = (wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }

    return arrayBuffer;
  }

  /*
   * Encrypt an ArrayBuffer with the given cipher and passphrase
   *
   * @param cipher One of 'AES', 'DES', 'TripleDES', 'Rabbit', 'RC4', or 'RC4Drop'.
   * @param plaintextArrayBuffer The ArrayBuffer to be encrypted.
   * @param passphrase The string to use to encrypt the plaintext.
   * @return An ArrayBuffer of the encrypted data.
   */
  function encryptArrayBuffer(cipher, plaintextArrayBuffer, passphrase) {
    var plainWordArray = CryptoJS.lib.WordArray.create(new Uint8Array(plaintextArrayBuffer));
    var cipherParams = CryptoJS[cipher].encrypt(plainWordArray, passphrase);

    // Make an ArrayBuffer of the ciphertext
    var ciphertextArrayBuffer = new Uint8Array(wordArrayToArrayBuffer(cipherParams.ciphertext));

    // Goal: Put cipherParams.iv.toString() and cipherParams.salt.toString() into ciphertextArrayBuffer

    // Assuming iv size is always 32 bytes: 32 hex characters
    // Assuming salt size is always 16 bytes: 16 hex characters
    var ivSaltArrayBuffer = new Uint8Array(32 + 16);
    ivSaltArrayBuffer.set(stringToUint8Array(cipherParams.iv.toString()));
    ivSaltArrayBuffer.set(stringToUint8Array(cipherParams.salt.toString()), 32);

    // Concatenate the two ArrayBuffers, storing iv and salt in the last 32 + 16 = 48 bytes
    var arrayBuffer = new ArrayBuffer(ciphertextArrayBuffer.length + ivSaltArrayBuffer.length);
    var uint8View = new Uint8Array(arrayBuffer);
    uint8View.set(ciphertextArrayBuffer);
    uint8View.set(ivSaltArrayBuffer, ciphertextArrayBuffer.length);

    return arrayBuffer;
  }

  /*
   * Decrypt a ArrayBuffer with the given cipher and passphrase
   *
   * @param cipher one of 'AES', 'DES', 'TripleDES', 'Rabbit', 'RC4', or 'RC4Drop'
   * @param ciphertextArrayBuffer the ArrayBuffer to be decrypted
   * @param passphrase the string to use to decrypt the plaintext
   * @return a ArrayBuffer of the decrypted data
   */
  function decryptArrayBuffer(cipher, ciphertextArrayBuffer, passphrase) {
    // Assuming iv and salt are stored in the last 32 + 16 = 48 bytes
    var ciphertextView = new Uint8Array(ciphertextArrayBuffer, 0, ciphertextArrayBuffer.byteLength - 48);
    var ivView = new Uint8Array(ciphertextArrayBuffer, ciphertextArrayBuffer.byteLength - 48, 32);
    var saltView = new Uint8Array(ciphertextArrayBuffer, ciphertextArrayBuffer.byteLength - 48 + 32, 16);

    // Create the CipherParams
    var cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.lib.WordArray.create(ciphertextView),
      iv: CryptoJS.enc.Hex.parse(uint8ArrayToString(ivView)),
      salt: CryptoJS.enc.Hex.parse(uint8ArrayToString(saltView))
    });

    // Decrypt to get a wordArray of the plaintext
    var plainWordArray = CryptoJS[cipher].decrypt(cipherParams, passphrase);

    // Return an array buffer
    return wordArrayToArrayBuffer(plainWordArray);
  }

  function encryptString(cipher, plaintext, passphrase) {
    return CryptoJS[cipher].encrypt(plaintext, passphrase).toString();
  }

  function decryptString(cipher, ciphertext, passphrase) {
    return CryptoJS[cipher].decrypt(ciphertext, passphrase).toString(CryptoJS.enc.Utf8);
  }

  function encryptAndDownloadFile() {
    getCipher().done(function (cipher) {
      var ciphertext = encryptArrayBuffer(cipher, loadedFile.content, $("#passphrase").val());

      // TODO: Figure out a way to put the file metadata into the encrypted blob
      // var jsonString = JSON.stringify({
      //   name: loadedFile.file.name,
      //   type: loadedFile.file.type,
      //   data: ciphertext
      // });

      var blob = new Blob([ciphertext], { type: loadedFile.file.type });
      // call saveAs, part of FileSaver.js
      saveAs(blob, loadedFile.file.name + '.cryptr');
    });
  }

  function decryptAndDownloadFile() {
    getCipher().done(function (cipher) {
      var plaintext = decryptArrayBuffer(cipher, loadedFile.content, $("#passphrase").val());
      var blob = new Blob([plaintext], { type: loadedFile.file.type });
      var fileName = loadedFile.file.name.match(/^(?:(?!.cryptr).)*/g)[0];
      saveAs(blob, fileName);
    });
  }

  /**
   * Stores written text. Hides file dropzone if text entered.
   */
  $("#text").on("keyup change", function() {
    storage.set({ "text": $(this).val() });
    if ($(this).val().length > 0) {
      $("#dropzone").hide();
    } else {
      $("#dropzone").show();
    }
  });

  $("#encrypt").click(function() {
    if (loadedFile) {
      encryptAndDownloadFile(file);
    } else if ($("#text").val().length) {
      getCipher().done(function (cipher) {
        var ciphertext = encryptString(cipher, $("#text").val(), $("#passphrase").val());
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
      getCipher().done(function (cipher) {
        var plaintext = decryptString(cipher, $("#text").val(), $("#passphrase").val());
        $("#text").val(plaintext);
        copyText();
      });
    } else {
      alert("Please enter either text or a file.");
    }
  });

  $("#random").click(function() {
    $('#passphrase').val(randomPass());
    $("#passphrase").attr('type', 'text');
    $("#passphrase-visible").prop('checked', true);
  });

  $("#options").click(function() {
    chrome.tabs.create({ url: "options/options.html" });
  });

  $("#copy").click(function() {
    copyText();
  });

  $("#clear").click(function() {
    $("#dropzone").show();
    $("#text").val("");
    storage.remove('text');
    $("#dropzone").text("Drop a file or click here");
    loadedFile = null;
    $("body").removeClass("file");
  });

  $("#passphrase-visible").change(function () {
    if ($("#passphrase").attr('type') == 'text') {
      $("#passphrase").attr('type', 'password');
    } else {
      $("#passphrase").attr('type', 'text');
    }
  });

  // Store and load previous text
  storage.get("keep", function (items) {
    if (items.keep) {
      storage.get('text', function (item) {
        $("#text")
          .val(item.text)
          .select();
      });
    }
  });

  var fileReaderOptions = {
    dragClass: "drag",
    accept: false,
    readAsDefault: 'ArrayBuffer',
    on: {
      load: function(e, file) {
        // triggered each time the reading operation is successfully completed

        // 300 MiB
        var fileSizeLimit = 300 * Math.pow(2, 20);

        if ($("#text").val() != "") {
          // Text has been input; don't load the file
          return;
        }

        if (file.size < fileSizeLimit || (file.name.search(/^.*\.cryptr$/g) > -1 && file.size < fileSizeLimit)) {
          loadedFile = { file: file, content: e.target.result };

          // Set #dropzone text to display the file size
          var fileInfo = [
            escape(file.name), " - ",
            (file.size / 1000).toFixed(1), " KB"
          ].join('');
          $('#dropzone').html(fileInfo);

          // Hide elements related to text-only encryption
          $("body").addClass("file");
        } else {
          alert("Uploaded file is too large. Files must be less than 300 MB.");
        }
      }
    }
  };

  // Activate FileReader using the #file input element and body for drag-and-drop events
  $("#file, body").fileReaderJS(fileReaderOptions);

  // When the dropzone is clicked, click the file input element
  $("#dropzone").click(function() {
    $("#file").click();
  });

});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type == "selectionText") {
    $("#text").val(message.text);
  }
});
