Drupal.behaviors.sSchool = function(context){

  $('.notification-settings:not(.sSchool-processed)', context).addClass('sSchool-processed').each(function(){
	  sUserSetupRealmNotifButton($(this));
  });

  $('#s-school-requested-user-info-settings-form:not(.sSchool-processed)').addClass('sSchool-processed').each(function(){
    var form = $(this);
    var checkbox = $("#edit-enable-collection", form);
    var message =$("#edit-message-wrapper", form);
    $("#edit-enable-collection-wrapper", form).bind('click', function(){
      var checked = checkbox.is(':checked');
      if(checked)
        message.show();
      else
        message.hide();
    }).click();
  });

  $('#s-school-manage-requested-user-info-form:not(.sSchool-processed)').addClass('sSchool-processed').each(function(){
    $('.selection-toggle',$(this)).bind('click',function(){
       var checked = $(this).is(':checked');

       $('.form-checkbox.bulk',$('#s-school-manage-requested-user-info-form')).each(function(){
         $(this).prop('checked',checked);
       });
    });

    $('#approve-btn').bind('click',function(){
      var form = $('#s-school-manage-requested-user-info-form');
      $('#edit-bulk-action',form).val('approve');
      form.submit();
    });

    $('#deny-btn').bind('click',function(){
      var form = $('#s-school-manage-requested-user-info-form');
      $('#edit-bulk-action',form).val('deny');
      form.submit();
    });

    $('#export-btn').bind('click',function(){
      var form = $('#s-school-manage-requested-user-info-form');
      $('#edit-bulk-action',form).val('export');
      form.submit();
    });
  });

  $('#school-events:not(.sSchool-processed)').addClass('sSchool-processed').each(function(){
    var events = $(this);
    var selector = $('h3#event-selector', events);
    $('#event-calendar', selector).click(function(){
        var popup = new Popups.Popup();
        var body = '<div id="fcalendar" style="width: 800px;"></div>';
        var buttons = {
            'popup_cancel': {title: Drupal.t('Close'), func: function(){popup.close();}}
        }
        popup.extraClass = 'popups-extra-large calendar-popup-mini';
        popup.open(Drupal.t('Calendar'), body, buttons);
        Drupal.attachBehaviors();
        $("#share-calendar-option-containter .share-calendar-option").insertAfter("#fcalendar");
        sPopupsResizeCenter();
    });

  });

  $('.profile-picture-wrapper:not(.sSchool-processed)', context).addClass('sSchool-processed').each(function(){
    var wrapper = $(this);
    var link = $('.edit-profile-picture-hover', wrapper);
    var pic = $('.profile-picture', wrapper);
    var uploader = $('#profile-picture-uploader-wrapper', wrapper);

    link.bind('click', function(){
      if(uploader.is(':visible')){
        uploader.hide();
      }
      else {
        uploader.show();
      }
    });

    $('body').bind('click', function(e){
      var target = $(e.target);
      if(!target.hasClass('profile-picture-wrapper') && target.parents('.profile-picture-wrapper').length == 0){
        uploader.hide();
      }
    });

    pic.bind('s_profile_picture_uploaded', function(e, path){
      $('img', $(this)).attr('src', path).removeAttr('height');
      uploader.hide();
    });
  });

  $('#s-common-school-picker-form:not(.sSchool-processed)', context).addClass('sSchool-processed').each(function(){
    new sSchoolSearch(this);
  });

  $('#s-school-reject-school-request-form:not(.sSchool-processed)', context).addClass('sSchool-processed').each(function(){
    var message = Drupal.t('Explain why the new School creation request was rejected');
    $('.explanation-area', context).focus(function() {
      $(this).removeClass('pre-fill');
      if ($(this).val() == message) {
        $(this).val('');
      }
    }).blur(function() {
      $(this).addClass('pre-fill');
      if ($(this).val() == '') {
        $(this).val(message);
      }
    });
  });

  $('#s-school-select-form:not(.sSchool-processed)', context).addClass('sSchool-processed').each(function(){
    var form = $(this);
    form.ajaxForm({
      beforeSubmit: function(arr, $form, options){
        // Progress overlay
        var width = form.width();
        var height = form.height();
        var overlay = $('<div id="ajax-form-overlay"></div>');
        overlay.css({
          'height': height + 'px',
          'width': width + 'px',
          'background-color': 'white',
          'opacity': .4,
          'position': 'absolute'
        });
        form.prepend(overlay);
      },
      success: function( data ){
        $('#ajax-form-overlay').remove();
        $('#form-messages', form).remove();
        $('.form-item .error', form).removeClass('error');

        if(data.messages){
          form.prepend('<div id="form-messages">' + data.messages + '</div>');
        }
        if(data.error_fields){
          jQuery.each(data.error_fields, function(key, fieldName){
            $('#edit-' + fieldName, form).addClass('error');
          });
        }
        if(data.redirect){
          window.location = data.redirect;
        }
      }
    });

    var cboxObj = $('#edit-no-website', form);
    var websiteObj = $('#edit-website', form);
    cboxObj.click(function(){
      sSchoolDisableWebsiteField(cboxObj, websiteObj);
    });
  });

  $('.s-school-moderate-table-wrapper:not(.sSchool-processed)', context).addClass('sSchool-processed').each(function(){
    var wrapper = $(this);
    var actionsLink =  $('.action-links-wrapper', wrapper);
    var selectedSchool = $('.selected-school', wrapper);
    var transferLink = $('.action-transfer', wrapper);
    actionsLink.sActionLinks({hidden: false });

    transferLink.click(function(){
      if(transferLink.hasClass('disabled')){
        return false;
      }
    });

    $('tr', wrapper).each(function(){
      var rowObj = $(this);
      var rowOffset = $('td.requested-school-title', rowObj).position();
      var schSearch = $('.school-search-wrapper', wrapper);

      rowObj.click(function(){
        if(!rowObj.hasClass('has-advanced')){
          return;
        }
        if(rowOffset){
          if(!rowObj.hasClass('active-row')){
            var activeRow = $('.active-row', wrapper);
            var rowTerm = rowObj.data('search-term');
            var rowResults = rowObj.data('search-results');
            var searchInput = $('.search-wrapper input', wrapper);
            var schoolsWrapper = $('#schools-wrapper', wrapper);
            if(rowResults){
              schoolsWrapper.html(rowResults);
              schoolsWrapper.show();
              rowObj.addClass('with-results');
            }
            else{
              schoolsWrapper.hide();
            }
            searchInput.val(rowTerm);
            schoolsWrapper.removeClass('sSchool-processed');
            Drupal.attachBehaviors(schSearch);
            $('.active-row').removeClass('with-results');
            $('.active-row').removeClass('active-row');

            schSearch.css('left', rowOffset.left);
            schSearch.css('top', rowOffset.top + rowObj.height() + 20);
            schSearch.show();
            rowObj.addClass('active-row');

            var schoolTitle = $('.requested-school-title', rowObj).text();
            $('#edit-query-hidden', wrapper).val(schoolTitle);
            $('.school-search', wrapper).val(schoolTitle);

            var countrySelect = $('#edit-search-country', wrapper);
            var defaultCountryCode = rowObj.attr('school_country');
            countrySelect.val(defaultCountryCode).trigger('change');

            var regionSelect = $('.region-list-active select', wrapper);
            var defaultState = rowObj.attr('school_state');
            if(sSchoolSearch.isTextfieldCountry(defaultCountryCode)){
              $('#edit-state-textfield', wrapper).val(defaultState);
            }
            else{
              regionSelect.val(defaultState);
            }



            $('#edit-search-city', wrapper).val(rowObj.attr('school_city'));
          }
        }
      });
    });

    $('.sort', wrapper).each(function(){
      var sortLink = $(this);
      sortLink.click(function(){
        window.location.href = '/sgy-manager/moderated-schools?sort=' + sortLink.attr('id');
      });
    });

  });

  $('#edit-departments:not(.sSchool-processed)', context).addClass('sSchool-processed').each(function(){
    var elem = $(this);
    var form = elem.parents('form');

    elem.bind('change', function(){
      $("#edit-dept-submit", form).click();
    });
  });

  // bind the country/region selection UI so...
  // picking a country with regions will show the regions select
  // picking a country without regions will hide the regions select
  $('.create-demo-school-form:not(.sSchool-processed), #s-school-add-form:not(.sSchool-processed), #s-user-verification-addschool-form:not(.sSchool-processed), #s-school-create-enterprise-school-form:not(.sSchool-processed)', context)
      .addClass('sSchool-processed').each(function(){
    var formObj = $(this);
    var isDemoSchoolForm = formObj.hasClass('create-demo-school-form');
    var countrySelect = $('#edit-country', formObj);
    var regionLists = $('.region-list', formObj);
    if(countrySelect.length && regionLists.length){
      sSchoolSearch.sSchoolBindCountryChange(countrySelect, regionLists, function(){
        if(formObj.closest('.popups-body').length){
          // resize when the state/province field is shown/hidden
          sPopupsResizeCenter();
        }
      });
      countrySelect.trigger('change');
    }

    if(!isDemoSchoolForm){
      var cboxObj = $('#edit-no-website', formObj);
      var websiteObj = $('#edit-website', formObj);
      cboxObj.click(function(){
        sSchoolDisableWebsiteField(cboxObj, websiteObj);
      });
      sSchoolDisableWebsiteField(cboxObj, websiteObj);
    }
  });

  //School Settings action links
  $('#s-school-settings:not(.sSchool-processed)', context).addClass('sSchool-processed').each(function() {
    $(this).sActionLinks( {
      hidden : false,
      wrapper : '.action-links-wrapper'
    });
  });

}

