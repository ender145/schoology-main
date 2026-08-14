/**
 * Generate a CSS selector to exclude classes with chained ':not' selectors
 * @param classesToExclude
 * @returns {string}
 */
function sLibraryExcludeClassList(classesToExclude) {
  var excludeSelector = '';
  classesToExclude.forEach(function(classToExclude) {
    excludeSelector += ':not(.' + classToExclude + ')';
  });
  return excludeSelector;
}

Drupal.behaviors.sLibraryWindow = function(context){
  // Manage opening and closing of actionlink and actionlink-style menus
  var excludeSelector = sLibraryExcludeClassList([
    'sLibraryWindow-processed',
  ]);
  $('body' + excludeSelector).addClass('sLibraryWindow-processed').each(function() {
    var documentBody = $(this);

    // window.location.hash/history browsing for AJAX'd content, disabled for import view.
    // Changing the main content area is now triggered by changing the window hash, which triggers
    // an AJAX load via sLibraryUpdateMainContent, rather than directly triggering an AJAX call
    if(!$(context).hasClass('popups-body')) {
      $(window).hashchange( function(){
        var hash = window.location.hash;

        // This is an initial page load, set the hash, which triggers this handler again and loads
        // the main content area via sLibraryUpdateMainContent
        if(hash == '') {
          sLibrarySetHash();
          return;
        }

        var href = sLibraryGetHash();
        if (href == '/resources/apps') {
          var apps = $('.resources-app-title:not(.app-quick-installer-popup)', context);
          if (apps.length > 0) {
            var firstApp = apps.first();
            firstApp.addClass('active');
            sLibraryRunResourceAppLaunch(firstApp.attr('href'));
          }
        } else if (sLibraryIsContentNavLaunch(href)) {
          sLibraryRunResourceAppLaunch(href)
        } else {
          sLibraryUpdateMainContent($('#library-wrapper'), href, false, true);
        }
      });
      // load main-collection-view if we have collections
      if( $('#library-left').length == 1 ) {
        if($('tr.library-collection', documentBody).length > 0) {
          $(window).hashchange();
        }
      }
      else {
        $(window).hashchange();
      }
    }

    documentBody.bind('click', function(e) {
      var clickTarget = $(e.target);
      // the .action-links-wrapper class denotes the button used to open an actionlink-style menu
      // if the user clicks a child of this element, upgrade the click target to the element itself
      var alWrapperObj = clickTarget.parents('.action-links-wrapper');
      if( alWrapperObj.length > 0 )
        clickTarget = alWrapperObj;

      var allMenusObj = $('#library-left ul.action-links, #collection-view ul.action-links');
      // opening a menu, close all except the active one
      if( clickTarget.hasClass('action-links-wrapper') ){
        allMenusObj.not('.action-links',clickTarget).hide();
        return;
      }

      // close all open menus and remove the active class from all menu buttons

      allMenusObj.hide();
      $('.action-links-unfold.active, .action-links-wrapper-junior.active').removeClass('active');
    });

    // Form: #s_library_import_select_wrapper_form
    //  determine and store all of the checked items into #edit-selected before submitting the form
    $(document).bind('popups_before_serialize', sLibrarySubmitImportSelectForm);

    // Some extra logic needed when a popup returns for CA Teams
    $(document).bind('popups_form_success', sLibraryHandleCATeamPopupSuccess);
  });
};

Drupal.behaviors.sLibraryLeftNav = function(context){

  $('.collections-list-wrapper:not(.sLibraryLeftNav-processed)', context).addClass('sLibraryLeftNav-processed').each(function(){
    var collectionListWrapper = $(this);

    // toggle collection list
    $('.expandable', collectionListWrapper).each(function(){
      $(this).click(function(){
        var parentObj = $(this).parents('.collections-list');
        $(this).toggleClass('closed');
        $(this).attr('aria-expanded', !$(this).hasClass('closed'));
        $('.s-library-collections-list-forms, div.item-list', parentObj ).toggle();
      });
    });

    sAttachBehaviors(['sLibraryActionLinks', 'sAppMenu', 'sLibraryAjaxedLinks'], collectionListWrapper);
  });

  // search questions from question banks by alignments - controls
  $('#resource-search-by-alignments-wrapper:not(.sLibraryLeftNav-processed)', context).addClass('sLibraryLeftNav-processed').each(function(){
    var alignmentWrapper = $(this);
    var libraryWrapper = alignmentWrapper.parents('#library-wrapper');
    var alignmentForm = $('.alignment-form-container');
    var alignmentFormParent = alignmentForm.parent();
    var alignmentSearchLink = $('#resource-search-by-alignments', alignmentWrapper);
    var closeAlignmentPopup = function(){
      var popup = Popups.activePopup();
      var selectedIds = '';
      if( popup != null ){
        selectedIds = sAlignmentGetActiveIdStore().val();
        Popups.close(popup);
      }
      return selectedIds;
    };

    alignmentSearchLink.removeClass('active');
    alignmentSearchLink.click(function(e){
      e.preventDefault();
      if(!$(this).hasClass('disabled')){
        $(this).addClass('disabled');
        var href = $(this).attr('href');
        var popup = new Popups.Popup();
        popup.extraClass = 'popups-large add-alignment-popup';
        var popup_params = {
          popup: popup,
          options: { hideActive: false },
          buttons: {
            close: {
              title: Drupal.t('Select'),
              func: function(e){
                var selectedIds = closeAlignmentPopup();
                if(selectedIds){
                  href += (href.indexOf('?') >= 0 ? '&' : '?') + 'guids=' + selectedIds;
                  sLibraryUpdateMainContent(libraryWrapper, href);
                }
              }
            },
            cancel: {
              title: Drupal.t('Cancel'),
              func: closeAlignmentPopup
            }
          }
        };
        Popups.open(popup_params.popup , Drupal.t('Search by Alignments') , '<div id="popup-alignment-form-wrapper"></div>', popup_params.buttons , popup_params.width , popup_params.options);
        alignmentForm.attr('id', 'form_' + alignmentWrapper.closest('form').attr('id'))
          .prependTo($('#popup-alignment-form-wrapper', popup_params.popup.$popupBody()))
          .show();
        if(!alignmentForm.children('#edit-selected-ids').length){
          alignmentForm.append($('<input id="edit-selected-ids" type="hidden">'));
        }
        Popups.resizeAndCenter(popup);
        $(document).bind('popups_close.s_library_alignment_search', function(){
          alignmentSearchLink.removeClass('disabled');
        });
      }
    });
  });

};

