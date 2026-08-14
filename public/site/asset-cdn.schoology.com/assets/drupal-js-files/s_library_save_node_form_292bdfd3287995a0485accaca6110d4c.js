Drupal.behaviors.sLibrarySaveNodeForm = function(context){
  var processClass = 'sLibrarySaveNodeForm-processed';
  var saveNodeForms = [
    '.fake-popup-wrapper',
    '#s-library-save-node-form',
    '#s-library-bulk-move-form',
    '#s-library-bulk-copy-form',
    '#s-library-copy-questions-to-resources-form',
    '#s-library-collection-export-form',
    '#s-grade-outcome-move-form',
    '#s-library-collection-import-form',
    '#s-integration-resources-import-export-configure-form',
    '#s-library-save-rubric-form',
    '#s-library-assessment-convert-to-item-bank-form',
    '#s-library-assessment-convert-to-resource-assessment-form',
  ];
  $.each(saveNodeForms, function(i, formStr){
    saveNodeForms[i] = formStr + ':not(.' + processClass + ')';
  });
  $(saveNodeForms.join(', ')).addClass(processClass).each(function(){
    if(!$(this).hasClass('fake-popup-wrapper') && $(this).parents('.fake-popup-wrapper:first').length > 0){
      return;
    }
    var saveNodeForm = $(this);

    $('.show-helper', saveNodeForm).each(function(){
      $(this).tipsy({title: 'prefill', trigger: 'focus', gravity: 'w', 'html': true});
    });

    // Use 'change' instead of 'click' even though IE is delayed, so that we're not
    // making unecessary AJAX calls
    $("#edit-collection", saveNodeForm).change(function(){
      if($(this).val() > 0){
        $('#edit-folder-select', saveNodeForm).hide().after('<span id="folder-loading"><img src="/sites/all/themes/schoology_theme/images/ajax-loader.gif" alt="' + Drupal.t('Loading') + '" /></span>');
        var isOutcomes = window.location.href.indexOf('outcomes') != -1;
        var isLibImport = saveNodeForm.attr('id') == 's-library-collection-import-form';
        var ajaxUrl;
        if(isOutcomes){
          ajaxUrl = '/outcomes/ajax_collection_folders/' + $(this).val();
        }
        else if(isLibImport){
          ajaxUrl = '/library/import/ajax_collection_folders/' + $(this).val();
        }
        else{
          ajaxUrl = '/library/ajax_collection_folders/' + $(this).val();
        }
        $.ajax({
          url: ajaxUrl,
          dataType: 'json',
          success: function( data , status , xhr ){
            var options = '';
            var firstVal = null;
            jQuery.each(data, function(k, v){
              if(firstVal === null){
                firstVal = v.id;
              }
              options += '<option value="' + v.id + '">' + v.text + '</option>';
            });
            $("#edit-folder-select", saveNodeForm).html(options).show();
            $("#edit-folder", saveNodeForm).val(firstVal);
            $("#folder-loading").remove();
            pubParent = $(saveNodeForm).parents('.public-resource-container:first');
            if(pubParent.length > 0){
          	  $(document).trigger('template_location_changed', pubParent.attr('id'));
            }
          }
        });
      }
      else{
        $("#edit-folder-select", saveNodeForm).html($("#edit-folder-select", saveNodeForm).children(':first')).show();
        $("#edit-folder", saveNodeForm).val(0);
      }
    });

    // Because the folder select box was not generated in Drupal's FAPI,
    // store the selected value in the hidden field before it's removed on submit
    $("#edit-folder-select", saveNodeForm).change(function(){
      var folderSelect = $(this);
      $("#edit-folder", saveNodeForm).val(folderSelect.val());
    });



    // Each item's details behavior
    $('.library-save-node-details', saveNodeForm).each(function(){
      var wrapper = $(this);
      $('.toggle-resource-info', wrapper).click(function(){
        $('.form-item', wrapper).toggle();
        var popup = Popups.activePopup();
        if(popup != null){
          Popups.resizeAndCenter(popup);
        }
      });
    });
  });



}