function sSchoolDisableWebsiteField(cboxObj, websiteObj){
  if(cboxObj.prop('checked')){
    websiteObj.addClass('disabled');
    websiteObj.attr('disabled', true);
    websiteObj.val('');
    websiteObj.removeClass('error');
  }
  else{
    websiteObj.removeClass('disabled');
    websiteObj.attr('disabled', false);
  }
}

function sSchoolEditUserInfoCallback(data, options, element){
  var form = $('#s-school-manage-requested-user-info-form');

  var id = $(element).attr('id');
  var content = data.content
  var row = $('#'+id, content).parents('tr');
  var rowId = row.attr('id');

  formRow = $('#'+ rowId, form);
  var replaces = ['.name-first', '.name-middle', '.name-last', '.school-uid'];
  $(replaces).each(function(index, value){
    $(value, formRow).replaceWith($(value, row));
  });
  Popups.close();
  return false;

}

/**
 * Object responsible for the UI for searching/selecting a school.
 *
 */
function sSchoolSearch(context){
  this.init(context);
}

sSchoolSearch.isTextfieldCountry = function(countryCode){
  return (typeof Drupal.settings.s_common.textfieldCountries != 'undefined' && typeof Drupal.settings.s_common.textfieldCountries[countryCode] != 'undefined');
}

