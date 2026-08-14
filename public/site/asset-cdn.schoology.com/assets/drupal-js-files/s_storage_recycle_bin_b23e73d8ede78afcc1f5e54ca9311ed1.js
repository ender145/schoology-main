Drupal.behaviors.sRecycleBin = function(context){
      restorePopupBody = '<span class = "restore-item">' + Drupal.t('Are you sure you want to restore this item?') + '</span>';
      $('.action-restore a:not(.sRecycleBin-Processed)' , context).addClass('sRecycleBin-Processed').each(function(){
        $(this).bind('click' , function(e){        
          var item_nid =  ($(this).parents('tr').attr('id').split('-').pop());
          var buttons = {
              'popup_export' : {
                  title: Drupal.t('Restore'),
                  func: function(){
                      //ajax call to restore node.
                      $.ajaxSecure({
                        url: '/recycle_bin/restore/' + item_nid,
                        dataType: 'json',
                        success: function (data){
                            
                         if ($('.messages').length){
                             $('.messages').remove();
                         } 
                         
                         var restoreMsg = $('<tr class = "bin-item-deleted"><td colspan = "4">' + Drupal.t('This item has been restored') + '</td></tr>');
                         $('#item-' + item_nid).replaceWith(restoreMsg)
                         
                         restoreMsg.fadeOut(5000, function(){
                           $(this).remove();
                         })
                         
                         //Check that there is no more button and no more items left in the DOM
                         if ($('.bin-item').length == 0 && $('.more-btn').length == 0){
                           $('#content-wrapper').html('<div class = "empty-bin">' + Drupal.t('Your recycle bin is empty') + '</div>');
                         }                                      
                         
                        },
                        error: function (data){                         
                         if (!($('.messages').length)){
                         //if there is an AJAX error or if the user tries to manipulate the DOM to restore items they do not have access to.
                           msgError ='<div class="messages error"><div class="messages-close-btn" style="">x</div><div class="messages-container">\n\
                                         <table role="presentation"><tbody><tr>\n\
                                            <td><div class="messages-icon">&nbsp;</div></td>\n\
                                             <td><div class="message-text">There was an error restoring the item, please try again.</div></td>\n\
                                         </tr></tbody></table>\n\
                                       </div></div>';                          
                           $('#recycle-bin').before(msgError);
                         }
                         $('.messages-close-btn').click(function(){
                           $('.messages-close-btn').parent().fadeOut(500 , function(){
                             $('.messages').remove();
                           });
                         });

                        } 
                      });
                      Popups.activePopup().close();
                  }
                 },
                'popup_close': {
                 title: Drupal.t('Cancel'),
                 func: function(){
                   Popups.activePopup().close();
                 }
                }
             };
          var restorePopup = new Popups.Popup();
          restorePopup.extraClass = 'popups-small restore-item';
          restorePopup.element = this;
          Popups.open(restorePopup, Drupal.t('Restore Item'), restorePopupBody, buttons);
          return false;
        });

    });

    $('.s-storage-restore-to-form a:not(.sRecycleBin-Processed)' , context).addClass('sRecycleBin-Processed').each(function(){
      $("#edit-collection", context).change(function(){
        if($(this).val() > 0){
          $('#edit-folder-select', context).hide().after('<span id="folder-loading"><img src="/sites/all/themes/schoology_theme/images/ajax-loader.gif" /></span>');
          var ajaxUrl = '/library/ajax_collection_folders/' + $(this).val();
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
              $("#edit-folder-select", context).html(options).show();
              $("#edit-folder", context).val(firstVal);
              $("#folder-loading").remove();
            }
          });
        }
        else{
          $("#edit-folder-select", context).html($("#edit-folder-select", context).children(':first')).show();
          $("#edit-folder", context).val(0);
        }
      });

      // Because the folder select box was not generated in Drupal's FAPI,
      // store the selected value in the hidden field before it's removed on submit
      $("#edit-folder-select", context).change(function(){
        var folderSelect = $(this);
        $("#edit-folder", context).val(folderSelect.val());
      });

    });
    
    $('.s-recycle-bin-more-link a:not(.sRecycleBin-processed)', context).addClass('sRecycleBin-processed').each(function() {
      var moreLink = $(this);
      var moreRow = moreLink.parents('tr');
      moreLink.bind('click', function(){
        var href = moreLink.attr('href');
        moreLink.replaceWith('<img src="/sites/all/themes/schoology_theme/images/ajax-loader.gif" alt="' + Drupal.t('Loading') + '" class="more-loading" />');
        $.ajax({
          type: "GET",
          url: href,
          data: 'numItems=' + $('.bin-item').length,
          dataType: 'json',
          success: function(data){         
            var newEntries = data.html;
            moreRow.replaceWith(newEntries);
            $('#recycle-bin-ajaxed tr').appendTo('#recycle-bin');
            $('#recycle-bin-ajaxed').remove();
            Drupal.attachBehaviors();
          },
          error: function(){
            $('.s-recycle-bin-more-link').remove();
          }
        });
        
        return false;
      });

    });
    
    //set up action-links  
    $('.s-recycle-bin-action-links:not(.sRecycleBin-Processed)', context).addClass('sRecycleBin-Processed').each(function(){
      $(this).sActionLinks({
        hidden: true,
        wrapper: '.action-links-wrapper'
      })
    });
      
 }

function sStorageRestoreCallback(data, options, element){
  item_nid = $(element).attr('href').split('/').pop();

  if ($('.messages').length){
    $('.messages').remove();
  }

  var restoreMsg = $('<tr class = "bin-item-deleted"><td colspan = "4">' + Drupal.t('This item has been restored') + '</td></tr>');
  $('#item-' + item_nid).replaceWith(restoreMsg)

  restoreMsg.fadeOut(5000, function(){
    $(this).remove();
  })

  //Check that there is no more button and no more items left in the DOM
  if ($('.bin-item').length == 0 && $('.more-btn').length == 0){
    $('#content-wrapper').html('<div class = "empty-bin">' + Drupal.t('Your recycle bin is empty') + '</div>');
  }

  Popups.close();
  return false;
}