Drupal.behaviors.sLibrary = function(context){

  $('#s-library-collection-add-folder-form:not(.sLibrary-processed), #s-library-bulk-edit-form:not(.sLibrary-processed)', context).addClass('.sLibrary-processed').each(function(){
    var formObj = $(this);
    var checkbox = $('.s-js-enable-tracking', formObj);
    var infotipObj = checkbox.parents('.infotip', formObj);
    var trackingText = $('.s-js-tracking-text', formObj);

    formObj.on('mouseenter', '.question-tracking-container', function(e){
      infotipObj.tipsy('show');
    });

    formObj.on('mouseleave', '.question-tracking-container', function(e){
      infotipObj.tipsy('hide');
    });

    formObj.on('click', '.s-js-enable-tracking',function(e) {
      //Toggle the explanation text for the "Enable Tracking" checkbox in the question bank creation/edit form
      trackingText.toggleClass('hidden', !checkbox.is(':checked'));
      sPopupsResizeCenter();
    });

  });


  $('#s-library-question-usage-wrapper:not(.sLibrary-processed)', context).addClass('sLibrary-processed').each(function(){
    var usageWrapper = $(this);

    //Bind the ajax for the Current/Past toggler in question usage popup
    usageWrapper.on('click', '.s-js-usage-ajax', function(e){
      var contentWrapper = $('.s-js-usage-content-wrapper', usageWrapper);
      sToggleActiveLoader('question-usage', contentWrapper);
      $.ajax({
        url: $(e.target).attr('href'),
        dataType: 'json',
        success: function(json){
          usageWrapper.html(json.output);
          sToggleActiveLoader('question-usage');
          sPopupsResizeCenter();
        }
      });
    });
  });

  var groupAssessmentPreviewToggle;
  $('.collection-item-assessment.read-only:not(.sLibrary-processed)', context).addClass('sLibrary-processed').each(function(){
    // for readonly assessment items, override the click to trigger delivery preview
    if (!window.groupCollectionAssessmentPreviewBootstrap) {
      return;
    }
    var $item = $(this);

    if (!groupAssessmentPreviewToggle) {
      var wrapperId = 'group-collection-assessment-modal-wrapper';
      var groupCollectionAssessmentPreviewModalWrapper = $('<div id="' + wrapperId + '"></div>');
      $('body').append(groupCollectionAssessmentPreviewModalWrapper);

      var configs = sCommonGetSetting('groupCollectionAssessmentPreviewBootstrap');
      groupAssessmentPreviewToggle = window.groupCollectionAssessmentPreviewBootstrap(wrapperId, configs);
    }

    var assessmentVersion = $item.attr('assessment_version');
    $item.on('click', function(e) {
      e.preventDefault();
      groupAssessmentPreviewToggle(assessmentVersion);
    });
  });

  var collectionViewWrapper = $("#collection-view");

  //wrappers containing the delete link at the top
  var tActionWrapper = $('#toolbar-action-wrapper', collectionViewWrapper);
  var copyToLink = $('.action-copy', tActionWrapper);
  var addToCourseLink = $('.action-export', tActionWrapper);
  var deleteLink = $('.action-delete', tActionWrapper);
  var disabledDeleteLink = $('.action-delete-disabled', tActionWrapper);
  var convertToItemBankLink = $('.action-collection-template-assessment-convert-to-item-bank', tActionWrapper);

  var convertToResourceAssessmentLink = $('.action-collection-template-assessment-convert-to-resource-assessment', tActionWrapper);

  var checkedCount = 0;
  var cbCount = 0;
  var nonRubricCbCount = 0;
  var hasDisabledCount = 0;
  var templateAssessmentCount = 0;
  var selectAll = false;
  var isCATeamContext = $(document.body).hasClass('common-assessment-resources-view');

  $(".collection-item-checkbox:not(.sLibrary-processed)", context).addClass('sLibrary-processed').each(function(){
    var inputObj = $('input:not(.select-all-checkbox)',this);
    var inputTr = inputObj.parents('tr');
    var hasDisabled = $('.action-delete.disabled', inputTr).length > 0;

    inputObj.click(function(){
      var isRubric = inputTr.hasClass('template-s-content-rubric');
      var isTestQuizTemplate = inputTr.hasClass('template-assessment');

      if(inputObj.is(':checked')){
        checkedCount += 1;

        if (! isRubric) {
          nonRubricCbCount += 1;
        }

        if (isTestQuizTemplate) {
          templateAssessmentCount += 1;
        }

        if(hasDisabled){
          hasDisabledCount += 1;
        }
      }
      else{
        checkedCount -= 1;

        if (! isRubric) {
          nonRubricCbCount -= 1;
        }

        if(hasDisabled){
          hasDisabledCount -= 1;
        }

        if (isTestQuizTemplate) {
          templateAssessmentCount -= 1;
        }

        if(!selectAll){
          selectAll = $('input.select-all-checkbox', inputTr.parents('#collection-view'));
        }
        selectAll.prop('checked', false);
      }

      if(checkedCount > 0){
        tActionWrapper.addClass('display-taw');

        var shouldDisplayConvertToItemBankOption = false;
        var checkboxesChecked = document.querySelectorAll('div.form-item input[type="checkbox"]:checked');
        var questionBankIconClass = 'testquiz-question-bank-icon';
        var isHideCopyToOption = false;
        var ltqQuestionBankIconClass = 'template-s-content-common-assessment-question-bank';
        for (var cbx = 0; cbx < checkboxesChecked.length; ++cbx) {
          if ($(checkboxesChecked[cbx]).hasClass('select-all-checkbox')) {
            continue;
          }
          var dataFolderType = $(checkboxesChecked[cbx]).attr('data-folder-type');
          shouldDisplayConvertToItemBankOption = dataFolderType && dataFolderType.indexOf(questionBankIconClass) > -1;
          if (!shouldDisplayConvertToItemBankOption) break;
        }
        for (var cbx = 0; cbx < checkboxesChecked.length; ++cbx) {
          if (!isHideCopyToOption)
            isHideCopyToOption = $(checkboxesChecked[cbx]).parents('tr').hasClass(ltqQuestionBankIconClass);
          if (isHideCopyToOption) break;
        }
        isHideCopyToOption
          ? copyToLink.toggleClass('hidden', true)
          : copyToLink.toggleClass('hidden', false);

        shouldDisplayConvertToItemBankOption
          ? convertToItemBankLink.removeClass('hidden')
          : convertToItemBankLink.addClass('hidden');

        if (isCATeamContext) {
          copyToLink.toggleClass('hidden', nonRubricCbCount > 0);
          addToCourseLink.toggleClass('hidden', nonRubricCbCount > 0);
          deleteLink.addClass('hidden');
          disabledDeleteLink.addClass('hidden');
        } else {
          deleteLink.toggleClass('hidden', hasDisabledCount > 0);
          disabledDeleteLink.toggleClass('hidden', !hasDisabledCount);
          convertToResourceAssessmentLink.toggleClass('hidden', !templateAssessmentCount);
        }
      }
      else{
        tActionWrapper.removeClass('display-taw');
      }
    });
    cbCount++;
  });

  $("#collection-view:not(.sLibrary-processed)", context).addClass('sLibrary-processed').each(function(){
    var collectionViewWrapper = $(this);
    // make sure the popup is the right size for an image preview
    $(document).bind('popups_open_done',function(a,b,c) {
      var popup = Popups.activePopup();
      var libpreview_popup = $('#'+popup.id+'.popups-template-view');

      if( libpreview_popup.length == 0 )
        return;

      $('img',libpreview_popup).bind('load',function(){
        var popup = Popups.activePopup();
        Popups.resizeAndCenter(popup);
      });

      // just incase
      Popups.resizeAndCenter(popup);
    });

    var wrapper = $(this);
    var toolbar = $('#collection-toolbar', wrapper);

    //wrappers containing the delete link at the top
    var tActionWrapper = $('#toolbar-action-wrapper', collectionViewWrapper);
    var deleteLink = $('.action-delete', tActionWrapper);
    var disabledDeleteLink = $('.action-delete-disabled', tActionWrapper);

    var cbCount = 0;
    var hasDisabledCount = 0;

    // Select All checkbox
    $('.select-all-checkbox', wrapper).click(function(){
      var hasSelectedCBXs = false;
      var checkboxes = $('.alignments-checkbox', wrapper);
      var groupedByAligments = true;
      if(checkboxes.length == 0){
        checkboxes = $("#collection-view-contents td.collection-item-checkbox input[type=checkbox]", wrapper);
        groupedByAligments = false;
      }
      if($(this).is(':checked')){
        checkboxes.not(':checked').each(function(){
          // this needs to be checked individually in case another alignment group caused this one to be checked already
          if(!$(this).is(':checked')){
            $(this).prop('checked', true).each(sTriggerClick);
          }
        });
        hasSelectedCBXs = true;
        hasDisabledCount = $('.collection-item-gear .action-delete.disabled', collectionViewWrapper).length;
      }
      else{
        checkboxes.each(function(){
          var checkboxObj = $(this);
          if(checkboxObj.is(':checked')){
            checkboxObj.prop('checked', false).each(sTriggerClick);
          }
          else if(groupedByAligments){
            // when unchecking in alignment groups, need to drill down to uncheck any child
            checkboxObj.closest('td').siblings('td').find('.alignment-group .form-checkbox:checked').each(function(){
              var childCheckboxObj = $(this);
              if(childCheckboxObj.is(':checked')){
                childCheckboxObj.prop('checked', false).each(sTriggerClick);
              }
            });
          }
        });
        hasSelectedCBXs = false;
      }
      if(hasSelectedCBXs){
        $('#toolbar-action-wrapper', collectionViewWrapper).addClass('display-taw');

        if (isCATeamContext) {
          deleteLink.addClass('hidden');
          disabledDeleteLink.addClass('hidden');
        } else {
          deleteLink.toggleClass('hidden', hasDisabledCount > 0);
          disabledDeleteLink.toggleClass('hidden', !hasDisabledCount);
        }
      }
      else{
        $('#toolbar-action-wrapper', collectionViewWrapper).removeClass('display-taw');
      }
    });

    // select all for google docs
    $('#toolbar-select-all:not(.sLibrary-processed)').addClass('sLibrary-processed').each(function(){
    	var selectBtn = $(this);
        selectBtn.bind('click',function(){
          var checked = !selectBtn.data('s_library_toggle');
          var btn_label = checked ? Drupal.t('Unselect') : Drupal.t('Select All');
          selectBtn.data('s_library_toggle',checked);

          $('input.form-checkbox').each(function(){
            $(this).attr('checked',checked);
          });

          selectBtn.html(btn_label);
        });
      });

    // "Action" dropdown
    $('#collection-toolbar #toolbar-action', wrapper).bind('click', function(){
      $('.action-links-unfold', this).toggleClass('active');
      var selected = $("#collection-view-contents td.collection-item-checkbox input:checked", wrapper);
      if(!selected.length){
        $('#toolbar-action-warning', toolbar).toggle();
      }
      else{

        var selectedIds = [];
        selected.each(function(){
          selectedIds.push('p[]=' + $(this).attr('id').replace('collection-item-',''));
        });

        var params = selectedIds.join('&');

        $('#toolbar-action-warning', toolbar).hide();
        if($('.action-links-unfold', this).hasClass('active')){
          var toolbarActions = $('#toolbar-action-list', toolbar);

          $('a', toolbarActions).each(function(){
            var linkAction = $(this);
            // if the original href hasn't be stored,
            // store it before modifying
            if(!linkAction.data('origHref')){
              linkAction.data('origHref', linkAction.attr('href'));
            }

            // all links should already have the 'f' query param as set by PHP
            linkAction.attr('href', linkAction.data('origHref') + '&' + params);

          });

          toolbarActions.show();
        }
        else{
          $('#toolbar-action-list', toolbar).hide();
        }

        // Add target operation for item bank conversion
        var queryConvertToItemBankLink = 'a.action-edit-template-assessment-convert-to-item-bank';
        var convertItemBankLink = $(queryConvertToItemBankLink, wrapper).attr('href');
        var itemBankOperation = '&operation=convert-to-item-bank';
        if (convertItemBankLink && convertItemBankLink.indexOf(itemBankOperation) === -1) {
          var targetItemBankLink = convertItemBankLink + itemBankOperation;
          $(queryConvertToItemBankLink, wrapper).attr('href', targetItemBankLink);
        }
      }
    });

    //Enable question tracking confirmation popup
    $('#collection-toolbar', wrapper).on('click','.options-question-tracking', sLibraryBindTrackingPopup);

    // "Copy To" button for external collections
    // can't do it on click because popups grabs the event before we can add the params
    $('#collection-toolbar .action-copy', wrapper).bind('mousedown', function(){
      var selected = $("#collection-view-contents td.collection-item-checkbox input:checked", wrapper);

      var selectedIds = [];
      selected.each(function(){
        selectedIds.push('p[]=' + $(this).val());
      });

      var params = selectedIds.join('&');
      var linkAction = $(this);
      if(!linkAction.data('origHref')){
        linkAction.data('origHref', linkAction.attr('href'));
      }

      // all links should already have the 'f' query param as set by PHP
      linkAction.attr('href', linkAction.data('origHref') + '&' + params);
    });

    $('#collection-toolbar #toolbar-add, #collection-toolbar #toolbar-add-question', wrapper).sActionLinks({hidden: false ,wrapper: '.add-resource-action-links'});

    var outcome_buttons = [
     $('#toolbar-options #collection-enable-outcomes a' , wrapper ),
     $('#collection-view-contents .action-collection-disable-outcomes span', context)
    ];

    $.each(outcome_buttons,function( index , obj ){
      obj.bind('click',function(e){
        e.preventDefault();
        var linkObj = $(this);
        var enabled = linkObj.attr('data-enabled') == '1';
        var title_output = enabled ? Drupal.t('Disable Learning Objectives') : Drupal.t('Enable Learning Objectives');
        var body_output = enabled ? Drupal.t('Are you sure you want to disable learning objectives for this collection?') : Drupal.t('Are you sure you want to enable learning objectives for this collection?');
        var confirm_text_output = enabled ? Drupal.t('Disable') : Drupal.t('Enable');
        sCommonConfirmationPopup({
          title: title_output,
          body: '<p>'+body_output+'</p>',
          confirm: {
           text: confirm_text_output,
           func: function(){
             Popups.removePopup();
             Popups.addLoading();
             $.ajaxSecure({
               url: linkObj.attr('href'),
               success: function( response , status, xhr ){
                 window.location.reload();
               }
             });
           }
          }
        });
      });
    });

    // "Options" dropdown
    $('#collection-toolbar #toolbar-options', wrapper).bind('click', function(){
      $('.action-links-unfold', this).toggleClass('active');
      var toolbarActions = $('#toolbar-options-list', toolbar);

      if($('.action-links-unfold', this).hasClass('active')){
        toolbarActions.show();
      }
      else{
        toolbarActions.hide();
      }
    });

    $('#collection-toolbar #collection-reorder').bind('click', function(){
      sLibraryEnableContentReorder("collection-view-contents", 's-library-collection-reorder-items-form');
    });

    $('#collection-toolbar #collection-auto-arrange').bind('click', function(){
      sLibraryAutoArrange( "collection-view-contents", 's-library-collection-reorder-items-form');
    });

    //adding common assessments
    $('#collection-add-common-assessment', wrapper).click(function(e){
      e.preventDefault();
      var collectionInfo = $(this).find('a').attr('href').split('?');
      var folderId = collectionInfo[1].split('=').pop();
      var collectionId = collectionInfo[0].split('common_assessment/').pop();

      var payload = {
        collection_nid: collectionId,
        folder_id: folderId,
      };
      caTeamResources.TeamResourcesActions.createCommonAssessment(payload);
    });

    //adding common assessments question bank
    $('#collection-add-common-assessment-question-bank', wrapper).click(function(e){
      e.preventDefault();
      var collectionInfo = $(this).find('a').attr('href').split('?');
      var folderId = collectionInfo[1].match(/f=(\d+)/)[1];
      var assessmentType = collectionInfo[1].match(/type=(\d+)/)[1];
      var collectionId = collectionInfo[0].split('common_assessment/').pop();

      var payload = {
        assessment_type: assessmentType,
        collection_nid: collectionId,
        folder_id: folderId,
      };

      caTeamResources.TeamResourcesActions.createCommonAssessmentQuestionBank(payload);
    });

    //adding course assessments item bank
    $('#collection-add-course-assessment-item-bank', wrapper).click(function(e){
      e.preventDefault();
      const collectionInfo = $(this).find('a').attr('href').split('=');

      const payload = {
        collectionNid: collectionInfo[0].split('/resources/my/').pop().split('/add/item-bank').shift(),
        folderId: collectionInfo[1].split('&').shift(),
        assessmentType: collectionInfo[2],
      };

      resourceModal.ResourceModalActionCreator.openAddItemBankModal(payload);
    });
  });

  // import from resources
  // note: this gets called everytime the library view is refreshed (e.g. when switching collection, folder, search by alignments)
  $('#collection-view.import-view:not(.sLibraryImportView-processed)', context).addClass('sLibraryImportView-processed').each(function(){
    var collectionView = $(this, context);
    var libraryWrapper = collectionView.parents('#library-wrapper');
    var $allCheckboxes = $('input.form-checkbox[name^=item]', collectionView);

    // optimization: determine all of the unique checkboxes we have in the beginning
    var uniqueCheckboxes = $();
    var tmp = {};
    $allCheckboxes.each(function(){
      var val = $(this).val();
      if(typeof tmp[val] == 'undefined'){
        tmp[val] = true;
        uniqueCheckboxes = uniqueCheckboxes.add($(this));
      }
    });

    // view all/selected view toggles
    var viewAllLink = $('.collection-result-view-all-link', collectionView),
        viewSelectedLink = $('.collection-result-view-selected-link', collectionView),
        allContentsTable = $('#collection-view-contents > tbody', collectionView).addClass('all-contents'),
        selectedContentsTable,
        autoSelectDropdownBtn = $('#collection-item-auto-select-wrapper .action-links-unfold', collectionView);

    // Update the count of the number of selected questions based on the number of unique checked checkboxes
    function updateSelectedCount(){
      viewSelectedLink.children('.collection-item-selected-count').text('(' + getSelectedCount() + ')');
    }

    function getSelectedCount(){
      return uniqueCheckboxes.filter(':checked').length;
    }

    // Toggle the state of the submit button depending on whether or not there are checkboxes checked.
    function toggleSubmitButton(){
      // directly picking the descendant since there can be other submit buttons and we want to target just this one
      var submitSpanObj = libraryWrapper.siblings('.submit-buttons').children('.submit-span-wrapper');
      var max_additional_questions = $('#edit-num-allowed-additional-questions').val();
      var max_num_questions = $('#edit-max-allowed-questions').val();
      var selectedCount = getSelectedCount();

      if(selectedCount == 0){
        //nothing selected
        submitSpanObj.addClass('disabled').children('.form-submit').prop('disabled', true);
        sTooltipOverlayRemove(submitSpanObj);
      } else if (!max_additional_questions || selectedCount <= max_additional_questions){
        //questions selected
        submitSpanObj.removeClass('disabled').children('.form-submit').prop('disabled', false);
        sTooltipOverlayRemove(submitSpanObj);
      } else {
        //too many questions selected
        submitSpanObj.addClass('disabled').children('.form-submit').prop('disabled', true);
        sTooltipOverlay(submitSpanObj, Drupal.t('You have exceeded the !maxQuestions question limit on this test/quiz', {'!maxQuestions':max_num_questions}) , 's')
      }
    }

    // Update alignment count for the provided checkbox
    // the increment bool is checked separately because the checkbox that triggered the update does not have to be checkboxObj
    // example: the user checked a question in the "Selected" view.
    function updateAlignmentCount(checkboxObj, increment){
      // in the alignment search, we may end up displaying the same question in multiple places - need to keep those in sync
      var alignmentGroup = checkboxObj.closest('.alignment-group');
      if(alignmentGroup.length > 0){
        if(increment){
          // when incrementing, just add to the group this checkbox belongs to
          var selectedCountObj = alignmentGroup.siblings('.alignment-data').find('.alignment-count-selected');
          selectedCountObj.text(parseInt(selectedCountObj.text()) + 1);
        }
        else{
          // when decrementing, find the one without checked-elsewhere and decrement that one only
          $allCheckboxes.filter('[value="' + checkboxObj.val() + '"]').each(function(){
            if(!$(this).closest('tr').hasClass('checked-elsewhere')){
              var selectedCountObj = $(this).closest('.alignment-group').siblings('.alignment-data').find('.alignment-count-selected');
              selectedCountObj.text(parseInt(selectedCountObj.text()) - 1);
            }
          });
        }
      }
    }

    // Handler for when a checkbox selection is made
    function checkboxClicked(e){
      var clickedCheckbox = $(this);
      if(clickedCheckbox.attr('name')){
        updateAlignmentCount(clickedCheckbox, clickedCheckbox.prop('checked'));

        var relatedCheckboxes = $allCheckboxes.filter('[value="' + clickedCheckbox.val() + '"]').not(clickedCheckbox);
        if(clickedCheckbox.is(':checked')){
          relatedCheckboxes.not(':checked').prop('checked', true).closest('tr').addClass('checked-elsewhere');
        }
        else{
          relatedCheckboxes.filter(':checked').prop('checked', false).closest('tr').removeClass('checked-elsewhere');
          clickedCheckbox.closest('tr').removeClass('checked-elsewhere');
        }

        // sync the state of the "select all" checkbox
        $('.select-all-checkbox', context).prop('checked', ($allCheckboxes.not(':checked').length == 0));

        // check if we should tick the select all checkbox in each group
        $('.alignment-search-wrapper', collectionView).each(function(){
          var alignmentWrapper = $(this);
          if($('.alignment-group .form-checkbox:not(:disabled):not(:checked)', alignmentWrapper).length == 0){
            $('.alignments-checkbox', alignmentWrapper).attr('checked', 'checked');
          }
          else{
            $('.alignments-checkbox', alignmentWrapper).removeAttr('checked');
          }
        });

        // update the state of the submit button
        if($(collectionView).hasClass('import-view-question-bank')){
          toggleSubmitButton();
          updateSelectedCount();
        }
      }
    }

    function pointValueChanged(e){
      var changedObj = $(this);
      var relatedTextfields = $('.collection-item-point-value .form-text[name="' + $(this).attr('name') + '"]').not(changedObj);
      if(relatedTextfields.length){
        relatedTextfields.val(changedObj.val());
      }
    }

    // toggle the tbody views of collection item selection
    function toggleTableView(viewStr){
      if(viewStr == 'all'){
        viewAllLink.addClass('selected');
        viewSelectedLink.removeClass('selected');
        allContentsTable.show();
        if(selectedContentsTable){
          selectedContentsTable.hide();
        }
        autoSelectDropdownBtn.removeClass('disabled');
      }
      else{
        viewSelectedLink.addClass('selected');
        viewAllLink.removeClass('selected');
        allContentsTable.hide();
        if(!selectedContentsTable){
          //create the table for the first time
          selectedContentsTable = $('<tbody></tbody>').addClass('selected-contents').insertAfter(allContentsTable);
        }

        selectedContentsTable.html('');
        uniqueCheckboxes.filter(':checked').closest('tr').each(function(){
          var originalRowObj = $(this);
          var newRowObj = $(this).clone();
          newRowObj.find('.checked-elsewhere-message').remove();

          // need to rebind events. cloning with data and events does not work well with the tipsy plugin
          $('.form-checkbox', newRowObj).click(function(e){
            // mainCheckbox is the checkbox from the main view that corresponds to the one checked in the selected view
            var mainCheckbox = uniqueCheckboxes.filter('[value="' + $(this).val() + '"]');
            updateAlignmentCount(mainCheckbox, $(this).prop('checked'));
            checkboxClicked.apply(this, [e]);
            // make it appear as if the user clicked on the checkbox from the main page so the checked elsewhere message doesn't show up
            mainCheckbox.closest('tr').removeClass('checked-elsewhere');
          });
          $('.toggle-component-preview', newRowObj).click(function(){
            $(this).siblings('.component-preview').toggleClass('hidden');
          });
          $('.collection-item-point-value .form-text', newRowObj).keyup(pointValueChanged);
          var oldInfotip = newRowObj.find('.sCommonInfotip-processed');
          if(oldInfotip.length > 0){
            oldInfotip.removeClass('sCommonInfotip-processed');
            sAttachBehavior( 'sCommonInfotip' , newRowObj );
          }
          $('.s-library-question-bank-view-rubric.grading-rubric-launch', newRowObj).click(function(e){
            // prevent infinite recursion since clicking the child will click the parent
            // can't use event.stopPropagation in the angular component since in some screens we do want propagation
            if(e.target.id == "grading-rubric-launch-btn") {
              return;
            }
            $('.grading-rubric-launch.clickable', originalRowObj).click();
          });

          newRowObj.appendTo(selectedContentsTable);
        });
        selectedContentsTable.show();
        autoSelectDropdownBtn.addClass('disabled');

        // SGY-4365 issue with chrome in osx lion or higher not causing a repaint most likely due to the their snazzy scrollbars
        if(typeof $.browser.chrome != 'undefined'){
          var mainView = $("#library-main", context);
          mainView.hide(0, function(){
            mainView.show();
          });
        }
      }
    };

    /**
     * Capture the enter key in a text input within the provided form object.
     * The provided submit button will be triggered to click whenever the enter
     * key is captured.
     *
     * @param object formObj
     * @param object submitBtnObj
     */
    function submitOnEnterKeyDown(formObj, submitBtnObj){
      formObj.on('keydown', '.form-text', function(e){
        // 13 for enter
        if(e.keyCode == 13){
          submitBtnObj.trigger('click');
          e.preventDefault();
          e.stopPropagation();
        }
      });
    }

    viewAllLink.click(function(e){
      e.preventDefault();
      toggleTableView('all');
    });
    viewSelectedLink.click(function(e){
      e.preventDefault();
      toggleTableView('selected');
    });

    // import view specific behavior: cause the select all to switch back to the everything view
    $('.select-all-checkbox', wrapper).click(function(){
      toggleTableView('all');
    });

    // resetting the question bank selection whenever the import view area gets (re)loaded
    if($(collectionView).hasClass('import-view-question-bank')){
      toggleSubmitButton();
      updateSelectedCount();
    }

    $('table input[type=checkbox]', collectionView).click(checkboxClicked);

    // prevent clicking anything inside the dropdown from closing the action links box
    $('table .action-links', collectionView).click(function(e){
      e.stopPropagation();
    });
    $('table .action-links .submit-btn', collectionView).click(function(e){
      $(this).closest('.action-links').siblings('.action-links-unfold').click();
    });

    // automatically pick out a specified number of questions pseudorandomly and place them to the top
    $('#collection-item-auto-select-form', collectionView).each(function(e){
      var formObj = $(this);
      var textfieldObjs = $('.form-text', formObj);
      var submitBtnObj = formObj.find('.submit-btn');
      textfieldObjs.on('keyup', function(){
        var $thisTestField = $(this);
        var val = $thisTestField.val();
        if(val != '' && (isNaN(val) || val > max_additional_questions)){
          $(this).addClass('input-auto-picker-error');
          submitBtnObj.attr('disabled', true).each(function(){sTooltipOverlay(this,Drupal.t('Number of questions specified will cause exam to exceed question limit'));});
        } else {
          $(this).removeClass('input-auto-picker-error');
          submitBtnObj.removeAttr('disabled').each(function(){sTooltipOverlayRemove(this);});
        }
      });
      formObj.on('click', '.submit-btn', function(e){
        e.preventDefault();
        // start from scratch: uncheck everything and collapse all alignments
        $('tbody .form-checkbox:checked', collectionView).removeAttr('checked').closest('.checked-elsewhere').removeClass('checked-elsewhere');
        $('tbody .expandable:not(.closed)', collectionView).click();
        $('.alignment-data .alignment-count-selected').text(0);
        textfieldObjs.each(function(){
          var textfieldObj = $(this);
          var numQuestions = parseInt(textfieldObj.val());
          if(textfieldObj.hasClass('num-select-by-alignment')){
            var term_id = textfieldObj.attr('id').split('-').pop();
            var randomizationContext = $('tr#alignment-' + term_id + ' .alignment-group > table', collectionView);
            var selectAllCheckbox = $('tr#alignment-' + term_id + ' .alignments-checkbox', collectionView);
            if(numQuestions > 0){
              $('tr#alignment-' + term_id + ' .expandable').click();
            }
          }
          else{
            var randomizationContext = collectionView;
            var selectAllCheckbox = $('#collection-view-contents .select-all-checkbox', collectionView);
          }
          var uncheckedCheckboxObjs = $('tbody .collection-item-checkbox .form-checkbox:not(:checked)', randomizationContext);

          if(numQuestions >= uncheckedCheckboxObjs.length){
            // (optimization) skip calculation and just select everything in this case
            selectAllCheckbox.attr('checked', 'checked').each(sTriggerClick);
          }
          else{
            // pseudorandomly pick numQuestions number of elements and put them in the beginning
            var uncheckedArray = $.makeArray(uncheckedCheckboxObjs);
            var last_num = 0;
            for(var i = 0; i < numQuestions; i++){
              var pickedIndex = i + Math.floor(Math.random() * (uncheckedArray.length - i));
              // swap picked element to the beginning of the array
              if(pickedIndex != i){
                var tmp = uncheckedArray[pickedIndex];
                uncheckedArray[pickedIndex] = uncheckedArray[i];
                uncheckedArray[i] = tmp;
              }
            }

            // check all selected checkboxes
            var selectedObjs = $(uncheckedArray.splice(0, numQuestions));
            selectedObjs.attr('checked', 'checked').each(sTriggerClick);

            // move checkboxes' encapsulating tr's to the top of the tr's respective tbody
            var rowsToMove = selectedObjs.parent().parent().parent('tr');
            rowsToMove.prependTo(rowsToMove.parent());
          }
        });

        var alignmentGroups = $('.alignment-search-wrapper .alignment-group', collectionView);
        if(alignmentGroups.length > 0){
          // move all checked elsewhere rows directly above all unchecked rows in each section
          alignmentGroups.each(function(){
            var alignmentGroupObj = $(this),
                uncheckedCheckboxes = $('.form-checkbox:not(:checked)', alignmentGroupObj),
                checkedElsewhereRows = $('.checked-elsewhere', alignmentGroupObj);
            if(uncheckedCheckboxes.length > 0){
              // if there is an unchecked row, use that as a reference and put the rows above the first unchecked row
              checkedElsewhereRows.insertBefore(uncheckedCheckboxes.filter(':first').closest('tr'));
            }
            else {
              var rowsNotCheckedElsewhere = $('.form-checkbox:checked', alignmentGroupObj).closest('tr').not('.checked-elsewhere');
              if(rowsNotCheckedElsewhere.length > 0){
                // if there is a row that's checked but not from elsewhere, insert after the last of these
                checkedElsewhereRows.insertAfter(rowsNotCheckedElsewhere.filter(':last'));
              }
            }
          });
        }
      });

      formObj.on('click', '.randomize-cancel', function(e){
        e.preventDefault();
      });

      submitOnEnterKeyDown(formObj, submitBtnObj);
    });

    // fill out point value fields throughout the rest of the form from this one convenient mini-form
    $('#collection-item-set-points-form', collectionView).each(function(e){
      var formObj = $(this);
      var textfieldObj = $('.form-text', formObj),
          submitBtnObj = $('.submit-btn', formObj);
      submitBtnObj.click(function(e){
        e.preventDefault();
        var numPoints = parseInt(textfieldObj.val());
        if(numPoints > 0){
          $('.collection-item-point-value .form-text', collectionView).val(numPoints);
        }
      });
      submitOnEnterKeyDown(formObj, submitBtnObj);
    });

    // sync all point values for the same question that appears in multiple groups
    $('.collection-item-point-value .form-text', collectionView).keyup(pointValueChanged);
  });

  // search questions from question banks by alignments - result view
  $('.alignment-search-wrapper:not(.sLibrary-processed)', context).addClass('sLibrary-processed').each(function(){
    var resultWrapper = $(this);
    var alignmentGroup = $('.alignment-group', resultWrapper);
    // show/hide the group of questions
    $('.alignment-data', resultWrapper).click(function(){
      var expandableObj = $('.expandable', $(this));
      expandableObj.toggleClass('closed');
      if(expandableObj.hasClass('closed')){
        alignmentGroup.addClass('hidden');
      }
      else{
        alignmentGroup.removeClass('hidden');
      }
    });

    // select all questions within this group of alignments
    $('.alignments-checkbox', resultWrapper).click(function(){
      var relatedCheckboxes = $('.form-checkbox:not(:disabled)', alignmentGroup);
      if($(this).is(':checked')){
        relatedCheckboxes = relatedCheckboxes.not(':checked');
        relatedCheckboxes.attr('checked', 'checked');
      }
      else{
        relatedCheckboxes = relatedCheckboxes.filter(':checked');
        relatedCheckboxes.removeAttr('checked');
      }
      relatedCheckboxes.each(sTriggerClick);
    });
  });


  // question bank view - preview individual questions
  $('.toggle-component-preview:not(.sLibrary-processed)', context).addClass('sLibrary-processed').each(function(){
    $(this).click(function(){
      $(this).siblings('.component-preview').toggleClass('hidden');
      sPopupsResizeCenter();
    });
  });


  // UI for exporting assessment components into a question bank
  $('#s-library-copy-questions-to-resources-form:not(.sLibrary-processed)', context).addClass('sLibrary-processed').each(function(){
    var formWrapper = $(this);
    var newBankControls = $('.new-bank-name-wrapper, .new-bank-collection-row', formWrapper);

    var bankSelectBtn = $('#select-question-bank .action-links-unfold span', formWrapper);
    var bankNameInput = $('.new-bank-name-wrapper .form-text', formWrapper);
    var collectionSelectBtn = $('#select-collection .action-links-unfold span', formWrapper);

    var selectedFolderObj = $('input[name=dst_folder_id]', formWrapper);
    var selectedCollectionObj = $('input[name=dst_collection_nid]', formWrapper);

    var currentPopup = Popups.activePopup();
    if(currentPopup && !formWrapper.hasClass('resize-complete')){
      var popupObj = $('#' + currentPopup.id);

      if(selectedFolderObj.length){
        popupObj.addClass('select-bank');
      }
      else{
        popupObj.addClass('select-questions');
      }
      Popups.resizeAndCenter(currentPopup);
      formWrapper.addClass('resize-complete');
    }

    // convenience function to toggle the visibility of the new question bank controls.
    // will resize the popup if necessary
    var toggleNewBankControls = function(show){
      if(show){
        newBankControls.removeClass('hidden');
      }
      else{
        newBankControls.addClass('hidden');
      }
      if(currentPopup){
        Popups.resizeAndCenter(currentPopup);
      }
    }

    // selecting the new question bank will show the new question bank controls
    $('#new-question-bank-btn', formWrapper).click(function(){
      selectedFolderObj.val(0);
      bankSelectBtn.text($(this).text());
      toggleNewBankControls(true);
      bankNameInput.blur();
    });

    // toggle branch visibility via clicking the tree-node-menu-item
    $('#select-question-bank .tree-node-menu-item', formWrapper).click(function(){
      var menuItemObj = $(this);
      var toggleArrowObj = $('.expandable', menuItemObj);
      var menuTitle = menuItemObj.find('.tree-node-title');
      if (!menuTitle.hasClass('disabled')){
        if (menuItemObj.hasClass('deferred-load')){
          menuItemObj.removeClass('deferred-load'); // only do this once
          menuItemObj.addClass('load-wait');
          var relatedChildren = menuItemObj.siblings('.tree-children');
          var dataInput = relatedChildren.find('.deferred-load-span');
          var data = JSON.parse(dataInput[0].value);

          // for very large collections, we will Ajax the contents of each level
          if (!data.is_question_bank && !menuTitle.hasClass('disabled')){
            sToggleActiveLoader(data.folder_id, menuItemObj);
            $.ajax({
              type: "GET",
              url: "/resources/deferred_load_ajax/" + data.collection_nid + "/" + data.folder_id + "?depth=" + data.depth,
              dataType: "html",
              success: function(json){
                var parsed = JSON.parse(json);
                var disableItem = (0 === parsed.html.length) ? true : false;
                if (!disableItem) {
                  relatedChildren.html(parsed.html);
                  toggleArrowObj.removeClass('closed');
                  relatedChildren.removeClass('hidden');
                  menuItemObj.removeClass('load-wait');
                  // attach behaviors to this new content
                  $('#s-library-copy-questions-to-resources-form', context).removeClass('sLibrary-processed');
                  Drupal.attachBehaviors(context);
                }
                sToggleActiveLoader(data.folder_id);
                if(disableItem) {
                  menuTitle.addClass('disabled');
                  setOpacity(toggleArrowObj, 0.5);
                }
              }
            });
          }
        }
        else if (!menuItemObj.hasClass('load-wait')) {
          var relatedChildren = menuItemObj.siblings('.tree-children');
          if(toggleArrowObj.hasClass('closed')){
            relatedChildren.removeClass('hidden');
            toggleArrowObj.removeClass('closed');
          }
          else{
            relatedChildren.addClass('hidden');
            toggleArrowObj.addClass('closed');
          }
        }
      }
    });

    // don't close the dropdown when trying to operate the tree
    $('.s-common-expandable-tree').click(function(e){
      e.stopPropagation();
    });

    // clickable elements within the tree can be selected
    $('.s-common-expandable-tree .clickable', formWrapper).click(function(e){
      e.preventDefault();
      var lastSelected = formWrapper.data('lastSelected');
      if(typeof lastSelected != 'undefined'){
        lastSelected.removeClass('selected');
      }
      formWrapper.data('lastSelected', $(this).addClass('selected'));

      // update the hidden element with the id
      selectedFolderObj.val($(this).attr('value'));

      // update the text of the button to the selected question bank
      bankSelectBtn.text($(this).text());

      // hide the new question bank controls
      toggleNewBankControls(false);

      // close the action link menu
      $(this).parents('.action-links').siblings('.action-links-unfold').click();

      // very large lists could cause the window to scroll downward
      scrollTo(0,0);
      sPopupsResizeCenter();
    });

    // the new question bank name input has no label - uses placeholder text
    var tmpInput = document.createElement('input');
    var placeholderSupported = ('placeholder' in tmpInput);
    if(!placeholderSupported){
      bankNameInput.focus(function(){
        var newBankField = $(this);
        if(newBankField.val() == newBankField.attr('placeholder')){
          newBankField.val('').removeClass('pre-fill');
        }
      }).blur(function(){
        var newBankField = $(this);
        if(newBankField.val() == ''){
          newBankField.val(newBankField.attr('placeholder')).addClass('pre-fill');
        }
      });
    }

    // when changing the collection, update the text in the button and the value of the hidden element to record the id
    $('#select-collection .action-links li', formWrapper).click(function(){
      selectedCollectionObj.val($(this).attr('value'));
      collectionSelectBtn.text($(this).text());
    });

    $('.action-links-wrapper', formWrapper).sActionLinks({hidden: false});

    // allow the user to (de)select all questions in step one of the export
    $('.select-all-components:not(.sAssessment-processed)', formWrapper).addClass('sAssessment-processed').click(function(){
      $(this).parent().find('table .question-checkbox .form-checkbox').prop('checked', $('.form-checkbox', $(this)).prop('checked'));
    });
  });

  $('.s-library-question-bank-view-rubric:not(.sLibraryAddTemplateProcessed)').addClass('sLibraryAddTemplateProcessed').each(function(){
    $(this).bind('click', function(event){
      // prevent infinite recursion since clicking the child will click the parent
      // can't use event.stopPropagation in the angular component since in some screens we do want propagation
      if(event.target.id == "grading-rubric-launch-btn") {
        return;
      }
      $('.grading-rubric-launch.clickable', $(this)).click();
    });
  });
};