/**
 * Link the countrySelect and regionLists element so selecting a country from the countrySelect
 * will determine whether or not to show the regionList.
 *
 * @static
 * @param object countrySelect
 * @param object regionLists
 * @param function onChange
 */
sSchoolSearch.sSchoolBindCountryChange = function(countrySelect, regionLists, onChange){
  countrySelect.bind('change.s_school_search_form, keyup.s_school_search_form', function(){
    var countryCode = $(this).val();
    var textfieldWrapper = $(this).parents('.form-item:first').siblings('.s-js-state-textfield-wrapper');
    var currentRegionList = regionLists.filter('.region-list-active');
    var regionList = regionLists.filter('.region-list-' + countryCode);
    if(regionList.length > 0){
      if(currentRegionList.length > 0){
        currentRegionList.removeClass('region-list-active').hide();
        regionList.addClass('region-list-active').show();
        if(typeof onChange == 'function'){
          onChange.apply(this, []);
        }
      }
      else{
        regionList.addClass('region-list-active').stop(true, true).slideDown(250, onChange);
      }
    }
    else if(currentRegionList.length > 0){
      currentRegionList.find('select').val(0);
      currentRegionList.removeClass('region-list-active').stop(true, true).slideUp(250, onChange);
    }

    // Or if we are giving this country a textfield .. similar logic as above but different elements
    if(sSchoolSearch.isTextfieldCountry(countryCode)){
      textfieldWrapper.stop(true, true).slideDown(250, onChange);
    }
    else{
      textfieldWrapper.stop(true, true).slideUp(250, onChange);
    }
  });
};

