Drupal.behaviors.sAttachmentMessageForm = function(context){
  $('.s-attachment-form-basic:not(.message-form)').addClass('sAttachmentMessageFormProcessed').each(function(){
    $(this).remove();

    // Issues with link manager being instantiated on wrong attachment form.  After possible duplicate is removed, rebuild link manager
    lm = new sLinkManager();

    $(document).bind('popups_before_remove', function(e, popup){
      if( $(".s-attachment-form-basic", popup.$popup()).length > 0 ){
       $(document).bind('popups_close', function(){
         location.reload();
       });
      }
    });
  });
}
