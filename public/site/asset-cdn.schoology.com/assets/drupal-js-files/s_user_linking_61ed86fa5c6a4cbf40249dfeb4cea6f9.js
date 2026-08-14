Drupal.behaviors.sUserLinking = function(context){
  $('.s-js-user-linked-accounts-primary-wrapper:not(.sUserLinking-processed)', context).addClass('sUserLinking-processed').each(function(){
    var wrapperObj = $(this),
        checkboxObj = $('.user-linked-accounts-primary-enabled', wrapperObj),
        selectObj = $('.user-linked-accounts-primary-select', wrapperObj);
    function update(val){
      checkboxObj.prop('disabled', true);
      selectObj.prop('disabled', true);
      Drupal.sUserLinking.updatePrimaryLinkedAccount(val, function(){
        checkboxObj.prop('disabled', false);
        selectObj.prop('disabled', false);
      });
    }
    selectObj.change(function(){
      if(checkboxObj.is(':checked')){
        update(selectObj.val());
      }
    });
    checkboxObj.click(function(){
      var checked = checkboxObj.is(':checked');
      selectObj.toggle(checked);
      if(checked){
        update(selectObj.val());
      }
      else{
        update(0);
      }
    });
    selectObj.toggle(checkboxObj.is(':checked'));
  });

  $('.s-js-user-linked-accounts-wrapper:not(.sUserLinking-processed)', context).addClass('sUserLinking-processed').each(function(){
    var wrapperObj = $(this);

    // this account switcher is elsewhere on the page but we want to remove entries from it if we remove a linked account
    var accountSwitcherObj = $('.s-js-user-account-switcher-list');

    $('.s-js-user-linked-accounts-unlink', wrapperObj).click(function(e){
      e.preventDefault();
      var linkObj = $(this),
          listItemObj = linkObj.closest('.s-js-user-linked-accounts-list-item');

      sCommonConfirmationPopup({
        extraClass: 'user-linked-accounts-unlink-confirm',
        title: Drupal.t('Unlink Account'),
        body: listItemObj.find('.s-js-user-unlink-confirmation').html(),
        confirm: {
          text: Drupal.t('Unlink Account'),
          func: function(){
            sPopupsClose();
            listItemObj.remove();
            accountSwitcherObj.find('.s-js-user-account-switcher-' + linkObj.data('uid')).remove();
            $.ajaxSecure({
              url : linkObj.attr('href'),
              data : {ajax: true}
            });
          }
        }
      });
    });
  });
};

if(typeof Drupal.sUserLinking == 'undefined'){
  Drupal.sUserLinking = (function(){
    var timer = null,
        delay = 500,
        lastLinkedAccount = null,
        delay = null;
    var obj = {};

    obj.updatePrimaryLinkedAccount = function(uid, callback){
      if(timer){
        if(typeof callback == 'function'){
          callback();
        }
        clearTimeout(timer);
      }
      if(uid == lastLinkedAccount){
        return;
      }
      lastLinkedAccount = uid;
      timer = setTimeout(function(){
        timer = null;
        $.ajaxSecure({
          url : '/settings/account/link/' + uid,
          data : {action: 'set_primary', ajax: true},
          success : function(){
            if(typeof callback == 'function'){
              callback();
            }
          }
        });
      }, delay);
    };

    return obj;
  }());
}