sSchoolSearch.prototype.init = function(context){
  this.formObj = $(context);
  this.schoolsWrapper = $('#schools-wrapper', this.formObj);
  this.searchBtn = $('.search-wrapper .link-btn', this.formObj);
  this.searchField = $('#edit-field', this.formObj);
  this.currentSearchKeyword = $('#edit-query-hidden', this.formObj);
  this.currentSearchQuery = {};
  this.moderateForm = this.formObj.parents('.s-school-moderate-table-wrapper:first', context);
  this.isModerate = this.moderateForm.length > 0;
  this.countrySelect = $('#edit-search-country', this.formObj);
  this.regionLists = $('.region-list', this.formObj);
  this.cityInput = $('#edit-search-city', this.formObj);

  this.rootForm = this.formObj.parents('.root-form');
  this.selectedSchool = $('.selected-school', this.rootForm);
  this.submitButton = $('.submit-buttons', this.rootForm);
  this.instructionsLabel = this.rootForm.siblings('#instructions');

  this.currentPage = 0;

  this.bindEvents();

  if(!this.currentSearchKeyword.val().length){
    if(!this.isModerate){
      this.searchField.addClass('pre-fill');
    }
    this.searchField.val(this.searchField.attr('inline_title'));
  }
  else{
    if(!this.isModerate){
      this.searchField.removeClass('pre-fill');
    }
    this.searchField.val(this.currentSearchKeyword.val());
  }
};

sSchoolSearch.prototype.bindEvents = function(){
  var t = this,
      searchField = t.searchField;

  sSchoolSearch.sSchoolBindCountryChange(this.countrySelect, this.regionLists);

  this.searchBtn.bind('click', function(){
    t.sSchoolOnNewSearch();
    t.schoolsWrapper.children().eq(0).remove();
    t.schoolsWrapper.show().addClass('loading');
    t.currentSearchQuery = t.sSchoolGetSearchQuery({is_approved: true});
    t.sSchoolAjaxSearchSchools(t.currentSearchQuery, function(data){
      t.schoolsWrapper.removeClass('loading');
      if(data.success){
        t.currentPage++;
        t.sSchoolAppendResults(data);
      }
      else{
        t.schoolsWrapper.hide();
      }
    });
  });

  searchField.bind('keypress', function(e){
    if(e.keyCode == 13){
      t.searchBtn.trigger('click');
      return false;
    }
  }).bind('focus', function(e){
    if(searchField.val() == searchField.attr('inline_title')){
      if(!t.isModerate){
        searchField.removeClass('pre-fill');
        searchField.val('');
      }
    }
  }).bind('blur', function(e){
    if(searchField.val().length == 0){
      if(!t.isModerate){
        searchField.addClass('pre-fill');
      }
      searchField.val(searchField.attr('inline_title'));
    }
  });
};

/**
 * Highlight the fields specified in error_fields to be erronenous.
 * If error_fields is null, unhighlight all fields.
 *
 * @param array error_fields
 */
sSchoolSearch.prototype.sSchoolHighlightErrors = function(error_fields){
  if(error_fields == null){
    $('.search-wrapper .error', this.formObj).removeClass('error');
  }
  else{
    $.each(error_fields, function(){
      $('#edit-' + this).addClass('error');
    });
  }
};

/**
 * Display the error message to the errorMsgBox
 *
 * @param string error_msg. specify a null to hide the error msg box
 */
