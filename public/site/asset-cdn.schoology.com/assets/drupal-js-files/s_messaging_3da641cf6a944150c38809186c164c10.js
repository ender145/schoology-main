Drupal.behaviors.sMessaging = function( context ) {

  $("form#privatemsg-list:not(.sMessagingProcessed)",context).addClass("sMessagingProcessed").each(function(){
    sMessagingEnableHeaderButtons();
    $('.privatemsg-list tr').each(function(){
    	var msgRow = $(this);
    	if(!msgRow.hasClass('no-messages-tr')){
	    	msgRow.click(function(e){
	            var bodyTarget = $(e.target);
	            if(!bodyTarget.is(".form-checkbox")){
	            	document.location.href = $('.subject-link', this).attr('href');
	            }
	    	});
    	}
    });
  });

  $("form#privatemsg-new:not(.sMessagingProcessed), form#s-messaging-compose-enrollment-form:not(.sMessagingProcessed)",context).addClass("sMessagingProcessed").each(function(){
    var newMessageForm = $(this);

    $("textarea#edit-body", newMessageForm).elastic().css('min-height','95px');
    // elastic messes with the textarea's height so we need to resize the popup
    if(newMessageForm.closest('.popups-body').length){
      sPopupsResizeCenter();
    }

    $(document).on('popups_open_path',function(e, element){
      if(!$(element).is(":button") && !($(element).attr('id') === 'New Message'))
        return;

      var otherForms = $('form#privatemsg-new');

      if(otherForms.length == 0)
        return;

      otherForms.remove();

      $(document).on('popups_open_path_done', function(e, element, href, popup) {
        var activePopup = $('#' + popup.id);
        var popupEditId = '';
        if(activePopup.hasClass('popups-section')) {
          popupEditId = popup.id;

          $(document).on('popups_before_remove',function(e, popup){
            if(popupEditId == popup.id) {
              window.location.reload();
            }
          });
        }
      });
    });

    var containerObj = $('.sUserAutocompleteMain', newMessageForm);
    var inputObj = $('input.ac_input', containerObj);

    // If there is no input object (predefined because it is single person send) do not need autocomplete
    if(inputObj.length < 1){
      return;
    }

    if(typeof Drupal.settings.s_messaging != 'undefined' && typeof Drupal.settings.s_messaging.parent_list != 'undefined'){
      var parentList = Drupal.settings.s_messaging.parent_list;
      $(document).unbind('sUserAutocomplete_beforeuseradd.sMessaging')
        .bind('sUserAutocomplete_beforeuseradd.sMessaging', function(event, user, recipients){
          if(typeof parentList[user.u] != 'undefined'){
            user.userlink_class = 'user-is-parent';
          }
        });
    }

    inputObj.sUserAutocomplete({
      userlist: '/messages/ajax/userlist',
      max_users: 0,
      helper_text: '',
      autocomplete_opts: {
        minChars: Drupal.settings.s_messaging.min_query_length,
        width: 0, // zero to override the defaults in suserautocomplete and use dynamically generated width
        height: 600,
        delay: 500,
        scroll: true,
        anchorTo: containerObj
      }
    });

    containerObj.click(function(){
      inputObj.focus();
    });

    //namespaced bind

    $(document).unbind('sUserAutocomplete_onuseradd.sMessaging');
    $(document).bind('sUserAutocomplete_onuseradd.sMessaging', function(event, userLink , uid){
      $('div#vals', newMessageForm).append('<input type="hidden" id="recipient-'+String(uid)+'" name="ids[]" value="'+String(uid)+'" />');
      sPopupsResizeCenter();
    });
    $(document).unbind('sUserAutocomplete_onuserremove.sMessaging');
    $(document).bind('sUserAutocomplete_onuserremove.sMessaging', function(event, userLink, uid){
      $('#recipient-'+String(uid), newMessageForm).remove();
      sPopupsResizeCenter();
    });

    sMessagingEnableHeaderButtons();

    // disable submit button on send
    newMessageForm.bind('submit', function(){
      $("#edit-submit", newMessageForm).attr('disabled', 'disabled');
    });

    $(".attachments-video .attachments-video-thumbnails-play" , newMessageForm).click(function(){
      var wrapper = $(this).parents('.attachments-video');

      $('.video-video', wrapper).show();
      $(this).hide();
      $('.attachments-video-thumbnails', wrapper).hide();
      wrapper.addClass('video-expanded');
      return false;
    });
  });

  $('.s-js-messaging-tag-list:not(.sMessagingProcessed)', context).addClass('sMessagingProcessed').each(function(){
    var tagListObj = $(this);
    $('.s-js-tag-delete', tagListObj).click(function(e){
      e.preventDefault();
      var tagId = $(this).data('tag-id');
      if(tagId){
        $(this).closest('.s-js-messaging-tag-list-item').remove();
        $.ajaxSecure({
          url : '/messages/tag/delete/' + tagId
        });
      }
    });
  });
}


