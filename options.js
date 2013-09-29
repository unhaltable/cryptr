var storage = chrome.storage.sync;

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

$("#save").click(function() {
  var name = $("#name").val();
  var pass = $("#pass").val();

  if (name == "" || pass == "") {
    alert('Please fill in the fields!');
    return;
  }

  arr.push([name, pass]);
  $("#saved").append("<li><span class='first'>" + name + "</span>" + pass + "</li>");
  storage.set({'pass': arr});

  $("#name").val("");
  $("#pass").val("");
});