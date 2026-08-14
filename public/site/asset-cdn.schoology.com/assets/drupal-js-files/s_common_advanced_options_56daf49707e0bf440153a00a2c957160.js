Drupal.behaviors.sCommonAdvancedOptions = function(context){
  // advanced option section
  $('.s-common-adv-options-wrapper:not(.sCourseMaterials-process)', context).addClass('sCourseMaterials-process').each(function(){
    var wrapperObj = $(this),
        formObj = wrapperObj.closest('form');
    sCommonAdvancedOptions.initForm(formObj);
    // copy-to-courses
    var copyToCourseBtn = $('.toggle-copy', wrapperObj);
    if(copyToCourseBtn.length){
      formObj.click(function(e) {
        // clicking somewhere on the form should close the copy to courses box
        var target = $(e.target);
        if(!target.is('#addl-courses') &&
          !target.is('.toggle-copy') && 
          target.closest('#addl-courses').length == 0 && 
          target.closest('.toggle-copy').length == 0 && 
          $('#addl-courses').is(':visible')){
          $('#addl-courses').hide();
          sPopupsResizeCenter();
        }
      });
      copyToCourseBtn.click(function(){
        if(!$(this).hasClass('disabled')){
          formObj.find('#addl-courses').toggle();
          sPopupsResizeCenter();
        }
      });
    }
  });
};

if(typeof window.sCommonAdvancedOptions == 'undefined'){
  window.sCommonAdvancedOptions = (function(){
    var obj = {
      callbacks: {}
    };

    /**
     * Initialize the advanced options in the form.
     *
     * @param object formObj
     */
    obj.initForm = function(formObj){
      var wrapperObj = formObj.find('.s-common-adv-options-wrapper'),
          formId = formObj.attr('id');
      if(wrapperObj.length){
        $('.adv-option-btn', wrapperObj).each(function(){
          var btnObj = $(this),
              isToggle = btnObj.hasClass('adv-option-toggle'),
              keyStr = btnObj.attr('key'),
              accessibleText = btnObj.find('.visually-hidden');

          // cluetips
          if(isToggle){
            // toggles will have a different cluetip text depending on the state
            var onTitle = btnObj.attr('on-title'),
                offTitle = btnObj.attr('off-title'),
                defaultTitle = btnObj.attr('title');
            if(!onTitle || !onTitle.length){
              onTitle = defaultTitle;
            }
            if(!offTitle || !offTitle.length){
              offTitle = defaultTitle;
            }
            accessibleText.text(btnObj.hasClass('adv-option-on') ? onTitle : offTitle);
            if (!accessibleText.attr('aria-live')){
              accessibleText.attr('aria-live', 'polite');
            }
            btnObj.attr('aria-pressed', btnObj.hasClass('adv-option-on') ? 'true' : 'false');
            btnObj.tipsy({
              gravity: 's',
              title: function(){
                if(btnObj.hasClass('disabled') && btnObj.attr('disabled-title')){
                  return btnObj.attr('disabled-title');
                }
                else if(btnObj.hasClass('adv-option-on')){
                  return onTitle;
                }
                else{
                  return offTitle;
                }
              }
            });
          }
          else{
            sCommonAdvancedOptionsSetupToggleTipsy(btnObj);
          }

          btnObj.click(function(){
            if(isToggle && !btnObj.hasClass('adv-option-disabled')){

              // update the accessible text
              accessibleText.text(btnObj.hasClass('adv-option-on') ? offTitle : onTitle);

              // trigger mouseenter to allow the cluetip to change
              btnObj.toggleClass('adv-option-on').triggerHandler('mouseenter');
              btnObj.attr('aria-pressed', btnObj.hasClass('adv-option-on') ? 'true' : 'false');
              if(keyStr && keyStr.length){
                // link the toggles into the checkbox field provided by the form API
                var cbObj = formObj.find('.adv-option-' + keyStr);
                cbObj.prop('checked', btnObj.hasClass('adv-option-on'));
              }
            }

            obj.fireEvent(formId, keyStr, [btnObj]);
          });
        });
      }
    };

    obj.clearEvents = function(formId){
      this.callbacks[formId] = {};
    };

    obj.fireEvent = function(formId, btnKey, args){
      if(typeof args == 'undefined'){
        var args = [];
      }
      if(typeof obj.callbacks[formId] != 'undefined' &&
         typeof obj.callbacks[formId][btnKey] != 'undefined'){
        $.each(obj.callbacks[formId][btnKey], function(k, func){
          func.apply(this, args);
        });
      }
    };

    obj.registerEvent = function(formId, btnKey, eventId, callback){
      if(typeof obj.callbacks[formId] == 'undefined'){
        obj.callbacks[formId] = {};
      }
      if(typeof obj.callbacks[formId][btnKey] == 'undefined'){
        obj.callbacks[formId][btnKey] = {};
      }
      obj.callbacks[formId][btnKey][eventId] = callback;
    };

    return obj;
  }());
}

function sCommonAdvancedOptionsSetupToggleTipsy(btnObj){
  btnObj.tipsy({
    gravity: 's',
    title: function(){
      return btnObj.hasClass('disabled') && btnObj.attr('disabled-title') ? btnObj.attr('disabled-title') : btnObj.attr('original-title');
    }
  });
}