sSchoolSearch.prototype.sSchoolDisplayError = function(error_msgs, error_fields){
  if(typeof error_fields == 'undefined'){
    var error_fields = null;
  }
  this.sSchoolHighlightErrors(error_fields);

  var errorMsgBox = $('#form-messages .messages.error', this.rootForm);
  if(!errorMsgBox.length){
    var msgContainer = $('<div></div>', {id: 'form-messages'}).prependTo(this.formObj);
    errorMsgBox = $('<div></div>', {'class': 'messages error'});
    errorMsgBox.appendTo(msgContainer);
  }
  if(error_msgs == null){
    if(!errorMsgBox.hasClass('hidden')){
      errorMsgBox.addClass('hidden');
    }
  }
  else{
    errorMsgBox.html('');
    $.each(error_msgs, function(){
      errorMsgBox.append($('<div></div>', {'class': 'message-text'}).text(this));
    });
    if(errorMsgBox.hasClass('hidden')){
      errorMsgBox.removeClass('hidden');
    }
  }
};

/**
 * Switch the view to the add school form.
 */
sSchoolSearch.prototype.sSchoolViewAddSchoolForm = function(){
  this.sSchoolDisplayError(null);
  $('.form-op', this.rootForm).val('new');
  $('#schools-wrapper li', this.rootForm).remove();
  this.instructionsLabel.text(Drupal.t('Where do you teach?'));
  $('#s-common-school-picker-form', this.rootForm).hide();
  $("#faculty-code-container, #admin-info", this.rootForm).hide();;
  $('.submit-buttons', this.rootForm).show();
  $('.submit-span-wrapper input', this.rootForm).val(Drupal.t('Submit Your Request'));
  this.rootForm.addClass('school-add-form-wrapper')

  var addSchoolForm = $('#school-add-form', this.rootForm);
  var addSchoolNameInput = $('#edit-title', addSchoolForm);
  var addSchoolCountrySelect = $('#edit-country', addSchoolForm);
  var addSchoolRegionLists = $('.region-list', addSchoolForm);
  var addSchoolCityInput = $('#edit-city', addSchoolForm);
  var addSchoolStateTextInput = $('.s-js-state-textfield-wrapper input', addSchoolForm);
  var addSchoolZipInput = $('#edit-zip', addSchoolForm);
  sSchoolSearch.sSchoolBindCountryChange(addSchoolCountrySelect, addSchoolRegionLists);
  var schoolNameVal, zipCodeVal;
  if(this.currentSearchKeyword.val().search(/^[\d\- ]+$/) == 0) {
    zipCodeVal = this.currentSearchKeyword.val();
  }
  else {
    schoolNameVal = this.currentSearchKeyword.val();
  }
  addSchoolNameInput.val(schoolNameVal);
  addSchoolStateTextInput.val($('.s-js-state-textfield-wrapper input', this.rootForm).val());
  addSchoolCountrySelect.val(this.countrySelect.val()).trigger('change');
  addSchoolRegionLists.filter('.region-list-active').find('select').val(this.regionLists.filter('.region-list-active').find('select').val());
  addSchoolCityInput.val(this.cityInput.val());
  addSchoolZipInput.val(zipCodeVal);
  addSchoolForm.show();
};

/**
 * Switch the view to the "join pending" form.
 */
sSchoolSearch.prototype.sSchoolViewJoinPendingForm = function(data){
  var t = this;
  this.sSchoolDisplayError(null);
  $('.form-op', this.rootForm).val('requested');
  this.instructionsLabel.text(Drupal.t('Similar schools have already been requested'));
  $('.submit-buttons:visible').hide();
  $('.submit-span-wrapper input', this.rootForm).val(Drupal.t('Join School'));
  $('.existing-list, .search-wrapper', this.rootForm).remove();

  // @note the html will contain the #school-exists-form
  this.formObj.append(data.html);
  this.schoolsWrapper = $('#school-exists-form #schools-wrapper', this.formObj);
  this.schoolsWrapper.find('.item-list li.school').bind('click', function(e){
    t.sSchoolSelectSchool(this);
  });
  this.schoolsWrapper.show();

  $('.add-school-popup', this.schoolsWrapper).click(function(){
    t.sSchoolViewAddSchoolForm();
  });

  // @note getting the popup links to bind in newly injected schools list
  Drupal.attachBehaviors(this.schoolsWrapper);
};

/**
 * Obtain the search criteria from the current state of the form.
 * Retrieves keyword from the currentSearchKeyword control
 * Retrieves country from the countrySelect control
 * Retrieves state from an available regionLists for the corresponding country
 * Retrieves city from the cityInput contorl.
 *
 * @return object
 */
