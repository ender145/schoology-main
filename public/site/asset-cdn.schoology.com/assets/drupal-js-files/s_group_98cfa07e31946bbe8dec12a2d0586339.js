Drupal.behaviors.sGroup = function(context){
  var settingsGroup = Drupal.settings.s_group;
  var DEFER_LOADING = 'defer';
  var DISABLE_LOADING = 'disable';

  sCommonAjaxEnrollmentBehavior(context);

  $('.notification-settings:not(.sGroup-processed)', context).addClass('sGroup-processed').each(function(){
	  sUserSetupRealmNotifButton($(this));
  });

  $('.access-code:not(.sGroup-processed)' , context ).addClass('sGroup-processed').each(function(){
	 var acContext = this;
	 $('.access-delete', acContext).click(function(){
		var path = window.location.pathname.substring(1);
		var groupID = path.split('/')[1];
		$.ajaxSecure({
			url : '/enrollment/code/visibility/group/' + groupID + '/hide',
			dataType: 'json',
			success: function(response, status){
				$(acContext).hide();
			}
		});
	 });
  });

  /**
   * Loads upcoming events.
   *
   * @param {jQuery} $upcomingEventsWrapper - The "Upcoming" events wrapper.
   */
  function loadUpcomingEvents($upcomingEventsWrapper) {
    var location = window.location;
    var path = location.pathname.substring(1);
    var groupId = path.split('/')[1];

    $.ajax({
      // pass the current path so that the calendar nav uses the right link (the current page)
      // and also be sure to pass any ?mini arguments for changing the date in the cal
      url: '/group/' + groupId + '/calendar_ajax' + (window.location.search.length ? window.location.search + "&" : '?') + 'original_q=' + path,
      dataType: 'json',
      type: 'GET',
      success: function(response) {
        $upcomingEventsWrapper.find('.upcoming-list').html($(response).children());
        $upcomingEventsWrapper.show();
        Drupal.attachBehaviors($upcomingEventsWrapper);

        if (location.search.match('mini=')) {
          $('#event-calendar', selector).click();
        }
      }
    });
  }

  $('#group-events:not(.sGroup-processed)', context).addClass('sGroup-processed').each(function() {
    var $upcomingEventsWrapper = $(this);
    $upcomingEventsWrapper.show();

    var upcoming = settingsGroup && settingsGroup.upcoming;
    switch (upcoming) {
      case DEFER_LOADING:
        var $refreshWrapper = $upcomingEventsWrapper.find('.upcoming-list .refresh-wrapper');
        $refreshWrapper.find('.refresh-button').on('click', function() {
          $refreshWrapper.find('> p').each(function() {
            var $element = $(this);
            if (!$element.hasClass('more-loading')) {
              $element.hide();
            }
          });
          $upcomingEventsWrapper.find('.upcoming-list .more-loading').show();
          loadUpcomingEvents($upcomingEventsWrapper);
        });
        break;
      case DISABLE_LOADING:
        break;
      default:
        $upcomingEventsWrapper.find('.upcoming-list .more-loading').show();
        loadUpcomingEvents($upcomingEventsWrapper);
        break;
    }

    var selector = $('#event-selector', $upcomingEventsWrapper);
    $('#event-calendar', selector).click(function() {
        var popup = new Popups.Popup();
        var body = '<div id="fcalendar" style="width: 800px;"></div>';
        var buttons = {
          'popup_cancel': {
            title: Drupal.t('Close'),
            func: function() {
              popup.close();
            }
          }
        };
        popup.extraClass = 'popups-extra-large calendar-popup-mini';
        popup.open(Drupal.t('Calendar'), body, buttons);
        Drupal.attachBehaviors();
        $("#share-calendar-option-containter .share-calendar-option").insertAfter("#fcalendar");
        sPopupsResizeCenter();
    });
  });

	$('.group-info-wrapper:not(.sGroup-processed)' , context ).addClass('sGroup-processed').each(function() {
    var wrapper = $(this);
    $('.group-info-full', wrapper).hide();
    $('.more-link', wrapper).bind('click', function(){
    	$(this).parent().hide();
    	$('.group-info-full', wrapper).show();
    });

    $('.less-link', wrapper).bind('click', function(){
    	$(this).parent().hide();
    	$('.group-info-less', wrapper).show();
    });
	});


	$('.profile-picture-wrapper:not(.sGroup-processed)', context).addClass('sGroup-processed').each(function(){
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

	$('.mygroups-list-item:not(.sGroup-processed)', context).addClass('sGroup-processed').each(function(){
		$(this).sActionLinks(
				{
					hidden: false,
					wrapper: '.group-action-links',
					rowClass: '.mygroups-list-item'
				}
		);
	});

	$('#s-group-settings:not(.sGroup-processed)', context ).addClass('sGroup-processed').each(function() {
    $(this).sActionLinks( {
      hidden : false,
      wrapper : '.action-links-wrapper'
    });
  });

	$('#s-group-create-new-form:not(.sGroup-processed)', context).addClass('sGroup-processed').each(function(){
		var form = $(this);

		// add an extra class in step 2 so the popup can be properly sized
		var step = $('#edit-step' , form ).val();
		if( step == '2' )
		  form.parents('.popups-box').addClass('s-group-create-form-step-2');

		var privacyLabels = $('#privacy-labels', form);
		var visibility = $('#edit-privacy-level-wrapper', form);
		$('select', visibility).bind('change', function(){
			var selector = $(this);
			var selectWrapper = selector.parent();
			$('.privacy-label', selectWrapper).remove();
			var curVal = selector.val();
			if(curVal != 0){
				var curLabel = $('#'+curVal, privacyLabels);
				var clone = curLabel.clone();
				selector.after(clone);
			}
		});

		var inviteTypesLabels = $('#invite-types-labels', form);
		var inviteType = $('#edit-invite-type-wrapper', form);
		$('select', inviteType).bind('change', function(){
			var selector = $(this);
			var selectWrapper = selector.parent();
			$('.invite-type-label', selectWrapper).remove();
			var curVal = selector.val();
			if(curVal != -1){
				var curLabel = $('#invite-type-'+curVal, inviteTypesLabels);
				var clone = curLabel.clone();
				selector.after(clone);
			}
		});

		$('select', visibility).trigger('change');
		$('select', inviteType).trigger('change');
		sPopupsResizeCenter();

    $('#edit-make-official', form).click(function(){
      var tagTree = $('#tag-tree', form);
      if($(this).is(':checked')){
        tagTree.removeClass('hidden');
        tagTree.show();
      }
      else{
        tagTree.hide();
      }
      sPopupsResizeCenter();
    })


	});

  $('.s-js-archive-group:not(.sGroup-processed), .s-js-restore-group:not(.sGroup-processed)', context).addClass('sGroup-processed').each(function(){
      $(this).click(function(){
          var group_info = $(this).attr('id').split('-');
          var action = group_info[0];
          //validate action is acceptable
          if (action != 'restore' && action != 'archive'){
            return false;
          }

          var group_id = group_info[2];

          var title;
          var confirmation;
          var note;
          var groupName = $(this).parents('.group-action-links').siblings('.middle').children('.group-title').html();

          if (action === 'archive') {
            title = Drupal.t('Archive Group');
            confirmation = Drupal.t('Are you sure you want to archive !groupName?', {
              '!groupName': '<b>' + groupName + '</b>'
            });
            note = Drupal.t('Note: This will archive the group for all group members too.');
          } else if (action === 'restore') {
            title = Drupal.t('Restore Group');
            confirmation = Drupal.t('Are you sure you want to restore !groupName?', {
              '!groupName': '<b>' + groupName + '</b>'
            });
            note = Drupal.t('Note: This will restore the group for all group members too.');
          }

          sCommonConfirmationPopup({
              title: title,
              body: '<p class="' + action + '-confirmation">' + confirmation + '<p class="description">' + note + '</p>',
              extraClass: ' group-' + action,
              confirm: {
                text:Drupal.t('Submit'),
                func: function(){
                $.ajaxSecure({
                  url: '/group/' + group_id + '/' + action,
                  dataType: 'json',
                  success: function (data){
                    msg = Drupal.theme.sAjaxMessage(data.msg + '"' + groupName + '"', data.msgClass);
                    $('#content-wrapper', context).before(msg);
                    $('.messages-close-btn', context).click(function(){
                      $('.messages-close-btn', context).parent().fadeOut(500 , function(){
                      $('.messages', context).remove();
                      });
                    });

                    //remove group row
                    $('li#group-' + group_id).fadeOut(1000, function(){
                      $(this).remove();
                    });

                    //refresh page if there no exisiting archived groups
                    var archive_link = false;
                    $('.link-wrapper').each(function(){
                      if ($(this).text() == 'Archived'){
                        archive_link = true;
                      }
                    });
                    if (archive_link == false){
                      location.reload();
                    }

                    //if no groups left go to main groups page (we are checking for 1 and not 0 because items fade out and one would still exist)
                    if ($('.mygroups-list-item').length == 1){
                      var currentPage = window.location.href.toString().split(window.location.host)[1];
                      var groupArea = (typeof currentPage.split('/')[2] !== 'undefined') ? '/' + currentPage.split('/')[2] : '';
                      window.location = '/groups' + groupArea;
                    }
                   },
                    error: function (data){
                      if (!($('.messages', context).length)){
                      //if there is an AJAX error or if the user tries to manipulate the DOM to restore items they do not have access to.
                        msgError = Drupal.theme.sAjaxMessage(Drupal.t('There was an internal error, please try again'), 'error');
                          $('#content-wrapper', context).before(msgError);
                        }
                        $('.messages-close-btn', context).click(function(){
                        $('.messages-close-btn', context).parent().fadeOut(500 , function(){
                          $('.messages', context).remove();
                        });
                      });
                    }
                });
                Popups.activePopup().close();
                }
              }
            });
            sPopupsResizeCenter();
            return false;
        })
  })

}
