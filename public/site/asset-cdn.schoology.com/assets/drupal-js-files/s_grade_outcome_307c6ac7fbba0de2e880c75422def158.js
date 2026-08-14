Drupal.behaviors.sGradeOutcome = function( context ) {

  $('.outcomes-admin-list:not(.sGradeOutcome-processed)', context).addClass('sGradeOutcome-processed').each(function(){
    $(window).hashchange(function(){
      if( $(document).data('disableHashLoad') ) {
        $(document).data('disableHashLoad',false);
        return;
      }

      sGradeOutcomeAjaxLoad();
    });

    var href = window.location.pathname;
    var hash_keys = parseHashkeys();
    if( hash_keys.folder )
      href += '?folder=' + hash_keys.folder;
    sGradeOutcomeAjaxLoad( href );
  });

  $('.outcome-breadcrumbs:not(.sGradeOutcome-processed)', context).addClass('sGradeOutcome-processed').each(function(){
    var breadcrumbObj = $(this);

    // Ajax breadcrumbs
    $('a.breadcrumb-link,.base-link',breadcrumbObj).each(function(){
      $(this).bind('click',function(e){
        e.preventDefault();
        sGradeOutcomeAjaxLoad( $(this).attr('href') );
      });
    });
  });

  $('.outcomes-tool-header:not(.sGradeOutcome-processed)', context).addClass('sGradeOutcome-processed').each(function(){
    var toolbarObj = $(this);
    var settings = Drupal.settings.s_grade_outcome_list;

    $('.toolbar-add',toolbarObj).sActionLinks({ hidden : false, wrapper : '.action-links-wrapper' });

    var editObj = $('.toolbar-edit',toolbarObj);
    editObj.sActionLinks({ hidden : false, wrapper : '.action-links-wrapper'});
    var editWrapperObj = $('ul.action-links', editObj );

    var optObj = $('.toolbar-options',toolbarObj);
    optObj.sActionLinks({ hidden : false, wrapper : '.action-links-wrapper'});
    var optWrapperObj = $('ul.action-links' , optObj );

    $('.reorder-btn', optWrapperObj ).bind('click',function(e){
      e.preventDefault();
      sGradeOutcomeEnableReorder();
    });

    $('.arrange-btn', optWrapperObj).bind('click',function(e){
      e.preventDefault();
      sGradeOutcomeAutoArrange();
    });

    editObj.bind('mousedown',function(){
      var moveHref = '/outcomes/'+settings.collection_nid+'/move/bulk/0?folder=' + settings.current_folder + '&';
      var copyHref = '/outcomes/'+settings.collection_nid+'/copy?f=' + settings.current_folder + '&';

      $('input.row-select:checked', $('#outcomes-table')).each( function(){
        var inputObj = $(this);
        var item_type = inputObj.closest('tr').attr('class').split(' ').shift().split('-').pop();
        var item_id = inputObj.attr('id').split('-').pop();
        moveHref += 'items[]=' + encodeURIComponent(item_type + '-' + item_id) + '&';
        item_type = item_type.charAt(0);
        item_type = item_type == 'f' ? item_type : (item_type == 'a' ? item_type : 't');
        copyHref += 'p[]=' + encodeURIComponent(item_type + '-' + item_id) + '&';
      });

      // Update the table header and the sticky header
      $('a.action-move', toolbarObj).attr('href', moveHref);
      $('a.action-copy', toolbarObj).attr('href', copyHref);
    });

    // Ajax folder back button
    $('.toolbar-folder-up',toolbarObj).each(function(){
      $(this).bind('click',function(e){
        e.preventDefault();
        sGradeOutcomeAjaxLoad( $(this).attr('href') );
      });
    });

    // Bulk edit actions
    editWrapperObj.each(function(){
      var wrapperObj = $(this);

      $('.action-delete',wrapperObj).bind('click',function(e){
        e.preventDefault();

        var postData = { items: [] };

        $('input.row-select:checked', $('#outcomes-table')).each( function(){
          var inputObj = $(this);
          var item_type = inputObj.closest('tr').attr('class').split(' ').shift().split('-').pop();
          var item_id = inputObj.attr('id').split('-').pop();

          postData.items.push(item_type + '-' + item_id);
        });

        postData.items = postData.items.join(',');
        postData.folder = settings.current_folder;
        sCommonConfirmationPopup({
         title: Drupal.t('Delete Learning Objectives'),
         body: '<p>' + 'Are you sure you want to delete these learning objectives? This action cannot be undone. However, this operation will not delete learning objectives which are in use.' + '</p>',
         confirm: {
          title: Drupal.t('Confirm'),
          func: function(){
           Popups.removePopup();
           Popups.addLoading();
           $.ajaxSecure({
            type: 'POST',
            data: postData,
            url: '/outcomes/'+settings.collection_nid+'/delete/bulk/0',
            success: function( response , status , xhr ){
              sPopupsClose();
              window.location.reload();
            }
          });
         }}
        });
      });
    });

    // When the alignment popup closes do the actual work of adding the alignments
    $(document).unbind('popups_before_close').bind('popups_before_close',function( e , popup ){
      if(!$('#'+popup.id).hasClass('add-alignment-popup'))
        return;

      var guids = $('input#edit-selected-ids').val();

      if(!guids)
        return;
      $.ajaxSecure({
       url: '/outcomes/'+settings.collection_nid+'/add/align',
       type: 'POST',
       data: { guids: guids , folder: settings.current_folder },
       success: function(){
         window.location.reload();
       }
      });
    });
  });

  $('#outcomes-table:not(.sGradeOutcome-processed)', context).addClass('sGradeOutcome-processed').each(function(){
    var tableObj = $(this);
    var toolbarObj = $('.outcomes-tool-header', tableObj);
    var editBtn = $('.toolbar-edit',toolbarObj);

    var outcomeInfo;
    if (typeof sLibraryGetGradeOutcomeInfoFromDom === 'function') {
      outcomeInfo = sLibraryGetGradeOutcomeInfoFromDom();
    }

    tableObj.on('click', '.item-row-folder .item-title a', function(e) {
      e.preventDefault();
      var folder_id = $(this).closest('tr').attr('id').split('-').pop();
      if (outcomeInfo) {
        // in resource or group
        sLibrarySetHash(outcomeInfo.baseUrl + folder_id);
      } else {
        // in system_settings/grades/outcomes
        sGradeOutcomeAjaxLoad(this.href);
      }
    });

    var AjaxSrcollLoadHandler = function(){
      var settings = Drupal.settings.s_grade_outcome_list;

      if( settings.count <= settings.limit )
        return;

      var moreBtnWrapper = $('.library-collection-more-btn-wrapper', tableObj.parent());
      sToggleActiveLoader('grading-outcomes-table', moreBtnWrapper);

      var folder_id = settings.current_folder;
      var start = settings.start + settings.limit;
      Drupal.settings.s_grade_outcome_list.start = start;

      var url = settings.scroll_load_href + '?ajax&folder=' + folder_id + '&start=' + start;

      $.ajax({
        type: 'GET',
        url: url,
        success: function( response , status , xhr ) {
          sToggleActiveLoader('grading-outcomes-table');
          var tableObj = $('#outcomes-table' , response.output );
          if( tableObj.length == 0 )
            return;

          var pageTableObj = $('#outcomes-table');

          $('tr',tableObj).each(function(){
            var trObj = $(this);
            if(!trObj.hasClass('item-row-folder') && !trObj.hasClass('item-row-outcome') && !trObj.hasClass('item-row-align'))
              return;
            trObj.addClass('scrollLoad');
            pageTableObj.append( $('<div />').append( trObj.clone() ).html() );
          });
          var newTrObjs = $('tr.scrollLoad',pageTableObj );
          newTrObjs.each(function(){
            sGradeOutcomeAdminBindRow( $(this) );
          });
          sAttachBehavior( 'popups' , pageTableObj.parent() );
          newTrObjs.removeClass('scrollLoad');
          if( newTrObjs.length >= settings.limit ) {
            sGradeOutcomeEnableInfiniteScroll( pageTableObj, AjaxSrcollLoadHandler );
          }
          // Update the page count in the table and in the stickey header
          var rowCount = $('tr',pageTableObj).length-1;
          var childCount = response.collection.child_count;
          var countText = Utils.i18n.t("core.rows_of_total", {rows: rowCount, total: childCount});
          $('.outcome-count',pageTableObj).html(countText);
          $('.outcome-count' , $('table.sticky-header') ).html(countText);

          // Reinit reordering to pick up the new rows
          if($( '.outcomes-reorder-form' , pageTableObj ).is(':visible'))
            sGradeOutcomeEnableReorder();

          // All rows loaded; remove more button
          if(rowCount == childCount) {
            $('.library-collection-more-btn-wrapper', pageTableObj.parent()).remove();
          }
        }
      });
    };
    sGradeOutcomeEnableInfiniteScroll(tableObj, AjaxSrcollLoadHandler);

    $('input.select-all', tableObj).bind('click',function(){
      var checked = $(this).prop('checked');
      var tableObj = $('#outcomes-table');
      var stickyTable = $('table.sticky-header');
      var stickyEditBtn = $('.outcomes-tool-header .toolbar-edit',stickyTable);

      var saInputSticky = $('input.select-all',stickyTable);
      var saInput = $('input.select-all',tableObj);

      $('input[type=checkbox]',tableObj).prop('checked',checked);

      // There are 2 of this checkbox on the page, one in the table and one in
      // the sticky header. Make sure they stay in sync
      saInputSticky.prop('checked',checked);
      saInput.prop('checked',checked);

      if( checked ){
        editBtn.show();
        stickyEditBtn.show();
      } else {
        editBtn.hide();
        stickyEditBtn.hide();
      }
    }).prop('checked',false);

    $('.item-row-folder,.item-row-outcome,.item-row-align', tableObj).each(function(){
      sGradeOutcomeAdminBindRow( $(this) , tableObj );
    });
  });
}

