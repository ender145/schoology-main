function searchMessage() {
  const searchTerm = $("#message-search-box").val();

  const url = '/messages/search?searchTerm=' + encodeURIComponent(searchTerm);
  window.location.href = url;
}

function closeSearch() {
  $("#message-search-box").val('');
  $('#message-search-close').hide();
  $('#message-search-close-placeholder').show();
}

function searchBoxKeyUp() {
  const searchTerm = $("#message-search-box").val();
  if (searchTerm.length > 0) {
    $('#message-search-close').show();
    $('#message-search-close-placeholder').hide();
  } else {
    $('#message-search-close').hide();
    $('#message-search-close-placeholder').show();
  }
  if(event.key === 'Enter') {
    searchMessage();
    return;
  }
}

// scroll to the actual thread
function scrollAndHighlightSearchedMessage() {
  var urlParams = new URLSearchParams(window.location.search);
  const scrollTo = urlParams.get('scrollTo');
  if (!scrollTo) { return; }
    $('html, body').animate({
      scrollTop: $("#" + scrollTo).offset().top,
    }, 0, function () {
      $("#" + scrollTo).animate({
        backgroundColor: '#f5f5f5'
      }, 200);
    });
}

// call the scrollAndHighlightSearchedMessage when dom is ready
$(function() {
  scrollAndHighlightSearchedMessage();
});
