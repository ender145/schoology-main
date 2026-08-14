/**
 * Default form behavior for Schoology forms. To override, don't include this
 * file and replace with your own.
 *
 * 1) Uses /sites/all/themes/schoology_theme/ajax-loader-large.gif 2) Upon
 * submit, disable form by setting "disabled" and opacity @ 30% 3) Show loader
 * on center of form 4) Reenable form when response is shown 5) Output validate
 * and submit outputs
 *
 *
 *
 */

var wait_image = '/sites/all/themes/schoology_theme/images/ajax-loader.gif';
var wait_image_width = 43;
var wait_image_height = 11;

/**
 * Ajax plugins callback
 *
 * @param {String}
 *          hook
 * @param {Object}
 *          args
 * @return {Bool}
 */
Drupal.Ajax.plugins.s_home = function(hook, args) {
  var handleElements = '#s-grade-item-add-combined-form, #s-event-add-combined-form';

  /**
   * Action for submitting the form
   */
  switch (hook) {
  case 'submit':
    // disable the form
    var submitter = args.submitter;
    var parentElement = submitter.parents().filter(handleElements);

    if (parentElement.length == 0)
      return;

    sTinymce.updateRichtextContent(parentElement);
    disableElement(submitter);
    disableElement(parentElement);
    showLoader(parentElement);
    break;

  /**
   * Action for message received (validate or submit)
   */
  case 'message':
    // reenable the form and handle output
    var validateOutput = args.ajax_validate_output;
    var submitOutput = args.ajax_submit_output;
    var submitter = args.local.submitter;

    var isComment = submitter.parents('form').hasClass('post-comment-form');
    if (isComment)
      return;

    var parentElement = submitter.parents().filter(handleElements);

    // run only for targeted elements
    if (parentElement.length > 0) {
      enableElement(submitter);
      enableElement(parentElement);
      removeLoader(parentElement);

      var content = '';

      // Display the submit output if set, otherwise display validate output
      if (submitOutput != undefined) {
        unloadSmartBoxRichtext(parentElement);
        $('#smart-box').prepend(submitOutput);
        // Announce success via the persistent live region.
        var successMessage = $('#smart-box .smartbox-success-message').first();
        var successText = successMessage.text();
        successMessage.attr('aria-hidden', 'true');
        if (successText) {
          setTimeout(function() {
            if (typeof sgyAnnounceText === 'function') {
              sgyAnnounceText('sgy-announcer-polite', successText);
            }
          }, 100);
        }

        setTimeout(function(){
          $('.smartbox-success-message').remove();
        }, 2000);
        $('.form-item .error', parentElement).removeClass('error');
      }
    }

    if (submitOutput != undefined) {
      // if any warning messages, display them before they're lost
      var log = $('<ul>');
      var hasWarningMessages = false;
      for (i = 0, _i = args.messages_warning.length; i < _i; i++) {
        log.append('<li>' + args.messages_warning[i].value + '</li>');
        hasWarningMessages = true;
      }
      var errBox = $("<div class='messages warning'>");
      errBox.prepend(log);
      if (hasWarningMessages)
        $("#smart-box").before(errBox);

      // we want this to run for all elements, not just targeted
      var smartBoxSelector = $("#smart-box .filter-block");
      // prove that smart-box aint so smart...make it think index is 10
      smartBoxSelector.data('selected', 10);

      resetAttachmentForm();
      $("#addl-courses .addl-course:visible").hide();
      $("#edit-selected-realms").val('');
      $("#realms-container .selected-realm").remove();
      $("#edit-realms").data('selected', []).setOptions( {
        data : Drupal.settings.s_home.valid_realms_list
      });

      // reset the form
      var editor = tinyMCE.activeEditor;
      if(editor && parentElement.has(editor.getElement())){
        tinyMCE.execCommand('mceRemoveControl', false, editor.id);
      }
      $('.active span', smartBoxSelector).click();
    }
    break;


    case 'afterMessage':
      // clear all existing errored fields first
      clearErrorFields();

      var submitter = args.local && args.local.submitter ? args.local.submitter : null;
      var parentElement = submitter ? submitter.parents().filter(handleElements) : $();

      for(var i in args.messages_error){
        let ele = $('input[id^="' + args.messages_error[i].id + '"]');
        if (!ele.length && args.messages_error[i].id == "edit-smart-box-realm-selection") {
          ele = $('input[id^="edit-realms"]');
          let containerDiv = ele?.closest("#realms-container");
          if (containerDiv.length) {
            containerDiv.addClass('error');
          }
        } else {
          ele.addClass('error');
        }
        ele.attr("aria-invalid", "1");
      }

      //ensure that only one locking error message gets displayed
      var hasError = false;
      $('.messages.error li').each(function(){
        var liObj = $(this);
        if(liObj.html() == Drupal.t('Please enter a locking date')){
          if(!hasError){
            hasError = true;
          }
          else{
            liObj.remove();
          }
        }
      });

      // Accessibility: move focus to the error summary so screen readers
      // announce the validation error(s) instead of only the first field.
      // Defer to ajaxComplete to win against global focus handlers.
      if (args.messages_error && args.messages_error.length) {
        var $errorBox = $('.messages.error', parentElement).first();
        if (!$errorBox.length) {
          $errorBox = $('#smart-box .messages.error').first();
        }
        if ($errorBox.length) {
          if (!$errorBox.attr('tabindex')) {
            $errorBox.attr('tabindex', '-1');
          }
          // Use a one-time ajaxComplete handler so this runs after any
          // global "focus first invalid field" logic for this same request.
          $(document).one('ajaxComplete.sHomeFocusErrorSummary', function () {
            try {
              $errorBox.focus();
            } catch (e) {}
          });
        }
      }
      break;

  }

  return true;
}

/**
 * Helper functions for specific behavior
 */

// Display the given element
function disableElement(element) {
  if (!element.is('input')) // for some reason messes up in IE7
    setOpacity(element, .3);
  element.addClass('disabled-element');
  element.attr('disabled', 'disabled');
}

// Enable the given element
function enableElement(element) {
  if (!element.is('input')) // for some reason messes up in IE7
    setOpacity(element, 1);
  element.removeClass('disabled-element');
  element.attr('disabled', false);
}

// Set cross-browser opacity (0-1)
function setOpacity(element, alpha) {
  element.css( {
    'filter' : 'alpha(opacity=' + (alpha * 100) + ')',
    '-moz-opacity' : alpha,
    '-khtml-opacity' : alpha,
    'opacity' : alpha
  });
}

// Show the ajax loader
function showLoader(element) {
  var left = (element.width() / 2) - (wait_image_width / 2);
  var top = (element.height() / 2) - (wait_image_height / 2);
  element.before('<div id="ajax_loader" style="position:relative"><div style="position:absolute; left:' + left + 'px; top:' + top + 'px; "><img src="' + wait_image + '" alt="' + Drupal.t('Loading') + '" /></div></div>');
}

// Remove the ajax loader
function removeLoader() {
  $('#ajax_loader').remove();
}
