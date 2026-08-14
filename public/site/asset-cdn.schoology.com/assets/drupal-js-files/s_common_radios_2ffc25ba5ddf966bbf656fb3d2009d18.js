Drupal.behaviors.sCommonRadios = function(context) {
  $('table.form-radios-table:not(.sCommonRadiosProcessed)' , context ).addClass('sCommonRadiosProcessed').each(function(){
    
    var tableObj = $(this);
    var useHandler = tableObj.parents('.radios-wrapper:first').hasClass('use-trigger-handler');
    
    $('tr' , tableObj).each(function(){
      var rowObj = $(this);
      rowObj.bind('click',function(e){
        // clicked directly on the radio button
        if( $(e.originalTarget).hasClass('form-radio') )
          return;
        // clicked on a row containing a radio, trigger a direct click
        var radioBtn = $('input[type=radio].form-radio' , rowObj );
        if(!radioBtn.is(':disabled')){
          if(useHandler){
            radioBtn.triggerHandler('click');
          }
          else{
            radioBtn.trigger('click');
          }
        }
      });
    });
  });
};


