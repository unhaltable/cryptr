var loadedFile; // loaded file in object: { file: File, content: File content }
var storage = chrome.storage.local;

$(document).ready(function () {

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

  /**
   * Encrypt or decrypt the specified string, using the cipher saved in the options.
   * Example: processData('encrypt', 'sometext')
   * @param string action Either 'encrypt' or 'decrypt'
   * @param string text The text to be encrypted or decrypted
   * @return A jQuery promise
   */
  function processData(action, text) {
    var d = $.Deferred();

    var cipher = "AES";
    storage.get(['cipher'], function (items) {
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
    processData('encrypt', loadedFile.content).done(function (ciphertext) {
      var jsonString = JSON.stringify({
        name: loadedFile.file.name,
        type: loadedFile.file.type,
        text: ciphertext
      });
      var blob = new Blob([jsonString]);
      // call saveAs, part of FileSaver.js
      saveAs(blob, loadedFile.file.name + '.cryptr');
    });
  }

  function decryptAndDownloadFile() {
    var fileInfo = JSON.parse(loadedFile.content);
    processData('decrypt', fileInfo.text).done(function (plaintext) {
      var arrayBuffer = new ArrayBuffer(plaintext.length);
      var arrayBufferView = new Uint8Array(arrayBuffer);
      for (var i = 0; i < plaintext.length; i++) {
        arrayBufferView[i] = plaintext.charCodeAt(i);
      }
      var blob = new Blob([arrayBuffer], { type: fileInfo.type });
      saveAs(blob, fileInfo.name);
    });
  }

  $("#text").on('keyup change', function() {
    storage.set({ 'text': $(this).val() });
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
      processData('decrypt', $("#text").val()).done(function (plaintext) {
        $("#text").val(plaintext);
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
  storage.get('keep', function (items) {
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
    readAsDefault: 'BinaryString',
    on: {
      load: function(e, file) {
        // triggered each time the reading operation is successfully completed
        if ($("#text").val() != "") { return; }
        if (file.size < Math.pow(1024, 2) || (file.name.search(/^.*\.cryptr$/g) > -1 && file.size < 2 * Math.pow(1024, 2))) {
          loadedFile = { file: file, content: e.target.result };
          var fileInfo = [
            escape(file.name), ' - ',
            (file.size / 1000).toFixed(1), ' KB'
          ].join('');
          $('#dropzone').html(fileInfo);
          $('body').addClass('file');
        } else {
          alert("Uploaded file is too large. Files must be less than 1 MB.");
        }
      }
    }
  };

  $("#file, body, .lightbox, .lightbox-faded").fileReaderJS(fileReaderOptions);
  $("#dropzone").click(function () {
    $("#file").click();
  });

});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type == "selectionText") {
    $("#text").val(message.text);
  }
});