function sGradeOutcomeEnableReorder() {
  var tableObj = $( '#outcomes-table');
  var tbodyObj = $('tbody',tableObj);
  var formObj = $( '.outcomes-reorder-form' , tableObj );
  var countObj = $('.outcome-count', tableObj );
  var stickyTable = $('table.sticky-header');
  var stickyFormObj = $( '.outcomes-reorder-form' , stickyTable );
  var stickyCountObj = $( '.outcome-count' , stickyTable );
  var listObj = $('.outcomes-admin-list');

  $('.drag-handle', tbodyObj).show();
  tbodyObj.addClass('sorting');

  var sort_opts = {
    handle: '.drag-handle',
    helper: function(e, ui) {
      ui.children().each(function() {
        $(this).width($(this).width());
      });
      return ui;
    },
    stop: function(e, ui) {
      $('.reorder-weight-input', formObj ).val(tbodyObj.sortable('toArray').toString());
    },
    axis: 'y',
    items: 'tr.draggable'
  };

  tbodyObj.sortable( sort_opts );
  formObj.show();
  stickyFormObj.show();
  countObj.hide();
  stickyCountObj.hide();

  $('.cancel-btn',listObj).unbind('click').bind('click',function(){
    window.location.reload();
  });

  $('.form-submit',listObj).unbind('click').bind('click',function(){
    var settings = Drupal.settings.s_grade_outcome_list;
    var folder_id = $('.reorder-folder-id',formObj).val();
    $.ajaxSecure({
      type: 'POST',
      url: '/outcomes/'+settings.collection_nid+'/reorder/' + folder_id,
      data: { items: tbodyObj.sortable('toArray').toString() },
      success: function( response , status , xhr ){
        window.location.reload();
      }
    });
  });
}