sSchoolSearch.prototype.sSchoolGetSearchQuery = function(extra_query){
  var query = {
    boosts: {}
  };
  query.keyword = this.currentSearchKeyword.val();
  query.country = this.countrySelect.val();

  var regionList = this.regionLists.filter('.region-list-' + query.country);
  if(regionList.length){
    query.state = regionList.find('select').val();
  }

  query.boosts.city = this.cityInput.val();

  if(typeof extra_query == 'object'){
    $.extend(query, extra_query);
  }

  return query;
};

/**
 * Reset keyword search parameters when making a new search
 */
sSchoolSearch.prototype.sSchoolOnNewSearch = function(){
  this.currentSearchQuery = {};

  var searchKeyword = this.searchField.val() == this.searchField.attr('inline_title') ? '' : this.searchField.val();
  this.currentSearchKeyword.val(searchKeyword);
  this.currentPage = 0;

  this.submitButton.hide();
  this.selectedSchool.val('');

  this.schoolsWrapper.find('.throbber').addClass('hidden');
};

/**
 * Perform a search for the school with the criteria specified in query.
 *
 * @param object query       search criteria represented as key-value pairs
 * @param function callback
 */
sSchoolSearch.prototype.sSchoolAjaxSearchSchools = function(query, callback){
  var t = this;
  var op = $('.op', this.formObj).text();
  var searchPath = $('.search-wrapper .hidden-click', this.formObj).attr('ajax');

  var s_school_search_token = query;
  if(s_school_search_token != this.currentSearchKeyword.val()){
    $('.selected-school', this.formObj).val('');
  }

  var requestData = {
    search: query,
    op: op,
    page: this.currentPage
  };

  this.sSchoolDisplayError(null);
  $.ajax({
    type: "GET",
    url: searchPath,
    data: requestData,
    dataType: "json",
    success: function(data, textStatus, jqXHR){
      if(!data.success){
        t.sSchoolDisplayError(data.errors, data.error_fields);
      }
      if(typeof callback == 'function'){
        callback.apply(this, [data]);
      }
    }
  });
};

/**
 * Add the returned data into the list of schools
 *
 * @param data  server response
 */
sSchoolSearch.prototype.sSchoolAppendResults = function(data){
  var t = this;
  var html = $(data.html);
  var itemList = this.schoolsWrapper.find('.item-list ul')
  if(itemList.length){
    // append results
    $('li.last', itemList).removeClass('last');
    var itemObjs = html.find('.item-list li');
    itemObjs.appendTo(itemList);
    itemObjs.filter('.school').bind('click', function(e){
      t.sSchoolSelectSchool(this);
    });
  }
  else{
    // new result set, just plug it in
    this.schoolsWrapper.replaceWith(html);
    this.schoolsWrapper = $('#schools-wrapper', this.formObj);
    this.schoolsWrapper.find('.item-list li.school').bind('click', function(e){
      t.sSchoolSelectSchool(this);
    });
  }

  var oldScrollTop = this.schoolsWrapper.scrollTop();

  this.schoolsWrapper.show();

  var activeRow = $('.active-row', this.moderateForm);
  if(activeRow.length){
    activeRow.data('search-term', this.currentSearchQuery);
    activeRow.data('search-results', this.schoolsWrapper.html());
    activeRow.addClass('with-results');
  }

  // the loading graphics in the bottom of the list for pagination
  var loadingMore = this.schoolsWrapper.find('.throbber');
  if(loadingMore.length == 0){
    loadingMore = $('<div></div>').addClass('throbber');
    loadingMore.appendTo(this.schoolsWrapper);
  }

  if(data.has_more_results){
    // if there are more results, bind the scroll event so we can load more in when the user reaches the bottom
    loadingMore.removeClass('hidden');

    var scrollTarget = this.schoolsWrapper.get(0).scrollHeight - this.schoolsWrapper.outerHeight() - loadingMore.outerHeight();
    this.schoolsWrapper.scrollTop(oldScrollTop).bind('scroll.s_school_more_results', function(){
      if(loadingMore.is(':visible') && $(this).scrollTop() >= scrollTarget){
        $(this).unbind('scroll.s_school_more_results');
        t.sSchoolAjaxSearchSchools(t.currentSearchQuery, function(data){
          t.currentPage++;
          t.sSchoolAppendResults(data);
        });
      }
    });
  }
  else{
    // if there are no more results, bind the event to search against pending schools for the "Not listed?" link
    loadingMore.addClass('hidden');

    // Can't have form ID as part of selector, since it won't be in the passed
    // context of sSchoolAjaxPickSearch. Instead, test if it is a child of the form,
    // then continue.
    $('.add-school-popup:not(.sSchool-processed)', this.schoolsWrapper).each(function(e){
      var link = $(this);
      var form = link.parents('#s-school-select-form');
      if(form.length){
        link.addClass('sSchool-processed').click(function(){
          // search against pending schools and determine whether to show the "join pending" or the "add school" form
          var search_query = t.sSchoolGetSearchQuery({is_pending: true});
          t.currentPage = 0;
          t.sSchoolAjaxSearchSchools(search_query, function(data){
            if(data.count > 0){
              // there are pending schools: prompt the user a chance to join one of these
              t.sSchoolViewJoinPendingForm(data);
            }
            else{
              // no pending schools found: give the user the "add school" form
              t.sSchoolViewAddSchoolForm();
            }
          });
        });
      }
    });
  }
};

