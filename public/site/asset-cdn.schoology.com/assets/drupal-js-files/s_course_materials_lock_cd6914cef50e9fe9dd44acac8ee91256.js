Drupal.behaviors.sCourseMaterialsLock = function(context) {
  $('.toggle-dropbox:not(.sCourseMaterialsLock-processed)', context).addClass('sCourseMaterialsLock-processed').each(function () {
    if(typeof sCommonAdvancedOptions == 'object'){
      var thisForm = $(this).closest('form');
      var lockedFieldsWrapper = $('.lock-form-container', thisForm);
      var lockDateSelectorWrapper = $('.lock-form-date-selector-container', thisForm);
      var lockBtn = $('.lock-btn', thisForm);
      sCommonAdvancedOptions.registerEvent(thisForm.attr('id'), 'dropbox', 'sCourseMaterialsLock', function(btnObj){
        if(btnObj.hasClass('adv-option-on')) {
          lockBtn.removeClass('disabled');
        }
        else {
          lockBtn.addClass('disabled').removeClass('active').attr('disabled-title', Drupal.t('Locking requires assignment submissions to be enabled'));
          sCommonAdvancedOptionsSetupToggleTipsy(lockBtn);
          lockedFieldsWrapper.addClass('hidden');
          lockDateSelectorWrapper.addClass('hidden');
          $('.lock-date-dropdown', thisForm).val(0);
          sPopupsResizeCenter();
        }
      });
    }
  });
  
  $('#lock-btn-selector:not(.sCourseMaterialsLock-processed)', context).addClass('sCourseMaterialsLock-processed').each(function () {
    var lockBtn = $(this);
    if(!lockBtn.hasClass('disable-lock-setup')){
      var thisForm = lockBtn.closest('form');
      var giDropBox = $('.adv-option-dropbox', thisForm);
      sCourseMaterialsSetupLock(lockBtn, thisForm, giDropBox, true);
    }
	});
  
};

function sCourseMaterialsSetupLock(lockButton, lockWrapper, giDropBox, setupEvent){
  var lockedFieldsWrapper = $('.lock-form-container', lockWrapper);
  if(!$('.lock-form-container', lockWrapper).hasClass('hidden')){
    // if the lock form is being initially show, add the active class
    lockButton.addClass('active');
  }
  if(giDropBox.length == 1 && !$(giDropBox).attr('checked')) {
    // if the dropbox is disabled, disable the locking feature
    lockButton.addClass('disabled').removeClass('active');
  }

  if(typeof sCommonAdvancedOptions == 'object' && setupEvent){
    sCommonAdvancedOptions.registerEvent(lockWrapper.attr('id'), 'lock', 'sCourseMaterialsLock', function(btnObj){
      if(!btnObj.hasClass('disabled')) {
        sCourseMaterialsToggleLock(lockWrapper, lockedFieldsWrapper, giDropBox, false);
      }
    });
  }

  $('.lock-date-dropdown', lockWrapper).change(function(){
    var lockDateSelectorWrapper = $('.lock-form-date-selector-container', $(this).parents('.lock-form-container'));
    switch($(this).val()) {
      case '0': // unlocked
        lockDateSelectorWrapper.addClass('hidden');
        $('.adv-option-btn.lock-btn', lockWrapper).removeClass('active');
        break;

      case '1': // lock on
        lockDateSelectorWrapper.removeClass('hidden');
        $('.adv-option-btn.lock-btn', lockWrapper).addClass('active');
        break;

      case '2': // lock now
        lockDateSelectorWrapper.addClass('hidden');
        $('.adv-option-btn.lock-btn', lockWrapper).addClass('active');
        break;
    }
  });
}

function sCourseMaterialsToggleLock(lockWrapper, lockedFieldsWrapper, giDropBox, toggle){
  // dropbox is required for assignments
  if(giDropBox.length == 1 && !$(giDropBox).attr('checked')) {
    return;
  }
  if(toggle){
    lockedFieldsWrapper.toggleClass('hidden');
  }
  else{
    lockedFieldsWrapper.removeClass('hidden');
  }

  $('.lock-date-dropdown', lockWrapper).val(0);
  // trigger change below, setting the appropiate lock-field/adv-btn states
  $('.lock-date-dropdown', lockWrapper).trigger('change');
  sPopupsResizeCenter();
}