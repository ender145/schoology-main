
Drupal.behaviors.sEventAddForm = function(context) {
  var drupalDateValues = Drupal.date_t_strings();
  var days = drupalDateValues['day_name'];
  var ordinals = drupalDateValues['date_order']; // 0 = Every, 1 = First
  const RECURRENCE_NEVER = 'never';
  var dateStringsMap = {};

  /**
   * Inserts a list of suggested recurring times, based on the current date.
   *
   * @param $list - jQuery element
   * @param date - Date
   * @param dateStrings - dateStrings
   */
  function replaceRecurringOptionsWithNamedDates($list, date,dateStrings) {
    // construct options based off date:
    var recurringOptions = [
      { value: RECURRENCE_NEVER, title: Utils.i18n.t('core.never') },
      { value: 'daily', title: Utils.i18n.t('core.every_day') },
      { value: 'weekdays' , title: Utils.i18n.t('core.every_weekday') },
      { value: 'weekly', title: dateStrings.weekly },
      { value: 'monthly', title: dateStrings.monthly },
      { value: 'monthly-dow', title: dateStrings.monthly_dow },
    ];

    // repopulate $list:
    var selectedValue = $list.find('option:selected').val() || RECURRENCE_NEVER;
    $list.empty();
    $.each(recurringOptions, function () {
      $list.append($('<option />').val(this.value).text(this.title).selected(this.value === selectedValue));
    });
  }

  function updateOptionsWithNamedDates($list, date) {
    var jsonDate = date.toJSON();
    if (dateStringsMap[jsonDate]) {
      replaceRecurringOptionsWithNamedDates($list, date, dateStringsMap[jsonDate]);
    } else {
      $.ajax({
        url: '/iapi/event/calendar_date_strings?start_date=' + jsonDate,
        dataType: 'json',
        type: 'GET',
        success: function (response, status) {
          dateStringsMap[jsonDate] = response.body.date_strings; // cache
          replaceRecurringOptionsWithNamedDates($list, date, dateStringsMap[jsonDate]);
        },
        error: function (response, status) {
          alert(Utils.i18n.t("core.internal_error"));
        }
      });
    }
  }

  $('#s-event-add-form:not(.sEventAddForm-processed),#s-event-add-combined-form:not(.sEventAddForm-processed)', context).addClass('sEventAddForm-processed').each(function () {
    var form = $(this);

    nodeExists = false;
    if (typeof Drupal.settings.s_event != 'undefined') {
      nodeExists = Drupal.settings.s_event.node_exists;
    }

    if (nodeExists == 'true') {
      $('#edit-rsvp').change(function () {
        if ($(this).val() == Drupal.settings.s_event.rsvp_none) {
          $('#edit-rsvp-wrapper').append('<span class="rsvp-warning"><span></span>' + Drupal.t('Setting RSVP to none will remove all external invites') + '</span>');
        } else {
          $('.rsvp-warning').remove();
        }
      });
    }

    $("#edit-description", form).elastic();

    $("#edit-cancel", form).bind('click', function (e) {
      e.preventDefault();
      var popup = Popups.activePopup();
      Popups.close(popup);
    });

    // Advanced list options for recurrences:
    var editRepeatList = $('#edit-repeat', form);

    var startDateDisplay = $('#edit-show-start-date', form).val() === '1' ? 'block' : 'none';
    $('#edit-start-datepicker-popup-0-wrapper', form).css('display', startDateDisplay);

    var endDateDisplay = $('#edit-show-end-date', form).val() === '1' ? 'block' : 'none';
    $('#edit-end-datepicker-popup-0-wrapper', form).css('display', endDateDisplay);

    //for any validation error the popup reloads and the id's change to use popup-2
    $('#edit-start-datepicker-popup-2-wrapper', form).css('display', startDateDisplay);
    $('#edit-end-datepicker-popup-2-wrapper', form).css('display', endDateDisplay);

    if (editRepeatList.length > 0) {
      var startDate = $('input[name="start[date]"]', form);
      var startDatepickerId = $('#edit-start-datepicker-popup-2-wrapper', form).length > 0
        ? 'edit-start-datepicker-popup-2'
        : 'edit-start-datepicker-popup-0';
      var defaultDate = startDate.attr('defaultdate');
      var untilDateWrapper = $('#edit-repeat-until-wrapper');
      var jobQueueMessageWrapper = $('#job-queue-message');
      var endDateDisplayWrapper = $('#edit-end-datepicker-popup-0-wrapper');
      //for any validation error the popup reloads and the id's change to use popup-2
      var endDateDisplayValidationErrorWrapper = $('#edit-end-datepicker-popup-2-wrapper');


      // if we have a date already (from calendar), add it already:
      if (defaultDate && Drupal.settings['datePopup'][startDatepickerId]) {
        // handle locale-specific date formats:
        var date = $.datepicker.parseDate(
          Drupal.settings['datePopup'][startDatepickerId].settings.dateFormat,
          defaultDate,
          {shortYearCutoff: +100} // otherwise default +10 formats year 11 to 1911 instead of 2011
        );
        updateOptionsWithNamedDates(editRepeatList, date);
      }

      // otherwise, change every time we add a date:
      startDate.bind('change', function(e) {
        var date = $('#' + startDatepickerId).datepicker("getDate");
        updateOptionsWithNamedDates(editRepeatList, date);
      });

      // toggle until field and rsvp visibility:
      editRepeatList.bind('change', function () {
        if (editRepeatList.find('option:selected').val() !== RECURRENCE_NEVER) {
          untilDateWrapper.show();
          jobQueueMessageWrapper.show();
          endDateDisplayWrapper.hide();
          endDateDisplayValidationErrorWrapper.hide();
        } else {
          untilDateWrapper.hide();
          jobQueueMessageWrapper.hide();
          endDateDisplayWrapper.show();
          endDateDisplayValidationErrorWrapper.show();
        }
      });
      editRepeatList.trigger('change');
    }

    $('input[name="end[time]"]').blur(function () {
      if ($(this).val() != '') {
        $('#edit-has-end-time').val(1);
      } else {
        $('#edit-has-end-time').val(0);
      }
    });


    $('input[name="end[date]"]').blur(function () {
      context = this;
      setTimeout(function () {
        if ($(context).val() != '') {
          $('#edit-has-end').val(1);
        } else {
          $('#edit-has-end').val(0);
          $('#edit-has-end-time').val(0);
          $('input[name="end[time]"]').val('');
        }
      }, 500);
    });

    // toggle end time
    $(".show-end-time", form).bind('click', function () {
      var end_wrapper = $('#edit-end-wrapper', form);
      var disp = end_wrapper.css('display') == 'none';

      if (disp) {
        end_wrapper.css('display', 'block');
        end_wrapper.find('*').filter(Drupal.sAccessibility.focusableElementsString).filter(':visible').eq(0).trigger('focus');
        $(this).html(Drupal.t('Remove End Time'));
        $("#edit-has-end").val("1");
      } else {
        end_wrapper.css('display', 'none');
        $(this).html(Drupal.t('Add End Time'));
        $("#edit-end", form).val('');
        $("#edit-end-timeEntry-popup-1", form).val();
        $("#edit-has-end").val("0");
      }

      sPopupsResizeCenter();
    });

    var end_time_disp = $("#edit-has-end", form).val() == 1 ? 'block' : 'none';
    $('#edit-end-wrapper', form).css('display', end_time_disp);

    var copyToCourseContainer = $('#copy-to-courses', form).find('.form-checkboxes'),
      copyToCourseCheckboxes = copyToCourseContainer.find('.form-checkbox'),
      copyToCourseBtn = $(".toggle-copy", form);
    copyToCourseBtn.click(function () {
      copyToCourseContainer.toggle();

      sPopupsResizeCenter();

      return false;
    });

    copyToCourseCheckboxes.click(function () {
      if (copyToCourseCheckboxes.is(':checked')) {
        copyToCourseBtn.addClass('active');
      } else {
        copyToCourseBtn.removeClass('active');
      }
    });

    sPopupsResizeCenter();

    form.sioscompat({override: false});
  });

  // Populate start date with today
  $('form input[id^=edit-start-datepicker-popup][defaultdate]:not(.sEventAddForm-processed)', context).addClass('sEventAddForm-processed').each(function () {
    var input = $(this);
    if (input.val().length == 0) {
      input.val(input.attr('defaultdate'));
    }
  });
}