function sMessagingEnableHeaderButtons() {

    var checkedCount = 0;
    var cbCount = 0;
    $('.privatemsg-list .form-checkbox:not(.msg-selector)').each(function(){
      $(this).click(function(){
        if($(this).is(':checked')){
          checkedCount += 1;
        }
        else{
          checkedCount -= 1;
        }
        if(checkedCount > 0){
          $('#more-actions-checkbox').addClass('display-taw');
        }
        else{
          $('#more-actions-checkbox').removeClass('display-taw');
        }
      });
      cbCount++;
    });

    // Select All button
    $('.msg-selector').click(function(){
	    var checkboxes = $(".privatemsg-list .form-checkbox:not(.msg-selector)");
	    if($(this).is(':checked')){
	      checkboxes.each(function(){
	    	  if(!$(this).is(':checked')){
		    	 $(this).click();
	    	  }
		  });
	      checkedCount = cbCount;
	    }
	    else{
	      checkboxes.each(function(){
	    	 if($(this).is(':checked')){
	    	    $(this).click();
	    	 }
	      });
	      checkedCount = 0;
	    }
	    if(checkedCount > 0){
	      $('#more-actions-checkbox').addClass('display-taw');
	    }
	    else{
	      $('#more-actions-checkbox').removeClass('display-taw');
	    }
    });

  $("#privatemsg-list #edit-more-actions-1-wrapper select").change(function() {
    var val = $(this).val();



    if(val != 'Select...') {
      switch( val ) {
       case 'All':
          $(".privatemsg-list tbody input.form-checkbox").each(function(){
            $(this).prop('checked', false);
          });
        break;
        case 'Read':
          $(".privatemsg-list tbody input.form-checkbox").each(function() {
            var objClass = $(this).parent().parent().parent().parent().attr('class');
            var spliced = objClass.split(' ');
            var read = spliced[0] != "privatemsg-unread";
            $(this).prop('checked', read ? true : false );
          });
        break;
        case 'Unread':
          $(".privatemsg-list tbody input.form-checkbox").each(function() {
            var objClass = $(this).parent().parent().parent().parent().attr('class');
            var spliced = objClass.split(" ");
            var read = spliced[0] == "privatemsg-unread";
            $(this).prop('checked', read ? true : false );
          });
        break;
      }
    }
    else if(val == 'Select...') {
      $(".privatemsg-list tbody input.form-checkbox").each(function(){
        $(this).prop('checked', false);
      });
    }

    return false;
  });

  sMessagingEnableHeaderDeleteBtn();
  sMessagingEnableHeaderMarkReadBtn();
  sMessagingEnableHeaderMarkUnreadBtn();
}

function sMessagingEnableHeaderDeleteBtn() {
  $("#edit-delete-submit").hide();

  $("#more-actions a#delete").click(function(){
    $("#edit-mark-delete-submit").click();
    return false;
  });

  return false;
}

function sMessagingEnableHeaderMarkReadBtn() {
  $("#edit-mark-read-submit").hide();
  $("#more-actions a#mark_read").click(function(){
    $("#edit-mark-read-submit").click();
    return false;
  });
}

function sMessagingEnableHeaderMarkUnreadBtn() {
  $("#edit-mark-new-submit").hide();
  $("#more-actions a#mark_new").click(function(){
    $("#edit-mark-new-submit").click();
    return false;
  });
}

function sMessagingDeleteCallback( data , options, element  ) {
  if (!$(element).hasClass('delete2-btn')) {
    var unreadCount = $('.unread-count', data.content).html();
    $('.unread-messages .notifier').html(unreadCount);
    return;
  }
  let dest = '/messages';
  const searchTerm = new URLSearchParams(window.location.search).get('searchTerm');
  if (searchTerm) {
    const page = parseInt(new URLSearchParams(window.location.search).get('page')) || 0;
    dest = '/messages/search?searchTerm=' + encodeURIComponent(searchTerm) + '&page='+page;
  }
  window.location.href = dest;
}

/**
 * Submits a form POST request to the undo action URL with CSRF protection.
 * This function creates a hidden form with CSRF tokens and submits it via JavaScript,
 * allowing the browser to handle the redirect naturally while maintaining CSRF protection.
 * 
 * This approach ensures that:
 * 1. CSRF tokens are included in the request
 * 2. The browser follows the server's redirect naturally
 * 3. Drupal messages are displayed correctly on the destination page
 * 
 * @param {string} destination - The destination parameter to redirect to after the undo action
 */
function sMessagingUndoAction(destination) {
  // Create a hidden form with CSRF protection
  var form = $('<form>', {
    method: 'POST',
    action: '/messages/undo/action',
    style: 'display: none;'
  });
  
  // Add the destination parameter if provided
  if (destination) {
    form.append($('<input>', {
      type: 'hidden',
      name: 'destination',
      value: destination
    }));
  }
  
  // Get CSRF token and add it to the form
  // Use s_common CSRF settings for form-based CSRF protection
  if (typeof Drupal !== 'undefined' && Drupal.settings && Drupal.settings.s_common) {
    var csrfToken = Drupal.settings.s_common.csrf_token;
    var csrfKey = Drupal.settings.s_common.csrf_key;
    
    if (csrfToken && csrfKey) {
      // Add CSRF key as a hidden field
      form.append($('<input>', {
        type: 'hidden',
        name: 'csrf-key',
        value: csrfKey
      }));
      // Add CSRF token as a hidden field
      form.append($('<input>', {
        type: 'hidden',
        name: 'csrf-token',
        value: csrfToken
      }));
    }
  }
  
  // Append form to body, submit it, then remove it
  $('body').append(form);
  form.submit();
  form.remove();
  
  return false;
}
