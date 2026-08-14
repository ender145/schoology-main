Drupal.behaviors.sHomeSmartBoxRealmSelection = function(context){

  $("#smart-box-realm-selection-wrapper:not(.sHomeSmartBoxRealmSelection-processed)", context).addClass('sHomeSmartBoxRealmSelection-processed').each(function(){
    var form = $(this);
    var realmChooser = $('#edit-realms', form);
    var realmContainer = $('#realms-container', form);

    var selectedRealm = $("#browse-realms", form).find("input:checked");
    var isEventCombineForm = form.closest('#s-event-add-combined-form, #s-grade-item-add-combined-form, #s-event-add-form').length > 0;

    if($(".selected-realm", realmContainer).length == 0 && !selectedRealm.length){
      realmChooser.val(realmChooser.attr('defaulttext')).addClass('pre-fill').focus(function(){
        // Only clear the value when the placeholder is currently displayed.
        // When focus returns from the autocomplete listbox the value is the
        // live search term (no pre-fill class), so we must leave it intact.
        if ($(this).hasClass('pre-fill')) {
          $(this).val('').removeClass('pre-fill');
        }
      }).blur(function(){
        var chooser = this;
        // Defer so document.activeElement has settled on its new target.
        // If the user navigated into the autocomplete results listbox (e.g.
        // via a11yFocusListboxOnArrow), do not replace the typed search term
        // with the placeholder – the search interaction is still in progress.
        setTimeout(function() {
          if ($(document.activeElement).closest('.ac_results').length > 0) {
            return;
          }
          if ($(".selected-realm", realmContainer).length == 0) {
            $(chooser).val($(chooser).attr('defaulttext')).addClass('pre-fill');
          }
        }, 0);
      });
    }

    // body autocomplete
    var acVals = Drupal.settings.s_home.valid_realms_list;
    realmChooser.autocomplete(acVals, {
        appendTo: '#realms-container',
        minChars: 0,
        matchContains: true,
        mustMatch: false,
        scroll: false,
        a11yFocusListboxOnArrow: isEventCombineForm,
        multiple: true,
        autoFill: false,
        anchorTo: realmContainer,
        width: realmContainer.width() + 7,
        resultsClass: 'ac_results post-to-ac',
        defaultText: '<div class="ac-row-default">' + Drupal.settings.s_home.default_ac_text + '</div>',
        formatItem: function(row, i, max) {
          if(row.i == '0'){
            return '<div class="ac-default-row">' + row.n + '</div>';
          }
          var realmType = row.i.split('-')[0];
          var picture = '';
          // handle pictures

          switch(realmType){
            case 'user':
              if(!row.p || row.p.length == 0)
                picture = 'pictures/default_user.gif';
              else
                picture = row.p;
              break;
            case 'course':
              if(!row.p || row.p.length == 0)
                picture = Drupal.settings.s_common.default_realm_profiles.course;
              else
                picture = row.p;
              break;
            case 'group':
              if(!row.p || row.p.length == 0)
                picture = Drupal.settings.s_common.default_realm_profiles.group;
              else
                picture = row.p;
              break;
            case 'school':
              if(!row.p || row.p.length == 0)
                picture = Drupal.settings.s_common.default_realm_profiles.school;
              else
                picture = row.p;
              break;
          }

          var $html = $('<div>', {class:"ac-row"})
            .append($('<div>', {class:"ac-picture", 'aria-hidden': 'true'})
              .append($('<img>', {src:picture, alt:''}))
            )
            .append($("<div>", {class: "ac-name"}).text(row.n));

          return $html.html();
        },
        formatMatch: function(row, i, max) {
          return row.n;
        },
        formatResult: function(row) {
          return '';
        }
    }).result(function(event,data,formatted){
      var id = data.i
      var chooser = $(this);
      var selected = chooser.data('selected');
      chooser.val('');
      if(id == '0'){
        return false;
      }
      // add to the array and update the hidden field
      if(jQuery.inArray(id, selected)==-1){
        selected.push(id);
        var name = data.n;
        sHomeSmartBoxRealmSelectionAddPlaceholder(chooser, id, name);
        sHomeSmartBoxRealmSelectionUpdateSelected(chooser, selected);
      }
      return false;
    }).data('selected', []).bind(($.browser.opera ? "keypress" : "keydown"), function(event) {
      if(event.keyCode == 8 && realmChooser.val().length == 0){ // BACKSPACE
        var lastSelected = $("#realms-container .selected-realm:last", form);
        if(lastSelected.length > 0){
          realmChooser.blur();
          sHomeSmartBoxRealmSelectionDeletePlaceholder(lastSelected);
        }
      }

    });

    // handle "X" for placeholders
    $("#realms-container", form).click(function(e){
      realmChooser.focus();
      var target = $(e.target);
      if(target.is('.delete-selected')){
        var placeholder = target.parents('.selected-realm');
        sHomeSmartBoxRealmSelectionDeletePlaceholder(placeholder);
      }
    });
    function sHomeSmartBoxRealmSelectionDeletePlaceholder(placeholder){
      var id = placeholder.attr('id').replace('selected-realm-','');
      var selected = realmChooser.data('selected');
      var arrayPos = jQuery.inArray(id, selected);
      if(arrayPos != -1){
        selected.splice(arrayPos, 1);
        sHomeSmartBoxRealmSelectionUpdateSelected(realmChooser, selected);
      }
      placeholder.remove();
      realmChooser.focus();
    }

    if(!isEventCombineForm){
      sHomeSmartBoxRealmSelectionSetDefaults(selectedRealm, realmChooser);
    }

    // open browse dialog
    var browseBody = $("#browse-realms", form).html();
    $("#browse-realms", form).remove();
    $("#browse-realm-button", form).click(function(){
      var popup        = new Popups.Popup();
      popup.extraClass = 'browse-realm-popup';
      popup.element = this;
      var body = '<div class="popups-body-inner">' + browseBody + '</div>';
      var buttons = {
        'popup_submit': {
           title: Drupal.t('Select'), func: function(){
             var selected = [];
             $("#realms-container .selected-realm", form).remove();
             $(".browse-realm-checkbox input:checked", popup.$popupBody).each(function(){
               var id = $(this).attr('id').replace('browse-realm-checkbox-', '');
               selected.push(id);
               sHomeSmartBoxRealmSelectionAddPlaceholder(realmChooser, id, $(this).attr('realmtitle'));
             })
             sHomeSmartBoxRealmSelectionUpdateSelected(realmChooser, selected);
             popup.close();
             realmChooser.focus();
             sHomeSmartBoxRealmSelectionPopupDateBehaviors();
           }
        },
        'popup_close': {
          title: Drupal.t('Cancel'), func: function(){
            popup.close();
          }
        }
      };
      popup.open(Drupal.t('Browse'), body, buttons);

      // check all section checkboxes when parent checkbox is clicked
      $('.browse-realm-parent-checkbox', popup.$popupBody).each(function(){
        var wrapper = $(this);
        var checkbox = $('>input', wrapper);
        checkbox.click(function(){
          $('.browse-realm-checkbox input', wrapper).attr('checked', $(this).is(':checked'));
        })
      })
      // uncheck parent checkbox if any section checkbox is unchecked
      $('.browse-realm-checkbox input', popup.$popupBody).click(function(){
        var checkbox = $(this);
        var checked = checkbox.is(':checked');
        var parent = checkbox.parents('.browse-realm-parent-checkbox');
        if(parent.length > 0) {
          var parentCheckbox = $('input:first', parent);
          if(!checked){
            parentCheckbox.prop('checked', false);
          }
          else if(!$('.browse-realm-checkbox input:not(:checked)', parent).length){
            parentCheckbox.prop('checked', true);
          }
        }
      });
      // check checkboxes for already selected realms
      var selected = realmChooser.data('selected');
      jQuery.each(selected, function(k, v){
        $("#browse-realm-checkbox-" + v, popup.$popupBody).attr('checked', 'checked');
      });

      //Hack to fix bug in Mac Chrome where realm browser wouldn't scroll
      var userAgent = navigator.userAgent.toLowerCase();
      if(userAgent.indexOf('mac') >= 0 && userAgent.indexOf('chrome') >= 0) {
        $('body').scrollTop(1);
      }

      return false;
    });

  });

}

