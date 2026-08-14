Drupal.Ajax.plugins.s_event = function(hook, args) {
  var activePop = Popups.activePopup();
  
  // No active popup, return
  if(activePop == null){
    return;
  }
  activePop = $('#' + activePop.id);
  var bodyWrapper = $('.popups-body', activePop);
  
  
  /**
   * Action for submitting the form
   */
  switch (hook) {
  case 'submit':
    sTinymce.updateRichtextContent(bodyWrapper);
    $('.messages-wrapper', bodyWrapper).remove();
    /*
     * disable form
     */
    $("form", bodyWrapper).addClass("active-loading");  
    $('#edit-submit', activePop).attr('disabled', 'disabled');
    sPopupsToggleAjaxOverlay();
    sPopupsResizeCenter();
    break;

  /**
   * Action for message received (validate or submit)
   */
  case 'message':
    // Successful submit
    if(args.hasOwnProperty('ajax_submit_output')){

      // update calendar
      if($('#fcalendar').length) {
        var realmInfo = sFCalendarGetRealmPath();
        sFCalendarUpdateEvents($.parseJSON(args.ajax_submit_output), realmInfo);
        if(realmInfo.realm == 'user') {
          // for the large user-calendar, close everything
          sPopupsCloseAll();
        }
        else {
          // close popup form, show mini-calendar
          sPopupsClose();
        }
      }

    }
    // Validate message
    else if (args.hasOwnProperty('messages_error')){
      // clear all existing errored fields first
      clearErrorFields();

      var messageWrapper = $('<div class="messages-wrapper" role="alert" aria-live="polite" aria-atomic="true"></div>');
      $.each(args.messages_error, function(i, v){
        let ele = $('input[id^="' + v.id + '"]');
        if (!ele.length && v.id == "edit-smart-box-realm-selection") {
          ele = $('input[id^="edit-realms"]');
          let containerDiv = ele?.closest("#realms-container");
          if (containerDiv.length) {
            containerDiv.addClass('error');
          }
        } else {
          ele.addClass('error');
        }
        ele.attr("aria-invalid", "1");

        messageWrapper.prepend('<div class="messages error">' + v.value + '</div>');
      });
      bodyWrapper.prepend(messageWrapper);
         
      /*
       * enable form
       */ 
      $("form", bodyWrapper).removeClass("active-loading");  
      $('#edit-submit', activePop).removeAttr("disabled");
      sPopupsToggleAjaxOverlay();
      sPopupsResizeCenter();
    }
    return false;
    break;
  }

  return true;
}