Drupal.behaviors.sLibraryActionLinks = function(context){
  $('.s-library-collections-list-forms:not(.sLibraryActionLinks-processed)', context).addClass('sLibraryActionLinks-processed').each(function(){
    var formObj = $(this);
    $('.links-left', formObj).each(function(){
      $('#links-left-options', $(this)).bind('click', function(){
        var btnObj = $(this);
        btnObj.toggleClass('active');
        var toolbarActions = $('#links-left-options-list', btnObj );

        if(btnObj.hasClass('active')){
          $('.action-links-wrapper-junior.active', btnObj.parents('.s-library-collections-list-forms'))
            .not(btnObj)
            .removeClass('active');

          $('.action-links', btnObj.parents('.s-library-collections-list-forms')).hide();

          toolbarActions.show();
        } else {
          toolbarActions.css('display', 'none');
        }
      });
    });
  });

  $('.resources-app-list:not(.sLibraryActionLinks-processed)', context).addClass('sLibraryActionLinks-processed').each(function(){
    var appList = $(this);
    $('.item-list .links-left', appList).each(function(){
      $('#links-left-options', $(this)).bind('click', function(){
        var btnObj = $(this);
        btnObj.toggleClass('active');
        var toolbarActions = $('#links-left-options-list', btnObj );

        if(btnObj.hasClass('active')){
          $('.action-links-wrapper-junior.active', btnObj.parents('.resources-app-list'))
            .not(btnObj)
            .removeClass('active');

          $('.action-links', btnObj.parents('.resources-app-list')).hide();
          toolbarActions.show();
        } else {
          toolbarActions.css('display', 'none');
        }
      });
    });
  });

  var actionWrappers = [
    '.collections-list .internal-header .collection-action-links:not(.sLibraryActionLinks-processed)',
    '.collections-list #external-header .collection-action-links:not(.sLibraryActionLinks-processed)',
    '#collection-view-contents .action-links-wrapper:not(.sLibraryActionLinks-processed)',
    '#collection-item-auto-select-wrapper:not(.sLibraryActionLinks-processed)',
    '.library-collection .group-action-links .action-links-wrapper:not(.sLibraryActionLinks-processed)',
    '.content-top-after-title-wrapper .info-container .action-links-wrapper:not(.sLibraryActionLinks-processed)',
  ];
  $(actionWrappers.join(','), context).addClass('sLibraryActionLinks-processed').each(function(){
      var collectionActionLinksWrapper = $(this);
      var linkObj = $(this, collectionActionLinksWrapper);

      if(!linkObj.hasClass('links-left')) {
        linkObj.sActionLinks({ hidden: false, wrapper: '.action-links-wrapper' });
      }

      $('#reorder-collections-btn' , linkObj).bind('click',function(){
        var formId = $(this).attr('relform');
        var formObj = $('#'+formId);
        $('.submit-buttons', formObj).show();
        var tableSelector = 'library-left-nav-shared';
        var formSelector = formId;
        // See comment on sLibraryEnableContentReorder to understand why this strangeness needs to happen.
        if(formObj.hasClass('s-library-collections-list-forms')){
          var isShared = formObj.hasClass('s-js-is-shared');
          tableSelector = isShared ?  'library-left-nav-shared' : 'library-left-nav';
          formSelector = isShared ? 's-library-collections-list-forms.s-js-is-shared' : 's-library-collections-list-forms';
        }
        sLibraryEnableContentReorder( tableSelector , formSelector );
      });

      $('#s-app-reorder-collections-btn' , linkObj).bind('click',function(){
        var formId = $(this).attr('relform');
        var formObj = $('#'+formId);
        $('.submit-buttons', formObj).show();
        sLibraryEnableContentReorder( 'library-left-nav' , 's-app-reorder-form' );
      });


    //Enable question tracking confirmation popup
    collectionActionLinksWrapper.on('click','.options-question-tracking', sLibraryBindTrackingPopup);
  });


  // Confirmation page for deleting a question bank
  var qBankTable = $('.collection-question-bank:not(.sLibraryActionLinks-processed)', context);
  qBankTable.addClass('sLibraryActionLinks-processed').on('click', 'a.action-delete', function(e){
    var linkObj = $(e.target);
    e.preventDefault();

    var popupBody = '<span class="confirm-message">' +
      Drupal.t('Are you sure you want to delete this question?') +'</span>';

    sCommonConfirmationPopup({
      title: Drupal.t('Delete Question'),
      body: popupBody,
      extraClass: 'resource-remove',
      confirm: {
        text: Drupal.t('Delete'),
        func: function(){
          $.ajaxSecure({
            url : linkObj.attr('href'),
            data: {ajax: true},
            success: function(data){
              sLibraryFormsOnUpdate(data, null, linkObj);
            },
            complete: function(){
              sPopupsClose();
            }
          });
        }
      }
    });
  });

};

