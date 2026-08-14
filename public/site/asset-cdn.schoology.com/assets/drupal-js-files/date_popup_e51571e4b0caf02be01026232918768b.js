// $Id: date_popup.js,v 1.1.2.3 2009/01/12 17:23:25 karens Exp $

/**
 * Attaches the calendar behavior to all required fields
 */
Drupal.behaviors.date_popup = function (context) {
  let amPmStrings = $.trim(Drupal.t('!ampm-abbreviation am|pm|AM|PM', {'!ampm-abbreviation' : ''})).split('|');
  let amPmLong = amPmStrings.slice(2, 4);
  for (var id in Drupal.settings.datePopup) {
    $('#'+ id).bind('focus', Drupal.settings.datePopup[id], function(e) {
      if (!$(this).hasClass('date-popup-init')) {
        var datePopup = e.data;
        // Explicitely filter the methods we accept.
        switch (datePopup.func) {
          case 'datepicker':
            $(this)
              .datepicker(datePopup.settings)
              .addClass('date-popup-init')
              .focus();

            if(typeof datePopup.settings.s_default_date != 'undefined'){
              var sDefaultDate= datePopup.settings.s_default_date;
              sDefaultDate = sDefaultDate * 1000;
              newDate = new Date(sDefaultDate);
              $(this).datepicker("setDate", newDate);
            }
            break;

          case 'timeEntry':
            if(!datePopup.settings.defaultTime)
              datePopup.settings.defaultTime = new Date(0,0,0,0,0);

            // Set the translations for AM and PM
            datePopup.settings.ampmNames = amPmLong;

            $(this)
              .timeEntry(datePopup.settings)
              .addClass('date-popup-init')
              .focus();

            $(this).bind('keydown',function(e){
              var code = (e.keyCode ? e.keyCode : e.which);
              // backspace deletes
              if( code == 8 )
                $(this).val('');
            });
            break;
        }
      }
    });
  }
};
