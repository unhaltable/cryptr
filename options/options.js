var storage = chrome.storage.local;

var cipher = document.querySelector("#typevals");
$("#typevals").change(saveOptions);
var keep = document.querySelector("#keep");
$("#keep").change(saveOptions);

var arr = [];

loadSettings();

function loadSettings() {
  storage.get(['cipher', 'pass', 'keep'], function (items) {
    if (items['cipher']) {
      cipher.value = items['cipher'];
    }
    if (items['pass']) {
      arr = items['pass'];
      for (i = 0; i < arr.length; i++) {
        $("#saved").append("<li id='" + i + "'><span class='first'>" + arr[i][0] + "</span>" + arr[i][1]
                            + "<div class='del'></div></li>");
        $('#' + i + ' .del').click(function() {
          $(this).parent().css("display", "none");
          var pos = arr.indexOf(i);
          if (~arr) arr.splice(pos, 1);
          storage.set({'pass': arr});
        });
      }
    }
    if (items['keep']) {
      keep.checked = items['keep'];
    }
  });
}

function saveOptions() {
  storage.set({'cipher': cipher.value });
  storage.set({'keep': keep.checked });
}

$("#addpass").keydown(function (e) {
  if (e.which == 13) {
    $("#save").click();
    $("#name").focus();
  }
});

$("#save").click(function () {
  var name = $("#name").val();
  var pass = $("#pass").val();

  if (name == "" || pass == "") {
    alert('Please fill in both fields!');
    return;
  }

  arr.push([name, pass]);
  $("#saved").append("<li id='" + (arr.length - 1) + "'><span class='first'>" + name + "</span>"
                      + pass + "<div class='del'></div></li>");
  $('#' + (arr.length - 1) + ' .del').click(function() {
    $(this).parent().css("display", "none");
    var pos = arr.indexOf(i);
    if (~arr) arr.splice(pos, 1);
    storage.set({'pass': arr});
  });
  storage.set({'pass': arr});

  $("#name").val("");
  $("#pass").val("");
});