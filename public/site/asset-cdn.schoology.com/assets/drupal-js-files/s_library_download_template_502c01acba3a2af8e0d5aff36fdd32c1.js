/**
 * Created by swagner on 3/6/14.
 */
function addTemplate(destURL, imgOverride){
  $.ajaxSecure({
    url: '/' + destURL,
    dataType: 'json',
    beforeSend: function(){
      var active_btn = $(document).data('s_library_find_active_resource_add');
      if(typeof imgOverride == 'undefined'){
        imgID = active_btn.attr('id').replace(/^add-resource-btn/,'add-resource-loading');
      }
      else{
        imgID = imgOverride;
      }
      var loading_image = $('<img />').attr('src','/sites/all/themes/schoology_theme/images/ajax-loader.gif').attr('id', imgID).attr('alt', Drupal.t('Loading'));
      active_btn.after(loading_image);
      active_btn.hide();
    },
    success: function(data,status) {
      var active_btn = $(document).data('s_library_find_active_resource_add');
      if(typeof imgOverride == 'undefined'){
        var loading_image_id = active_btn.attr('id').replace(/^add-resource-btn/,'add-resource-loading');
      }
      else{
        var loading_image_id = imgOverride;
      }
      $('#'+loading_image_id).remove();
      active_btn.replaceWith('<span class="link-btn added added-' + data.template_nid + '"><span></span>'+Drupal.t('Added')+'</span>');
      $(document).data('s_library_find_active_resource_add',null);
      if(data.template_nid){
        sLibraryAddMovePopup(data.template_nid, false);
      }
      else {
        sLibraryAddMovePopup(data.fid, true);
      }

    },
    error: function(){
      alert('error');
      var active_btn = $(document).data('s_library_find_active_resource_add');
      if(typeof imgOverride == 'undefined'){
        var loading_image_id = active_btn.attr('id').replace(/^add-resource-btn/,'add-resource-loading');
      }
      else{
        var loading_image_id = imgOverride;
      }
      $('#'+loading_image_id).remove();
      active_btn.show();

      $(document).data('s_library_find_active_resource_add',null);

      alert(Drupal.t('There was an error and the resource was not added'));
    }
  });
}

function sLibraryAddMovePopup(objectId, folder, redirect){
  var redirect_url;

  if(typeof redirect === 'undefined'){
    redirect_url = '';
  }
  else{
    redirect_url = '?url=' + redirect;
  }

  $.ajax({
    type: 'GET',
    url: '/resources/find/' + objectId + '/' + (folder ? 'folder_popup' : 'popup') + redirect_url,
    dataType: 'json',
    success: function(data){
      var arParent = $('.added-' + objectId).parents('.add-resource:first');
      var parent = $('.added-' + objectId).parents('.public-resource-container:first');
      arParent.append('<div class="fake-popup-wrapper">' + data + '</div>');
      var fPopup = $('.fake-popup-wrapper', parent);
      var theID = 'null';
      $('#edit-folder-select-wrapper', fPopup).hide();
      $('.folder-icon', fPopup).hide();
      Drupal.attachBehaviors(fPopup);
      $('.added', parent).unbind('click').click(function(){
        $('.fake-popup-wrapper').each(function(){
          $(this).hide();
        });
        if(theID != 'null'){
          clearTimeout(theID);
        }
        fPopup.toggle();
      });
      parent.bind('mouseleave', function(){
        theID = setTimeout(function(){
          $('.fake-popup-wrapper', parent).hide();
        }, 3000);
      });
      parent.bind('mouseenter', function(){
        if(theID != 'null'){
          clearTimeout(theID);
        }
      });
      if($('#edit-folder-select option', fPopup).length < 2){
        $('#edit-folder-select', fPopup).hide();
        $('.folder-icon', fPopup).hide();
      }
      $('#edit-collection', fPopup).change(function(){
        if($('option:selected', this).html() != 'Downloads' || $('option:selected', this).html() != $('option:first', this).html()){
          $('.collection-icon', fPopup).addClass('not-download');
          $('#edit-folder-select-wrapper', fPopup).show();
          $('.folder-icon', fPopup).show();
        }
        else{
          $('.collection-icon', fPopup).removeClass('not-download');
          $('#edit-folder-select-wrapper', fPopup).hide();
          $('.folder-icon', fPopup).hide();
        }
      });
      $('.popup-folder').change(function(){
        $(document).trigger('template_location_changed', parent.attr('id'));
      });
      $('body').bind('click', function(e){
        var bodyTarget = $(e.target);
        if(!(bodyTarget.parents('.fake-popup-wrapper:first').length > 0) && !bodyTarget.is('.added', parent)){
          fPopup.hide();
        }
      });
      Popups.attach($('body'), '.push-' + objectId, Popups.options({ajaxForm : false, extraClass : 'popups-large popups-add-course'}));
      $('.cancel-btn', fPopup).click(function(e){
        fPopup.hide();
        e.preventDefault();
      });
    }
  });
}

function sLibraryProcessDownloadButtons(context, redirect){
  $('.public-resource-container:not(.sLibraryFindProcessed)', context).addClass('sLibraryFindProcessed').each(function(){

    var resObj = $(this);

    $('span.resource-list-tag',resObj).each(function(){
      $(this).bind('click',function(){
        var tag_id = $(this).attr('tag_id');


        // trigger a click of the according subject filter dropdown option
        $('#resource-subject-wrapper #find-term-links #tag-'+tag_id+':not(.active)').trigger('click');
      });
    });


    $('span.add-resource-btn' , resObj).bind('click',function() {
      var buttonObj = $(this);
      var id_parts = buttonObj.attr('id').split('-');
      id_parts.splice(0,3);
      var template_nid = id_parts.join('-');
      var destURL = 'resources/find/add/'+String(template_nid);

      if(!buttonObj.hasClass('add-to-course')){
        if( $(document).data('s_library_find_active_resource_add') )
          return;

        $(document).data('s_library_find_active_resource_add', buttonObj);
        addTemplate(destURL);
      }
      else{
        var path_query = libMasqQuery;
        if(buttonObj.hasClass('is-folder')){
          var href = '/resources/' + template_nid + '/push/folder';
          if(!buttonObj.hasClass('added')){
            path_query += '&download=1';
          }
        }
        else{
          var href = '/resources/' + template_nid + '/push';
        }

        Popups.openPath(this, {href : href + '?' + path_query, ajaxForm : false, extraClass : 'popups-large popups-add-course masq'}, window);
      }
    });

    $('.added', resObj).click(function(){
      $('.fake-popup-wrapper').hide();
      if($(this).hasClass('add-to-course')){
        var collection_nid = $(this).attr('id').split('-')[2];
        if($(this).hasClass('is-folder')){
          var folder = true;
          var href = '/resources/' + collection_nid + '/push/folder?is_downloaded';
        }
        else{
          var folder = false;
          var href = '/resources/' + collection_nid + '/push?is_downloaded';
        }
        Popups.openPath(this, {href : href + '&' + libMasqQuery, ajaxForm : false, extraClass : 'popups-large popups-add-course masq'}, window);
      }
      else{
        sLibraryAddMovePopup($(this).attr('id').split('-')[2], $(this).hasClass('is-folder'), encodeURIComponent(redirect));
      }
    });
  });
}
