Drupal.behaviors.sCommonCheckboxes = function(context) {
  $('table.form-checkboxes-table:not(.sCommonCheckboxesProcessed)' , context ).addClass('sCommonCheckboxesProcessed').each(function(){

    $('tr' , $(this)).each(function(){
      $(this).bind('click',function(e){
        // clicked directly on the checkbox
        if( $(e.target).hasClass('form-checkbox') )
          return;
        // clicked on a row containing a checkbox, trigger a direct click
        $('input[type=checkbox].form-checkbox' , $(this) ).trigger('click');
      });
    });
  });
};