Drupal.behaviors.sLibraryAjaxedLinks = function(context){

  if(context.body !== undefined || !(context instanceof jQuery)) {
    return;
  }

  // ajax links
  var ajaxLinksOuterLeftNav = context.hasClass('popups-body') ? ['a.resource-area-links'] : [];
  var ajaxLinksLeftNav = [
    '#library-left-nav a.collection-title',
    '#library-left-nav-rubric a.collection-title',
    '#library-left-nav-shared a.collection-title',
    '#library-left-nav-shared-rubric a.collection-title',
    '#library-external-collections a.collection-title',
    '#library-group-collections a.collection-title'
  ];
  var ajaxLinksCollectionViewLinks = [
    '#collection-title > a:not(.group-profile-link):not(.school-profile-link)',
    '#collection-view-contents .collection-item-is-folder a.item-title',
    '#collection-view-contents .collection-row-folder .collection-item-title  a.item-title',
    '#toolbar-folder-up a',
    '.library-collection-pager a',
    '.library-collection-more-btn-wrapper a',
    '.outcome-breadcrumb-title .group-link'
  ];
  var ajaxLinks = ajaxLinksLeftNav.concat(ajaxLinksCollectionViewLinks, ajaxLinksOuterLeftNav);

  for(i = 0; i < ajaxLinks.length; i++) {
    ajaxLinks[i] += ':not(.sLibraryAjaxedLinks-processed)';
  }

  function setCurrentSelectedMenuItem (link) {
    if ($(".current-item")) {
      $(".current-item").remove();
    }
    if (link && link.length) {
      link.append("<span class='visually-hidden current-item'>" + Drupal.t("Current selected item") + "</span>");
    } else {
      $(".library-collection .active").append("<span class='visually-hidden current-item'>" + Drupal.t("Selected menu item") + "</span>");
    }

  }

  setCurrentSelectedMenuItem();


  $(ajaxLinks.join(','), context).addClass('sLibraryAjaxedLinks-processed').bind('click.s-js-library-ajax-links', function(e){
    e.preventDefault();
    var clickedLink = $(this);
    var href = clickedLink.attr('href');
    var isOuterLeftNav = clickedLink.parents('#resources-left-menu-wrapper').length > 0;
    var isLeftNav = clickedLink.parents('#library-left').length > 0;
    var libraryWrapper = isOuterLeftNav
      ? clickedLink.parents('#resources-left-menu-wrapper').next('#library-wrapper')
      : clickedLink.parents('#library-wrapper');
    var isInfiniteScroll = clickedLink.parents('.library-collection-more-btn-wrapper').length > 0;
    var isResourceApp = clickedLink.hasClass('resources-app-title') && !clickedLink.hasClass('app-quick-installer-popup');

    setCurrentSelectedMenuItem(clickedLink);
    // goto public profile link
    if(href.search(/resources\/public\/[0-9]+\/profile/g) != -1) {
      location.href = href;
      return true;
    }

    // keep active state for left menu items
    if(isOuterLeftNav) {
      $(ajaxLinksOuterLeftNav[0], libraryWrapper.prev()).removeClass('active');
      // disable attach/import buttons for content apps
      var popupSubmitBtnWrapper = $('.import-view-submit-buttons', clickedLink.parents('.popups-body'));
      if(href.indexOf('/resources/apps') != -1) {
        // hide buttons and append message
        $('.submit-span-wrapper, .cancel-btn', popupSubmitBtnWrapper).hide();
        if($('.content-app-import-view-msg', popupSubmitBtnWrapper).length == 0) {
          var msg = Drupal.t('To import content from Resource Apps, use the action button provided inside the app.');
          popupSubmitBtnWrapper.append('<div class="content-app-import-view-msg">'+ msg +'</div>');
        }
      }
      else {
        // show buttons and remove message
        $('.content-app-import-view-msg', popupSubmitBtnWrapper).remove();
        $('.submit-span-wrapper, .cancel-btn', popupSubmitBtnWrapper).show();
      }
    }
    else if(isLeftNav) {
      $(ajaxLinksLeftNav.join(','), libraryWrapper).removeClass('active');
    }

    clickedLink.addClass('active');

    // We dont need to trigger the hashchange, append additional rows to collection table
    if(!libraryWrapper.hasClass('library-import-view') && !isInfiniteScroll) {
      if(isResourceApp) {
        sAppLauncher($('#library-main', libraryWrapper), {type: 'resources', isImport: false, url: href});
      }
      else {
        sLibrarySetHash( href );
      }
      return;
    }

    if(isInfiniteScroll) {
      var sLibraryView = sLibraryAreaDetection();
      libraryWrapper = sLibraryView.isMain ? libraryWrapper : clickedLink.parents('#content-wrapper');
      sLibraryUpdateMainContent(libraryWrapper, href, false, isOuterLeftNav, isInfiniteScroll);
      return;
    }

    // This is the import view, which is in a popup, call this function directly rather than triggering
    // a call to it by changing the window hash
    if(isResourceApp) {
      sAppLauncher($('#library-main', libraryWrapper), {type: 'resources', isImport: true, url: href});
    }
    else {
      sLibraryUpdateMainContent(libraryWrapper, href, true, isOuterLeftNav, isInfiniteScroll);
    }
  });

  // set active a.link for loaded hash
  var hash = sLibraryGetHash();
  var hashHref = hash.split('?');
  var hashHrefPath = hashHref.shift();
  var isPopup = context.parents('.popups-body').length > 0 || context.hasClass('popups-body');

  if(hashHrefPath.search(/resources\/(my|group|school|apps)\/([0-9]+|downloads|google_docs|public|e_portfolio|outcomes)/g) != -1 && !isPopup) {
    var leftNavLinks = $(ajaxLinksLeftNav.join(','));
    leftNavLinks.removeClass('active');
    leftNavLinks.filter('a[href="' + jqSelector( hashHrefPath ) + '"]' ).addClass('active');
  }
};