/**
 * Event handler for when a school is selected from the list of existing schools
 *
 * @param object el  dom object
 */
sSchoolSearch.prototype.sSchoolSelectSchool = function(el){
  var t = this;
  var liObj = $(el);

  $('li', this.schoolsWrapper).not(liObj).removeClass('highlight');
  liObj.toggleClass('highlight');

  if(liObj.hasClass('highlight')){
    this.selectedSchool.val(liObj.attr('id'));
    this.submitButton.show();

    var resultId = liObj.attr('id');
    var schoolSid = resultId.split('-')[1];
    var schoolName = $('.school-name', liObj).text();
    this.searchField.val(schoolName);

    // reset the reg form
    $('#faculty-code-container', this.rootForm).hide();
    $('#edit-registration-code', this.rootForm).val('');
    $("#admin-info", this.rootForm).remove();

    // If selecting a school for registration, check to see if a code is required
    if(this.rootForm.attr('id') == 's-school-select-form'){
      $.ajax({
        type: 'GET',
        async: false,
        url: '/schoolsearch/facultycode/'+String(schoolSid),
        dataType: 'json',
        error: function(){
          alert(Drupal.t('There was an internal system error. Please try again in a few moments.'));
        },
        success: function( data , status, xhr ){
          if(data.registration_codes_enabled){
            $('#faculty-code-container', t.rootForm).show().after('<div id="admin-info">' + data.admins + '</div>');
            $('#edit-registration-code', t.rootForm).focus();
            $('#faculty-code-help-link', t.rootForm).show().unbind('click.sSchoolSelectForm').bind('click.sSchoolSelectForm', function(){
              $(this).hide();
              $("#admin-info", t.rootForm).show();
            });
          }
        }
      });
    }
  }
  else {
    this.selectedSchool.val('');
    this.submitButton.hide();
    this.searchField.val(this.currentSearchKeyword.val());
  }

  if(this.moderateForm.length > 0){
    var transferLink = $('.action-transfer', this.moderateForm);
    var subscribed = liObj.hasClass('subscribed');
    var selected = liObj.hasClass('highlight');
    var transferDisabled = transferLink.hasClass('disabled');

    var params = getQueryParams();
    var transferURL = '/school/' + $('.active-row', this.moderateForm).attr('id') + '/moderate/action/transfer/' + schoolSid;
    if(params.page){
      transferURL += '?page=' + params.page;
    }
    transferLink.attr('href', transferURL);

    if(selected && transferDisabled && !subscribed){
      //enable transfer link if selected school is unsubscribed
      transferLink.removeClass('disabled');
    }
    else if((!selected || subscribed) && !transferDisabled){
      //disable transfer link if school is deselected or if user selects a subscribed school
      transferLink.addClass('disabled');
    }
  }
};