function sHomeSmartBoxRealmSelectionSetDefaults(selectedRealm, realmChooser){
	var form = $(this);
  if( selectedRealm.length && !form.closest('#calendar-form-container').length) {
    var selectedRealms = [];
    selectedRealm.each(function(){
      var srObj = $(this);
      if(srObj.attr('realmtitle')) {
        var id = srObj.attr('id').replace('browse-realm-checkbox-', '');
        sHomeSmartBoxRealmSelectionAddPlaceholder(realmChooser, id, srObj.attr('realmtitle'));
        realmChooser.focus().blur();
        selectedRealms.push(id);
      }
    });
    if(selectedRealms.length){
      sHomeSmartBoxRealmSelectionUpdateSelected(realmChooser, selectedRealms);
    }
  }
}

function sHomeSmartBoxRealmSelectionAddPlaceholder(object, id, name){
  var realm = String(id.split('-').shift());
  var $elm = $('<div>', {class:"selected-realm " + realm, id:"selected-realm-" + id})
    .append($('<span>', {class:"name-wrapper"})
      .append($('<span>', {class:"name-text"}).text(name))
      .append($('<span>', {tabindex:0, role:"button", class:"clickable delete-selected", title:Drupal.t('Remove ') + name}).text('X'))
    );
  object.parent().before($elm);
}