var sLibrarySubmitImportSelectForm = function(e, f, q, r){
  var libraryWrapper = $('#library-wrapper', f);
  var formWrapper = libraryWrapper.closest('form');
  var allCheckboxes = $('input.form-checkbox[name^=item]', formWrapper);
  var selected = {}

  allCheckboxes.each(function(){
    if($(this).attr('name')){
      var cbObj = $(this);
      var rowObj = cbObj.closest('tr');
      var external = rowObj.hasClass('collection-row-external');
      var item_name = $(this).attr('name').replace('[checkbox]','');

      if($(this).is(':checked')){
        var val = external ? $('.collection-item-title', rowObj).text() : 1;
        selected[item_name] = val;
      }
    }
  });

  $("#edit-selected", formWrapper).val(decodeURIComponent($.param(selected)));

  var import_content = '';
  if(window.sLibraryImportSelectedAppImportIds != undefined && allCheckboxes.length == 0) {
    import_content = $.toJSON(window.sLibraryImportSelectedAppImportIds);
  }
  $("#edit-import-content", formWrapper).val(import_content);
};

/**
 * Checks to see if the url passed in is a relative one
 *
 * @param string url
 * @returns {boolean}
 */
function sLibraryCallsToCurrentDomain(url) {
  var parser = document.createElement('a');
  parser.href = url;

  return parser.hostname === document.domain;
}