function sGradeOutcomeAutoArrange() {
  var tableObj = $( '#outcomes-table');
  var tbodyObj = $('tbody', tableObj);
  var formObj = $('.outcomes-reorder-form' , tableObj );

  sGradeOutcomeEnableReorder();

  var sorted = $.makeArray($('tr', tbodyObj)).sort(function(a, b){
    var $a = $(a);
    var $b = $(b);

    if($a.hasClass('item-row-folder') && !$b.hasClass('item-row-folder'))
      return -1;

    if(!$a.hasClass('item-row-folder') && $b.hasClass('item-row-folder'))
      return 1;

    var aTitle = $('.item-title', $a).text().toLowerCase();
    var bTitle = $('.item-title', $b).text().toLowerCase();

    if(aTitle == bTitle)
      return 0;

    return (aTitle < bTitle) ? -1 : 1;
  });

  tbodyObj.empty().append($(sorted));
  $('.reorder-weight-input', formObj ).val(tbodyObj.sortable('toArray').toString());
}

function sGradeOutcomeAdminBindRow( trObj , tableObj ) {
  var settings = Drupal.settings.s_grade_outcome_list;

  $('input.row-select', trObj).each(function(){
    $(this).bind('click',function(){
      var checked = $(this).prop('checked');

      var stickyTable = $('table.sticky-header');
      var editBtn = $('.outcomes-tool-header .toolbar-edit',tableObj);
      var stickyEditBtn = $('.outcomes-tool-header .toolbar-edit',stickyTable);

      if(!checked){
        $('input.select-all', tableObj).prop('checked',false);
        $('input.select-all', stickyTable).prop('checked',false);
      }

      if( $('input.row-select:checked', tableObj).length == 0 ){
        editBtn.hide();
        stickyEditBtn.hide();
      }else{
        editBtn.show();
        stickyEditBtn.show();
      }
    }).prop('checked',false);
  });

  $('.action-links-wrapper', trObj).each(function(){
    var wrapperObj = $(this);
    wrapperObj.sActionLinks({ hidden : false, wrapper : '.action-links-wrapper'});
    var item_type = trObj.attr('class').split(' ').shift().split('-').pop();
    var item_id = wrapperObj.closest('td').attr('id').split('-').pop();

    var body_text = '';
    var title = '';
    switch( item_type ){
      case 'folder':
        body_text = 'Are you sure you want to delete this folder and all its contents? This action cannot be undone. However, the operation will fail if the folder has learning objectives in use.';
        title = 'Delete Folder';
        break;
      case 'outcome':
        body_text = 'Are you sure you want to delete this learning objective? This action cannot be undone. However, the operation will fail if the learning objective is in use.';
        title = 'Delete Learning Objective';
        break;
      case 'align':
        body_text = Drupal.t('Are you sure you want to remove this alignment from the folder?');
        title = 'Remove Alignment from Folder';
    }

    $('.action-delete',wrapperObj).bind('click',function(e){
      e.preventDefault();

      var url = '/outcomes/'+settings.collection_nid+'/delete/';
      url += String(item_type) + '/' + String(item_id) + '?folder=' + settings.current_folder,
      sCommonConfirmationPopup({
       title: title,
       body: '<p>' + body_text + '</p>',
       confirm: {
        title: Drupal.t('Confirm'),
        func: function(){
         Popups.removePopup();
         Popups.addLoading();
         $.ajaxSecure({
          url: url,
          success: function( response , status , xhr ){
            sPopupsClose();
            window.location.reload();
          }
        });
       }}
      });
    });
  });
}