function sHomeSmartBoxRealmSelectionUpdateSelected(object, selected){
  var formObj = object.closest('#smart-box-realm-selection-wrapper');
  // update the stored array
  object.data('selected', selected);

  // update the hidden field
  $("#edit-selected-realms", formObj).val(selected.join(','));

  // update the autocomplete
  var hasCourse = false;
  var hasGroup = false;
  var newList = [];
  $.each(Drupal.settings.s_home.valid_realms_list, function(k,v){
    var id = v.i;
    if($.inArray(id, selected) == -1){
      newList.push(v);
    }
    else if(id.search(/^course-/) != -1) {
      hasCourse = true;
    }
    else if(id.search(/^group-/) != -1) {
      hasGroup = true;
    }
  });

  object.setOptions({data: newList});
  if(hasCourse)
    $(".course-realm-only", formObj).show();
  else
    $(".course-realm-only", formObj).hide();

  if(hasGroup || hasCourse){
    $(".parent-post", formObj).show();
    $('.no-share:has(.hidden)', formObj).removeClass('hidden');
  }
  else{
    $(".parent-post", formObj).hide();
    $('.no-share:not(.hidden)', formObj).addClass('hidden');
  }


  object.trigger('sHomeSmartBoxRealmSelectionUpdate', [selected]);
  sHomeSmartBoxRealmSelectionPopupDateBehaviors();

}

function sHomeSmartBoxRealmSelectionPopupDateBehaviors(){
    var activePopup = Popups.activePopup();
    if(activePopup == null) {
      return;
    }
    var activePopupBody = $('#' + activePopup.id + ' .popups-body');
    if($('#calendar-form-container', activePopupBody).length == 0){
        return;
    }
    var formWrapper = activePopupBody.find('#calendar-form-container');
    formWrapper.find('.due-date').each(function() {
        sHomeSmartBoxSetStartDate(activePopupBody.attr('this-date'), $(this));
    });
    sPopupsResizeCenter();
}

function sHomeSmartBoxSetStartDate(dateStr, dateStartInput, allDay) {
    var date = new Date(dateStr);
    var day = date.getDate();
    if(day < 10){
      day = '0' + day.toString();
    }
    var year = date.getFullYear().toString().substring(2);
    var dayStr = (date.getMonth()+1) + '/' + day + '/' + year;

    let dateFormatLanguage = Drupal.settings.s_common.date_format_language;
    if (dateFormatLanguage !== undefined) {
      if (dateFormatLanguage === "ar") {
        dayStr = year + "/" + (date.getMonth() + 1) + "/" + day;
      } else if (dateFormatLanguage === "en-GB" || dateFormatLanguage === "th") {
        dayStr = day + "/" + (date.getMonth() + 1) + "/" + year;
      } 
    }

    var hour = date.getHours();
    var minutes = date.getMinutes();
    let date_strings = Drupal.date_t_strings();
    let am_pm_long = date_strings.ampm.slice(2, 4);
    var meridiem = am_pm_long[hour >= 12 ? 1 : 0];
    minutes = (minutes < 10) ? '0' + minutes.toString() : minutes.toString();

    if(hour == 0) {
        hour = 12;
    }
    else if(hour > 12) {
        hour = hour - 12;
    }
    hour = (hour < 10) ? '0' + hour.toString() : hour.toString();
    var timeStr = hour + ':' + minutes + meridiem;

    if(dateStartInput.hasClass('due-date')) {
       dateStartInput.val(dayStr);
       var timeInputDDField = dateStartInput.parent().next().find('input');
       if($('#fcalendar').fullCalendar('getView').name != 'month' && !allDay) {
        timeInputDDField.val(timeStr);
       }
       else {
        timeInputDDField.val('11:59' + am_pm_long[1]);
       }
    }
    else {
        dateStartInput.attr('defaultdate', dayStr);
        Drupal.attachBehaviors();
    }
}