/**
 * PE-89884: Check for and prevent ajax requests from URL's that start with
 * '/link' or 'link' A given url can still be a valid url without a leading
 * '/', so we need to check for both '/link' and 'link'
 * @param string url
 * @returns {boolean}
 */
function sLibraryIsMaliciousUrl(url) {
  const maliciousBits = url.match(/(^\/link|^link)/);
  if (maliciousBits !== null) {
    return true;
  }
}

/**
 * Update the contents of the main library pane with the provided URL
 * When iScroll is set to true, the content will be appended instead of
 * replacing the existing content
 *
 * @param object context
 * @param string url
 * @param bool import_view
 * @param bool includeLeftNav
 * @param bool iScroll  whether or not this is a result of an infinite scroll
 *   paging. when true the resulting content is appended to the existing
 *   content
 */
function sLibraryUpdateMainContent(context, url, import_view, includeLeftNav, iScroll){
  if (!sLibraryCallsToCurrentDomain(url)) {
    return;
  }

  if (sLibraryIsMaliciousUrl(url)) {
    return;
  }

  var import_view = typeof import_view == 'undefined' ? true : import_view;
  var includeLeftNav = typeof includeLeftNav == 'undefined' ? false : includeLeftNav;
  var iScroll = typeof iScroll == 'undefined' ? false : iScroll;
  var isPopup = context.parents('.popups-body').length > 0 || context.hasClass('popups-body');

  if(!iScroll && !isPopup) {
    window.scrollTo(0, 0); // scroll to the top
  }

  var default_ajax_q = {ajax: ''};
  if(!import_view) {
    default_ajax_q.import_view = '0';
  }
  else{
    default_ajax_q.import_view = import_view;
  }

  // include left menu
  if(includeLeftNav) {
    default_ajax_q.include_left_menu = '';
  }

  var is_outcomes = false,
      is_home = url == '/resources';
  url = sLibraryMergeQueryString(url, default_ajax_q, import_view);

  // check if we are in resources or realm-profile
  if(url.search(/^\/(user|group|school)\/[0-9]+\//) != -1) {
    sToggleActiveLoader('sLibraryUpdateMainContent', (!iScroll ? $("#content-wrapper") : $('.library-collection-more-btn-wrapper', context)));

    // group outcomes from group materials area
    if( url.match(/\/group\/[0-9]+\/materials\/?\?ajax.+f=outcomes/) ){
      is_outcomes = true;
    }
  }
  else {
    // user outcomes from resources area
    if( url.match(/^\/resources\/my\/outcomes.*/) ){
      is_outcomes = true;
    }
    // group outcomes from resources area
    else if( url.match(/\/resources\/group\/[0-9]+\/?\?ajax.+f=outcomes/) ){
      is_outcomes = true;
    }

    // if this is the result of a search
    if( url.match(/\/resources\/search.*/) ){
      //need to add in JS bc no way to add server-side
      // also removing other "view" classes since we aren't viewing those anymore
      $('body').addClass('library-search').removeClass('apps-resources-view');
      $('#resources-left-menu-wrapper li a').removeClass('active');
    }
    else{
      //need to add in JS bc no way to add server-side
      $('body').removeClass('library-search');
    }

    if(!import_view){
      $('#main-content-wrapper > .messages').prependTo(context);
    }
    sToggleActiveLoader('sLibraryUpdateMainContent', (!iScroll ? $("#library-main", context) : $('.library-collection-more-btn-wrapper', context)));
  }

  $.ajax({
    type: "GET",
    url: url,
    dataType: "json",
    success: function(json){
      // redirect to settings page for google docs
      if(json.ajax_redirects && json.ajax_redirects.length) {
        location.href = json.ajax_redirects[0];
      }

	    sAngular.extractThemeData(json);

      var output = $(json.output);
      var drupalBehaviors = ['sLibrary', 'sLibraryActionLinks', 'sAppMenu', 'sLibraryAjaxedLinks', 'sAttachmentForm', 'extlink', 'popups', 'sCommonInfotip', 'sAttachMainRole', 'schoologyAngular', 'sAlignment'];

      if( is_outcomes ) {
        sToggleActiveLoader('sLibraryUpdateMainContent');
        sLibraryGradeOutcomeHandler( json , context );
        return;
      }

      var sLibraryView = sLibraryAreaDetection();
      if(sLibraryView.isSearch){
        drupalBehaviors.push('sLibrarySearch');
      }

      if(import_view) {
        drupalBehaviors.push('sLibraryAddTemplate');
        // need to preserve the url since it will get wiped out on subsequent pages because assignment_nid does not get carried over
        var oldAlignmentUrl = $('#resource-search-by-alignments', context).attr('href');
        if(includeLeftNav) {
          $('#library-left', context).replaceWith($('#library-left', output));
          sAttachBehaviors(['sLibraryLeftNav'], $('#library-left', context));
          // load first resource app
          if(url.split('?')[0] == '/resources/apps') {
            var apps = $('.resources-app-title:not(.app-quick-installer-popup)', context);
            if(apps.length > 0) {
              apps.first().addClass('active').trigger('click');
              // add cookie_preload urls to Drupal.settings
              if(
                typeof json.ajax_settings != 'undefined' &&
                json.ajax_settings != null &&
                typeof json.ajax_settings.s_app_cookie_preload_urls != 'undefined'
              )
              {
                sAppMenuCookiePreloadSet(json.ajax_settings.s_app_cookie_preload_urls);
              }
              return;
            }
          }
          // load first group
          if(url.split('?')[0] == '/resources/group') {
            var groups = $('#library-left-nav-rubric .collection-title', context);
            if(groups.length > 0) {
              groups.first().addClass('active').trigger('click');
            }
          }
        }

        if($('#schoology-app-container', output).length == 1) {
          $('#library-main', context).html( $('#schoology-app-container', output) );
        }
        else {
          $('#library-main', context).replaceWith($('#library-main', output));
          var libraryMainObj = $('#library-main', context);
          $('#resource-search-by-alignments', context).attr('href', oldAlignmentUrl);
          sAttachBehaviors(drupalBehaviors, libraryMainObj);
          sLibraryAjaxAttachPopups(libraryMainObj, json.popups, import_view);
          $("#s-library-import-select-wrapper-form #edit-path", context).val(url);
        }

        return;
      }

      // we need to check if this is an ajax-search request, the body class for search is added client-side
      if(sLibraryView.isApp && !sLibraryView.isSearch) {
        return;
      }

      if(iScroll) {
        var drupalBehaviors = ['sLibrary', 'sLibraryActionLinks', 'sAppMenu', 'sLibraryAjaxedLinks', 'extlink', 'popups', 'sCommonInfotip', 'schoologyAngular'];
        var collectionViewObjWrapper = $('#collection-view', context);
        if(sLibraryView.isSearch){
          drupalBehaviors.push('sLibrarySearch');
          collectionViewObjWrapper = context;
        }
        $('#collection-view-contents', context).append( $('#collection-view-contents tbody tr.collection-template-item-row', output) );
        $('.library-collection-more-btn-wrapper', context).replaceWith( $('.library-collection-more-btn-wrapper', output) );

        sAttachBehaviors(drupalBehaviors, collectionViewObjWrapper);
        sLibraryAjaxAttachPopups(collectionViewObjWrapper, json.popups, import_view);
      }
      else {
        if(!sLibraryView.isMain) {
          var collectionWrapperObj = $('#content-wrapper').html( $('#collection-view', output) );
          if(sLibraryView.isEport) {
            collectionWrapperObj.children().wrap('<div id="main" />');
          }
        }
        else {
          if(includeLeftNav) {
            drupalBehaviors.push('sLibraryAddTemplate');
            $('#library-left', context).replaceWith($('#library-left', output));
            sAttachBehaviors(drupalBehaviors.concat(['sLibraryLeftNav']), $('#library-left', context));
            sLibraryAjaxAttachPopups($('#library-left', context), json.popups, import_view);
          }
          $('#library-main', context).replaceWith($('#library-main', output));
          var collectionWrapperObj = $('#library-main', context);

          // clear and push messages to content container
          $('.ajax-messages-wrapper', collectionWrapperObj).remove();
          if(json.messages != '') {
            var ajaxMessageWrapper = $('<div class="ajax-messages-wrapper">' + json.messages + '</div>').prependTo(collectionWrapperObj);
            sAttachBehaviors(['schoology', 'sCommonCloseableMessage'], $('.ajax-messages-wrapper', collectionWrapperObj));
          }
        }
        sAttachBehaviors(drupalBehaviors.concat(['tableHeader']), collectionWrapperObj);
        sLibraryAjaxAttachPopups(collectionWrapperObj, json.popups, import_view);
      }

      if(typeof json.ajax_settings != 'undefined' && json.ajax_settings != null) {
        if(typeof json.ajax_settings.s_library_collection != 'undefined'){
          var lastRow = $('#collection-view-contents tbody tr.collection-template-item-row', collectionWrapperObj).last();
          var sortingEnabled = $('#collection-view-contents tbody:first', collectionWrapperObj).hasClass('ui-sortable');

          lastRow.sInfiniteScroll({
            loadMore: sLibraryInfiniteScrollHandler
          });

          if( !sortingEnabled ) {
            // update row count and total in header
            var rowCount = $('#collection-view-contents tbody tr.collection-template-item-row', collectionWrapperObj).length;
            var totalItems = json.ajax_settings.s_library_collection.pager_total_items;
            var countText = Utils.i18n.t("core.rows_of_total", {rows: rowCount, total: totalItems});
            $('.collection-paging-info', collectionWrapperObj).html(countText);
          }

          if( sortingEnabled ) {
            sLibraryRefreshContentReorder('collection-view-contents', 's-library-collection-reorder-items-form');
          }
        }
        else if(typeof json.ajax_settings.s_search_resources != 'undefined'){
          var lastRow = $('#collection-view-contents tbody tr.collection-template-item-row:last', collectionWrapperObj);
          lastRow.sInfiniteScroll({
            loadMore: sLibraryInfiniteScrollHandler
          });
        }
      }

      //hide the search form
      $('#library-search-form-wrapper').hide();

      //set active a.link for loaded hash
      var hash = sLibraryGetHash();
      var hashHref = hash.split('?');
      var hashHrefPath = hashHref.shift();
      var isPopup = context.parents('.popups-body').length > 0 || context.hasClass('popups-body');

      if(hashHrefPath.search(/resources(\/(my|group|school|find))?/) != -1 && !isPopup) {
        var outerLeftNavLinks = $('#resources-left-menu-wrapper li a');
        outerLeftNavLinks.removeClass('active');
        if($('.collections-list-wrapper.library-group-collections', context).length == 1) {
          outerLeftNavLinks.filter('a[href="/resources/group"]').addClass('active');
        }
        else if($('.collections-list-wrapper.library-common-assessment-collections', context).length > 0) {
          outerLeftNavLinks.filter('a[href="/resources/common_assessment"]').addClass('active');
        }
        else if($('.collections-list-wrapper', context).length > 0) {
          outerLeftNavLinks.filter('a[href="/resources"]').addClass('active');
        }
      }

      sToggleActiveLoader('sLibraryUpdateMainContent');

      if (!iScroll) {
        sLibraryScrollToTemplate();
      }
    }
  }).fail(function(jqXHR){
    // if the user suddenly loads a collection he/she no longer has access to
    // bounce back to the home collection instead of infinitely showing the active loader
    if(!is_home && jqXHR.status == 403){
      sToggleActiveLoader('sLibraryUpdateMainContent');
      sLibrarySetHash('/resources');
    }
  });
}

function sLibraryAjaxAttachPopups(context, popups, import_view) {
  // popups_add_popups() does not work for ajaxed content since the
  // popups are never added to Drupal.settings.popups
  // so let's attach them manually;
  //    add the popup settings to the ajax response [See s_common_ajax_output()]
  var doneTestPattern = new RegExp('.*','g');
  if (popups) {
    $.each(popups, function (link, options) {
      if($(link).parents('#library-wrapper').length === 1 || $(link).parents('#collection-view').length) {
        // capture popup-form submissions, sLibraryFormsOnUpdate() will update the appropriate sections (left nav, collection-view-table)
        if(!options.skipLibraryAttach){
          options.doneTest = doneTestPattern;
          options.updateMethod = 'callback';
          options.onUpdate = 'sLibraryFormsOnUpdate';
        }
        Popups.attach(context, link, Popups.options(options));
      }
    });
  }

  sLibraryFixFormTargets();
}

function sLibraryFixFormTargets() {
  var formHref = sLibraryGetHash();
  // update the form/cancel paths in left-menu
  $('.s-library-collections-list-forms, .s-app-reorder-form').each(function() {
    var reOrderForm = $(this);
    reOrderForm.attr('action', formHref);
    $('.cancel-btn', reOrderForm).attr('href', formHref);
  });
}

function sLibraryFormsOnUpdate(data, options, element) {
  var currentUrl = sLibraryGetHash();
  var messages = $(data.messages);
  // unexpected error or invalid json returned; reload page
  if(data === undefined || data.path == null) {
    location.href = currentUrl;
  }
  var popupErrors = 0;
  messages.each(function(){
    if($(this).hasClass('error')) {
      popupErrors++;
    }
  });

  if(popupErrors > 0 && data.content != '') {
    Popups.addCSS(data.css);
    var inlines = Popups.addJS(data.js);
    Popups.removeLoading();
    var updatedPopup = Popups.openPathContent(data.path, data.title, data.messages + data.content, element, options, null);
    $(document).trigger('popups_form_success_notdone', [updatedPopup,data]);
    Popups.addInlineJS(inlines);
  }
  else {
    // handle redirects
    var is_assessment = (data.path.search(/^template\/[0-9]+\/assessment\/questions/) != -1);
    var is_course_template = (data.path.search(/course.*/) != -1);
    if(is_assessment || is_course_template) {
      location.href = '/' + data.path;
      return false;
    }
    var is_resource_assessment = (data.path.search(/^template\/[0-9]+\/resource-assessment/) != -1);

    if(is_resource_assessment) {
      location.href = '/' + data.path + '?' + data.path_query;
      return false;
    }

    // collection deleted; redirect user to default collection
    if($(element).hasClass('collection-delete')) {
      location.href = '/resources';
      return false;
    }
    else if($(element).hasClass('collection-rename')) {
      location.href = currentUrl;
      return false;
    }

    // push messages to the DOM
    var libraryWrapper = $(element).parents('#library-wrapper');

    $('.popup-messages-wrapper').remove();
    var messageContainer = (libraryWrapper.length == 1) ? libraryWrapper : '#main-content-wrapper';
    var popupMessageWrapper = $('<div class="popup-messages-wrapper">' + data.messages + '</div>').prependTo(messageContainer);
    $('.warning', popupMessageWrapper).remove();
    $('.messages', popupMessageWrapper).addClass('temp');
    sAttachBehaviors(['schoology'], $('.popup-messages-wrapper'));

    Popups.close();

    // Broadcast an event that popup form was done and successful.
    // enrollment-invite-popup calls this to empty the selected UID global
    $(document).trigger('popups_form_success', [null, data]);

    var includeLeftNav = $(element).parents('#library-left').length === 1 || $('body').hasClass('common-assessment-resources-view');
    sLibraryUpdateMainContent(libraryWrapper, currentUrl, libraryWrapper.hasClass('library-import-view'), includeLeftNav);
  }

  return false;
}

function sLibraryMergeQueryString(url, default_ajax_q, import_view) {
  var url_q = {};
  var url_split = url.split('?');
  if(url_split[1] !== undefined) {
    var url_qvars = url_split[1].split('&');
    for(i = 0; i < url_qvars.length; i++) {
      url_q[ url_qvars[i].split('=')[0] ] = url_qvars[i].split('=')[1];
    }
  }

  var ajax_q = $.extend({}, default_ajax_q, url_q);
  var ajax_q_str = '';
  for(var i in ajax_q) {
    ajax_q_str += '&' + i + (ajax_q[i] != '' ? '=' + ajax_q[i] : '');
  }
  var ajax_url = url_split[0] + '?' + ajax_q_str.substring(1);

  return ajax_url;
}

/*
 * This function identifies forms by class (strange because almost everywhere else we identify form by #id).
 * The motivation for this is our sticky headers: the sticky header duplicates the forms meaning there is one
 * form in the sticky header, and one in the regular header.  To overcome this we select the form by class.
 */
function sLibraryEnableContentReorder( tableId , saveFormClass ) {
  var tableObj = $( '#' + String(tableId) + ' tbody');
  var formObj = $( '.' + String(saveFormClass) );

  $('.drag-handle', tableObj).show();
  tableObj.addClass('sorting');

  var sort_opts = {
    handle: '.drag-handle',
    helper: function(e, ui) {
      ui.children().each(function() {
        $(this).width($(this).width());
      });
      return ui;
    },
    stop: function(e, ui) {
      $('.reorder-weight-input', formObj ).val(tableObj.sortable('toArray').toString());
    },
    axis: 'y',
    items: 'tr.draggable'
  };

  tableObj.sortable( sort_opts );
  $('.collection-paging-info', formObj.parent()).hide();
  formObj.show();

  sAttachBehaviors(['sAppMenu', 'sLibraryAjaxedLinks'], formObj);
}

function sLibraryAutoArrange( tableId , saveFormId ) {
  var tableObj = $( '#' + String(tableId) + ' tbody');
  var formObj = $( '.' + String( saveFormId) );

  sLibraryEnableContentReorder( tableId, saveFormId);

  var sorted = $.makeArray($('tr', tableObj)).sort(function(a, b){
    var $a = $(a);
    var $b = $(b);

    if($a.hasClass('collection-row-folder') && !$b.hasClass('collection-row-folder'))
      return -1;

    if(!$a.hasClass('collection-row-folder') && $b.hasClass('collection-row-folder'))
      return 1;

    var aTitle = $('.collection-item-title a', $a).text().toLowerCase();
    var bTitle = $('.collection-item-title a', $b).text().toLowerCase();

    if(aTitle == bTitle)
      return 0;

    return (aTitle < bTitle) ? -1 : 1;
  });

  tableObj.empty().append($(sorted));
  $('#edit-weights', formObj ).val(tableObj.sortable('toArray').toString());
}

function sLibraryGetHash() {
  return window.location.hash.substring(1);
}

// Store the full page location in the window hash so the navigational location can be retraced later
function sLibrarySetHash( hash ) {
  if(hash == undefined) {
    hash = window.location.pathname + window.location.search;
    window.location.replace('#' + hash);
  }
  else {
    // This triggers an onhashchange event that will AJAX in new content to the page
    window.location.hash = hash;
  }
  // browser bug on hashchange; reattach favicon link
  var link = $('link[type="image/x-icon"]').remove().attr("href");
  $('<link href="'+ link +'" rel="shortcut icon" type="image/x-icon" />').appendTo('head');
}

/**
 * Extract grade outcome info based on dom structure
 *
 * @returns {{wrapperDom: jQueryElement, isGroup: boolean, baseUrl: string}}
 */
function sLibraryGetGradeOutcomeInfoFromDom() {
  var outcomeWrapperObj = $('.outcomes-admin-list');
  var groupLinkObj = $('.outcome-breadcrumbs a.group-link', outcomeWrapperObj);
  var isGroup = groupLinkObj.length > 0;
  var baseUrl;
  if (isGroup) {
    var groupCollectionNid = groupLinkObj.attr('data-group-collection-nid');
    baseUrl = '/resources/group/' + groupCollectionNid + '/?f=outcomes&folder=';
  } else {
    baseUrl = '/resources/my/outcomes?folder=';
  }

  return {
    wrapperDom: outcomeWrapperObj,
    isGroup: isGroup,
    baseUrl: baseUrl
  };
}

function sLibraryGradeOutcomeHandler( json , context ) {
  if( json.js )
    Popups.addJS( json.js );
  if( json.css )
    Popups.addCSS( json.css );

  /* There is an existing bug in this file whereby sLibraryUpdateMainContent is passed the
   * invalid context $('#library-wrapper') when used in a non-resources view like
   * group materials. Rather than attempting to fix this issue, this function will simply
   * operate without relying on the second parameter.
   * The refactor ticket for this issue is SGY-5151
   */

  var wrapperObj = $('#library-main', context );
  var scroll_url = '/resources/my/outcomes';

  // Group materials view
  if( !wrapperObj.length ) {
    $('#content-wrapper').html('<div id="collection-view"></div>');
    wrapperObj = $('#collection-view');

    var group_nid = String( Drupal.settings.s_grade_outcome_list.realm_id );
    scroll_url = '/group/' + group_nid + '/materials';
  }

  wrapperObj.html( $('<div />').append(json.output).html() );
  // Prevent specific behaviors in Drupal.behaviors.sGradeOutcome from attaching
  $('.outcomes-admin-list', wrapperObj ).addClass('sGradeOutcome-processed');

  Drupal.attachBehaviors( wrapperObj );

  // Overwrite the scroll-on-load ajax url to be library compatible
  Drupal.settings.s_grade_outcome_list.scroll_load_href = scroll_url;

  // Overwrite navigational link functionality for library compatibility

  var gradeOutcomeInfo = sLibraryGetGradeOutcomeInfoFromDom();
  var outcomeWrapperObj = gradeOutcomeInfo.wrapperDom;
  // Is this a group collection list in resources, as opposed to a group materials view?
  var is_group = gradeOutcomeInfo.isGroup;
  var base_url = gradeOutcomeInfo.baseUrl;

  if( is_group ) {
    Drupal.settings.s_grade_outcome_list.scroll_load_href = base_url;
  }

  $('.item-row-folder .item-title a', outcomeWrapperObj).each(function(){
    $(this).unbind('click').bind('click',function(e){
      e.preventDefault();
      var folder_id = String($(this).closest('tr').attr('id').split('-').pop());
      sLibrarySetHash( base_url + folder_id );
    });
  });

  $('.toolbar-folder-up, .outcome-breadcrumbs a:not(.group-link)' , outcomeWrapperObj ).each(function(){
    $(this).unbind('click').bind('click',function(e){
      e.preventDefault();
      var folder_id = $(this).attr('data-folder');
      folder_id = folder_id ? String(folder_id) : '0';
      sLibrarySetHash( base_url + folder_id );
    });
  });
}

function sLibraryAreaDetection() {
  var bodjObj = $('body');
  return {
    isGroup: bodjObj.hasClass('group-resources'),
    isSchool: bodjObj.hasClass('school-resources'),
    isEport: bodjObj.hasClass('e-portfolio-resources'),
    isMain: bodjObj.hasClass('library-view'),
    isApp: bodjObj.hasClass('apps-resources-view'),
    isSearch: bodjObj.hasClass('library-search'),
    isCommonAssessment: bodjObj.hasClass('common-assessment-resources-view')
  }
}

function sLibraryInfiniteScrollHandler(anchorObj) {
  var sLibraryView = sLibraryAreaDetection();
  var parentsSelector = sLibraryView.isMain ? '#library-main' : '#content-wrapper';
  var moreBtn = $('.library-collection-more-btn-wrapper a', anchorObj.parents(parentsSelector));
  if(moreBtn.length > 0) {
   var sLibraryContentWrapper = sLibraryView.isMain ? $('#library-wrapper') : $('#content-wrapper');
   sLibraryUpdateMainContent(sLibraryContentWrapper, moreBtn.attr('href'), false, false, true);
  }
}

function sLibraryRefreshContentReorder(tableId, saveFormId){
  var tableObj = $( '#' + String(tableId) + ' tbody:first');
  $('.drag-handle', tableObj).hide();
  tableObj.removeClass('sorting');
  tableObj.sortable("destroy");
  sLibraryEnableContentReorder(tableId, saveFormId);
}

function sLibraryBindTrackingPopup(e){
  var target = $(e.target);
  if(target.hasClass('disable-tracking')){
    $.ajaxSecure({
      url : target.attr('href'),
      complete: function(){
        sPopupsClose();
        location.reload();
      }
    });
  }
  else if(!target.hasClass('has-usage')){
    var enableQTrackBody = '<p>' + Drupal.t('This will enable questions in this bank to be tracked each time they are added to a Test/Quiz. In order to guarantee tracking accuracy, once any question in this bank is used in a Test/Quiz its content is locked and cannot be edited.') + '</p>';
    enableQTrackBody += '<p>' + Drupal.t('Are you sure you want to enable Question Tracking?') + '</p>';
    sCommonConfirmationPopup({
      title: Drupal.t('Question Tracking'),
      body: enableQTrackBody,
      extraClass: ' enable-question-tracking',
      confirm: {
        text: Drupal.t('Enable'),
        func: function(){
          $.ajaxSecure({
            url : target.attr('href'),
            complete: function(){
              sPopupsClose();
              location.reload();
            }
          });
        }
      }
    });
  }
}

function sLibraryScrollToTemplate() {
  var queryString = window.location.hash.split('?')[1];
  if (typeof queryString != 'undefined') {
    $.each(queryString.split('&'), function(index, value){
      var queryParam = value.split('=');
      if (typeof queryParam != 'undefined' && queryParam[0] == 'find' && $.isNumeric(queryParam[1])) {
        var target = $('#t-' + queryParam[1]);
        if (target.length) {
          $('html, body').animate({
            scrollTop: target.offset().top - 60
          }, 1000);
          target.effect("highlight", {color: "#f9b974"}, 4000);
        }
        return;
      }
    });
  }
}

/**
 * Method for the popup_form_success event for CA Teams
 * to help the flow of the resources page
 *
 * @param object e
 * @param object popup
 * @param object data
 */
function sLibraryHandleCATeamPopupSuccess(e, popup, data){
  // In case popup isn't available (which happens when materials get created for some reason)
  if(!popup || !popup.options) return;

  var isCATeam = popup.options.extraClass && popup.options.extraClass.match(/is-ca-team/i);
  var notReloading = popup.options.updateMethod != 'reload';
  if(isCATeam && notReloading){
    $(window).hashchange();
  }
}

/**
 * Deprecated method for popups module to call after deleting a resource
 * @returns {boolean}
 */
function sLibraryClickBackToResourcesLink() {
  $('.schoology-back-to-resources-link').get(0).click();
  // Return false to let popups module know that the popup can be closed
  return false;
}

/**
 * Method for popups module to call after deleting a resource
 * @returns {boolean}
 */
function sLibraryClickResourceAssessmentFolderLink() {
  // The last breadcrumb is the resource, the second to last is its closest folder
  $('nav[aria-label="Breadcrumb"] li:nth-last-child(2) a').get(0).click();

  // Return false to let popups module know that the popup can be closed
  return false;
}

/**
 * Evalutes the url to see if it matches the expected Content Nav Launch URL
 * @param href
 * @returns {boolean}
 */
function sLibraryIsContentNavLaunch(href) {
  Drupal.settings.s_library = Drupal.settings.s_library || {};
  var contentNavAppNid = Drupal.settings.s_library.content_nav_app_nid || '';
  var expectedContentNavLaunchUrl = '/resources/apps/' + contentNavAppNid + '/run';
  return href == expectedContentNavLaunchUrl;
}

/**
 * Triggers App Launch with passed param
 * @param href
 */
function sLibraryRunResourceAppLaunch(href) {
  sAppLauncher($('#library-wrapper #library-main'), {
    type: 'resources',
    isImport: false,
    url: href
  });
}