function sGradeOutcomeAjaxLoad( href ) {
  href = typeof href == 'string' ? href : window.location.pathname;
  var href_append = href.indexOf('?') == -1 ? '?' : '&';
  href += href_append + 'ajax';

  var adminListObj = $('.outcomes-admin-list');
  sToggleActiveLoader('outcomes-admin-list-overlay', adminListObj);

  $.ajax({
    type: 'GET',
    url: href,
    success: function(response) {
      if (response.js) {
        Popups.addJS(response.js);
      }
      if (response.css) {
        Popups.addCSS(response.css);
      }

      if (response.collection) {
        Drupal.settings.s_grade_outcome_list.current_folder = response.collection.folder_id;
        sToggleActiveLoader('outcomes-admin-list-overlay');
        adminListObj.html($('.outcomes-admin-list', $('<div />').append(response.output)).html());
        Drupal.attachBehaviors(adminListObj);

        $(document).data('disableHashLoad', true);

        window.location.hash = 'folder=' + response.collection.folder_id;
      }
    }
  });
}

/**
 * Enable infinite scroll and add pager button for unsupported browsers
 */
function sGradeOutcomeEnableInfiniteScroll(tableObj, AjaxSrcollLoadHandler) {
  $('tr', tableObj).last().sInfiniteScroll({
    loadMore: AjaxSrcollLoadHandler
  });

  if(Drupal.settings.s_grade_outcome_list != undefined) {
    var pager = Drupal.settings.s_grade_outcome_list;
    var start = pager.start + pager.limit;
    var url = pager.scroll_load_href + '?ajax&folder=' + pager.current_folder + '&start=' + start;

    var pagerDiff = (pager.count - start);
    var moreCount = pagerDiff < pager.limit ? pagerDiff : pager.limit;

    var moreText = Utils.i18n.t('core.more_count', {more_count: moreCount});
    var moreBtnWrapper  = $('.library-collection-more-btn-wrapper', tableObj.parent());
    if( moreBtnWrapper.length == 0 && moreCount > 0) {
      var moreBtn = '<div class="library-collection-more-btn-wrapper">';
      moreBtn += '<a class="s-common-infinite-scroll" href="'+ url +'">'+ moreText +'</a>';
      moreBtn += '</div>';
      $(moreBtn)
        .insertAfter(tableObj)
        .click(function(e) { e.preventDefault(); AjaxSrcollLoadHandler(); });
    }
    else {
      $('a', moreBtnWrapper).text(moreText).attr('href', url);
    }
  }
}
