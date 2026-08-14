// JavaScript Document
var popupOpen = false;
var sEnrollmentEditWrapper;
// Shared screen reader announcement utility. Includes a Firefox-only focus
// workaround for VoiceOver, skipped when focus is in a form field.
if (!window._sAnnounceStatus) {
  window._sAnnounceStatusTimers = {};
  window._sAnnounceStatus = function(elementId, message, delay) {
    var liveRegion = document.getElementById(elementId);
    if (!liveRegion) return;
    if (window._sAnnounceStatusTimers[elementId]) {
      clearTimeout(window._sAnnounceStatusTimers[elementId]);
    }
    window._sAnnounceStatusTimers[elementId] = setTimeout(function() {
      liveRegion.textContent = message;
      var isFirefox = navigator.userAgent.indexOf('Firefox') !== -1;
      var tag = (document.activeElement || {}).tagName;
      if (isFirefox && !/^(INPUT|TEXTAREA|SELECT)$/i.test(tag)) {
        var helper = document.getElementById('sr-announce-helper');
        if (helper) {
          var prevFocus = document.activeElement;
          helper.textContent = message;
          helper.focus();
          setTimeout(function() {
            if (prevFocus && prevFocus !== document.body) {
              prevFocus.focus();
            } else {
              helper.blur();
            }
          }, 100);
        }
      }
      window._sAnnounceStatusTimers[elementId] = null;
    }, delay || 100);
  };
}

function sEnrollmentAnnounceStatus(message, delay) {
  window._sAnnounceStatus('members-search-status', message, delay);
}
Drupal.behaviors.sEnrollmentEdit = function(context){
          sEnrollmentEditWrapper = $('#roster-wrapper');

          $('.grading-group-member-delete:not(.sEnrollmentEdit-processed)', context).addClass('sEnrollmentEdit-processed').each(function(){
            $(this).click(function(){
              var deleteObj = $(this);
              var rowObj = $(this).parents('tr.enrollment-member');
              var memberUid = parseInt(rowObj.attr('id'));
              var deletePath = $(this).attr('href');
              $.ajaxSecure({
                url : deletePath,
                type : 'DELETE',
                async : true
              });
              rowObj.remove();
              // Decrement the counter
              var endCountObj = $('.enrollment-view-nav .end-count');
              var endCount = parseInt(endCountObj.text()) - 1;
              endCountObj.text(endCount);
              var totalCountObj = $('.enrollment-view-nav .total');
              var totalCount = parseInt(totalCountObj.text()) - 1;
              totalCountObj.text(totalCount);
              var hrefParts = deletePath.split('/');
              hrefParts.pop();
              var groupNid = hrefParts.pop();
              var scope = sEnrollmentGetGradingGroupScope();
              if(scope){
                scope.$apply(function(){
                  var members = scope.gradingGroups[groupNid].members;
                  var newMembers = $.grep(members,function(k,v){
                    if(k == memberUid){
                      return false;
                    }
                    return true;
                  });
                  scope.gradingGroups[groupNid].members = newMembers;
                })
              }
            })
          });

	  $('.ac-right:not(.sEnrollmentEdit-processed)').addClass('sEnrollmentEdit-processed').each(function(){
		 var acContext = this;
		 $('.show-in-left', acContext).click(function(){
			var button = $(this);
			var path = window.location.pathname.substring(1);
			path = path.split('/');
 			$.ajaxSecure({
				url : '/enrollment/code/visibility/' + path[0] + '/' + path[1] + '/show',
				dataType: 'json',
				success: function(response, status){
					var left = $('#content-left');
          var $appsMenu = $('#menu-s-apps', left);
          if($appsMenu.length == 0) { // if no apps menu, add it to the top of the container
					  left.prepend(response);
          } else { // if there's an apps menu, add it after the apps menu
            $appsMenu.after(response);
          }
					Drupal.attachBehaviors(left);
					button.hide();
				}
			});
		 });
	  });

	 $('.enrollment-actions:not(.sEnrollmentEdit-processed)').addClass('sEnrollmentEdit-processed').each(function(){
	    var wrapper = $(this);
      $('.action-links-wrapper:not(.sEnrollmentEdit-processed)', wrapper).addClass('sEnrollmentEdit-processed').each(function(){
	      $(this).sActionLinks(
	        {
	          hidden: false,
	          wrapper: '.action-links-wrapper'
	        }
	      );
	    });
      var statusResponseMap = sCommonDefaultConnectStatusResponseMap();
      sCommonAjaxNetworkConnectBehavior($(this), statusResponseMap);

		  var approveBtn = $('.enrollment-approve', wrapper);
		  var promoteBtn = $('.enrollment-promote', wrapper);
		  var demoteBtn = $('.enrollment-demote', wrapper);
                  var unenrollBtn = $('.enrollment-unenroll', wrapper);
		  var reenrollBtn = $('.enrollment-reenroll', wrapper);
		  var removeBtn = $('.enrollment-remove', wrapper);
      var printQRBtn = $('.enrollment-print-qr-codes a', wrapper);

		  promoteBtn.bind('click', function(){
			  var selRow = $(this).parents('tr');
			  var msg = Drupal.t('Are you sure you want to make @user a co-admin?', {'@user' : $('.user-name a', selRow).text()});
			  sEnrollmentEditConfirmDialog('promote', msg, $(this));
			  return false;
		  });
		  demoteBtn.bind('click', function(){
			  var selRow = $(this).parents('tr');
			  var msg = Drupal.t('Are you sure you want to remove instructor capabilities from @user?', {'@user' : $('.user-name a', selRow).text()});
			  sEnrollmentEditConfirmDialog('demote', msg, $(this));
			  return false;
		  });
                  unenrollBtn.bind('click', function(){
			  var selRow = $(this).parents('tr');
			  var msg = Drupal.t('Are you sure you want to unenroll @user?', {'@user' : $('.user-name a', selRow).text()});
			  sEnrollmentEditConfirmDialog('unenroll', msg, $(this));
			  return false;
		  });
                  reenrollBtn.bind('click', function(){
			  var selRow = $(this).parents('tr');
			  var msg = Drupal.t('Are you sure you want to re-enroll @user?', {'@user' : $('.user-name a', selRow).text()});
			  sEnrollmentEditConfirmDialog('reenroll', msg, $(this));
			  return false;
		  });
		  removeBtn.bind('click', function(){
			  var selRow = $(this).parents('tr');
			  var userName = $('.user-name a', selRow).text();
			  var message = Drupal.t('Are you sure you want to remove @user?', {'@user' : userName});
              var msg = '<span title="' + userName + '">' + message + '</span>';
			  sEnrollmentEditConfirmDialog('remove', msg, $(this));
			  return false;
		  });
		  approveBtn.bind('click', function(){
			  var selRow = $(this).parents('tr');
			  var msg = Drupal.t('Are you sure you want to approve @user?', {'@user' : $('.user-name a', selRow).text()});
			  sEnrollmentEditConfirmDialog('approve', msg, $(this));
			  return false;
		  });
      printQRBtn.bind('click', function() {
        var $selRow = $(this).closest('tr');
        var username = $('.user-name a', $selRow).text();
        var uid = $selRow.attr('id');
        var courseSectionNid = Drupal.settings.s_enrollment.qr_code.course_section_nid;
        sEnrollmentPrintQRCodeConfirmDialog(username, uid, courseSectionNid);
        return false;
      });
	  });

	 $('#s-enrollment-access-code-settings-form:not(.sEnrollmentEditprocessed)').addClass('sEnrollmentEditprocessed').each(function(){
		 var form = $(this);
		 $('.require-approval', form).bind('click', function(){
			 form.trigger('submit');
		 });
	 });

	 $('.enrollment-view-nav .next:not(.sEnrollmentEditprocessed)').addClass('sEnrollmentEditprocessed').each(function(){
			var nextBtn = $(this);
			var hasAjax = nextBtn.attr('ajax').length>0;
			if(hasAjax){
				nextBtn.bind('click', function(){
					nextBtn.unbind('click');
					sEnrollmentAjax(nextBtn, nextBtn.attr('ajax'), nextBtn.parents('.enrollments-wrapper'));
				});
			}
		});

		$('.enrollment-view-nav .prev:not(.sEnrollmentEditprocessed)').addClass('sEnrollmentEditprocessed').each(function(){
			var prevBtn = $(this);
			var hasAjax = prevBtn.attr('ajax').length>0;
			if(hasAjax){
				prevBtn.bind('click', function(){
					prevBtn.unbind('click');
					sEnrollmentAjax(prevBtn, prevBtn.attr('ajax'), prevBtn.parents('.enrollments-wrapper'));
				});
			}
		});

		$('.enrollment-search:not(.sEnrollmentEditprocessed)').addClass('sEnrollmentEditprocessed').each(function(){
			var goBtn = $('.go-btn', $(this));
			var searchInput = $('input', $(this));
			goBtn.bind('click', function(){
				var queryString = setQueryParamsQ(searchInput.attr('ajax'), 's', searchInput.val());
				sEnrollmentAjax(goBtn, queryString);
			});

			searchInput.bind('keypress', function(event){
				if(event.keyCode == 13){
					goBtn.trigger('click');
					return true;
				}
			});
		});

  $('.enrollment-view-wrapper:not(.sEnrollmentEditprocessed)').addClass('sEnrollmentEditprocessed').each(function(){
    var context = $(this);
    if(!Drupal.settings.s_enrollment)
      return true;
    if(typeof Drupal.settings.s_enrollment.preview != 'undefined'){
      var course_nid = Drupal.settings.s_enrollment.course_nid;
      $('.enrollment-member', context).each(function(){
        var memberRow = $(this);
        if(!memberRow.hasClass('no-inactive-access')){
          $(this).click(function(){
            var redirectUrl = '/course/' + course_nid + '/preview/' + $(this).attr('id'),
                parentUid = $(this).data('parent-uid');
            if(parentUid){
              redirectUrl += '?parent_uid=' + parentUid;
            }
            document.location.href = redirectUrl;
          });
        }
      });
    }
  });

		$('.enrollment-view-wrapper .search-results:not(.sEnrollmentEditprocessed)').addClass('sEnrollmentEditprocessed').each(function(){
			var closeBtn = $('.close-btn', $(this));
			var viewWrapper = $('#enrollments-editor');
			var searchResults = $(this);
			closeBtn.bind('click', function(){
				searchResults.hide();
				$('.enrollment-search input', viewWrapper).val('');
				if (window._sAnnounceStatusTimers) {
					var t = window._sAnnounceStatusTimers['members-search-status'];
					if (t) clearTimeout(t);
				}
				var el = document.getElementById('members-search-status');
				if (el) el.textContent = '';
				$('.all-filter', viewWrapper).trigger('click');
			});
		});


		$('.enrollment-filters:not(.sEnrollmentEdit-processed)').addClass('sEnrollmentEdit-processed').each(function(){
			$('.all-filter').addClass('active');
			var view = $(this);
			var allBtn = $('.all-filter', view);
			var membersBtn = $('.members-filter', view);
			var adminBtn = $('.admin-filter', view);
			var archivedBtn = $('.archived-filter', view);
			var pendingBtn = $('.pending-filter', view);
			var requestBtn = $('.request-filter', view);
			var specialProgramsBtn = $('.special-programs-filter', view);
			var searchInput = $('.enrollment-search input');
			var goBtn = $('.enrollment-search .go-btn');
			var searchAjax = searchInput.attr('ajax').substring(0, searchInput.attr('ajax').indexOf('?')+1);
			function handleKeydown(event, button) {
				const key = event.key;
				if (isSpaceKeyEvent(event)) {
					event.preventDefault();
					button.click();
				} else if (key === "ArrowRight") {
					button.next("[role='tab']").focus();
				} else if (key === "ArrowLeft") {
					button.prev("[role='tab']").focus();
				}
			}
			allBtn.bind('click', function(){
					$(this).addClass('active');
					sEnrollmentAjax(allBtn, allBtn.attr('ajax'));
			}).bind('keydown', function(event) {
					handleKeydown(event, $(this));
			});
			membersBtn.bind('click', function(){
					$(this).addClass('active');
					sEnrollmentAjax(membersBtn, membersBtn.attr('ajax'));
			}).bind('keydown', function(event) {
      		  		handleKeydown(event, $(this));
      		});
			archivedBtn.bind('click', function(){
					$(this).addClass('active');
					sEnrollmentAjax(archivedBtn, archivedBtn.attr('ajax'));
			});
     		adminBtn.bind('click', function(){
					$(this).addClass('active');
					sEnrollmentAjax(adminBtn, adminBtn.attr('ajax'));
			}).bind('keydown', function(event) {
        			handleKeydown(event, $(this));
      		});
			pendingBtn.bind('click', function(){
					$(this).addClass('active');
					sEnrollmentAjax(pendingBtn, pendingBtn.attr('ajax'));
			});
			requestBtn.bind('click', function(){
					$(this).addClass('active');
					sEnrollmentAjax(requestBtn, requestBtn.attr('ajax'));
			});
			specialProgramsBtn.bind('click', function() {
					$(this).addClass('active');
					sEnrollmentAjax(specialProgramsBtn, specialProgramsBtn.attr('ajax'));
			});
		});

		if($("#s-group-edit-info-form").length > 0)
			$("#s-group-edit-info-form textarea").elastic();

		if($("#s-event-add-form").length > 0)
			$("#s-event-add-form textarea").elastic();

		if($("#s-group-create-new-form").length > 0)
			$("#s-group-create-new-form textarea").elastic();

		if($(".group-info-expander").length > 0){
			$('.group-info').hide();
			$(".group-info-expander").click(function(){
				var visible = $('.group-info').is(':visible');
				if(visible){
					$('span', $(this)).text(Drupal.t('Show'));
					$('.group-info').slideUp('fast');
				} else {
					$('span', $(this)).text(Drupal.t('Hide'));
					$('.group-info').slideDown('fast');
				}
			});
		}

		var nodeId = $('.s-course-hidden-rid').val();
		  //hides self, sets setting via ajax, displays disable link and code itself
		  $('.s-course-enable-invites').click(function() {
		    var enable  = $(this);
		    var disable = $('.s-course-disable-invites');
		    var instructions = $('.code-instructions');
		    var regen   = $('.s-course-regenerate-invites');
		    $.ajaxSecure({
		      type:     'GET',
		      url:      '/course/' + nodeId + '/enable_invite_ajax',
		      dataType: 'json',
		      success: function(html) {
		        enable.hide();
		        disable.show();
		        instructions.show();
		        regen.show();
		        $('.code-instructions .course-code').text(html);
		      }
		    });

		    return false;
		  });

		  //hides self, sets setting via ajax, displays enable link, removes code
		  $('.s-course-disable-invites').click(function() {
		    var disable = $(this);
		    var enable  = $('.s-course-enable-invites');
		    var instructions = $('.code-instructions');
		    var regen   = $('.s-course-regenerate-invites');
		    $.ajaxSecure({
		      url:      '/course/' + nodeId + '/disable_invite_ajax',
		      dataType: 'json',
		      success: function(html) {
		        regen.hide();
		        disable.hide();
		        enable.show();
		        instructions.hide();
		      }
		    });

		    return false;
		  });

		  //regenerates new invite code, and refreshes display (SGY-440)
		  $('.s-course-regenerate-invites').click(function() {
		    var regen   = $(this);
		    //display popup notification
		    var popup        = new Popups.Popup();
		    popup.extraClass = 'save-changes-popup';
		    var body = Drupal.t('Are you sure you want to regenerate this access code? This action will invalidate the current code.');
		    var buttons = {
		      'popup_submit': {
		         title: Drupal.t('Regenerate'), func: function(){
		           $.ajaxSecure({
		             url:      '/course/' + nodeId + '/regenerate_invite_ajax',
		             dataType: 'json',
		             success: function(html) {
		               $('.code-instructions .course-code').text(html);
		             }
		           });
				       popup.close();
		         }
		      },
		      'popup_cancel': {
		        title: Drupal.t('Cancel'), func: function(){
		          popup.close();
		        }
		      }
		    };
		    popup.open(Drupal.t('Remove Attachment'), body, buttons);
		    return false;
		  });

  $('.s-js-enrollment-preview-toggle:not(.sEnrollmentEdit-processed)', context).addClass('sEnrollmentEdit-processed').each(function(){
    var enrollmentsWrapper = $(this).siblings('.enrollments-wrapper');
    $(this).children().click(function(){
      var btnObj = $(this),
          ajaxUrl = btnObj.attr('ajax');
      if(ajaxUrl && (!btnObj.hasClass('active') ||btnObj.hasClass('s-js-allow-active-ajax'))){
        btnObj.siblings('.active').removeClass('active');
        btnObj.addClass('active');
        sEnrollmentAjax(btnObj, ajaxUrl, enrollmentsWrapper);
      }
    });
  });

  // toggle "Parent Access Codes" download link
  $('.parent-code:not(.sEnrollmentEdit-processed)', context).addClass('sEnrollmentEdit-processed').each(function(){
    var dLink = $('.parent-access-code', $(this));
    var dLinkTipsyOpts = {
      gravity: 's',
      title: function() {
        var courseIsInactive = ( +$(this).hasClass('s-js-course-is-inactive') ); // 0 or 1
        var toolTipMsg = [
          Drupal.t('You must have at least 1 member in this course to download parent access codes'),
          Drupal.t('Parent access codes cannot be downloaded for inactive courses'),
        ];
        return $(this).hasClass('disabled') ? toolTipMsg[courseIsInactive] : '';
      }
    };
    var dLinkClick = function(e) {
      if(!$(this).hasClass('disabled')) {
        Popups.openPath(this, {extraClass: 'popups-small parent-access-popup'});
      }
      e.preventDefault();
    };
    dLink.tipsy(dLinkTipsyOpts).click(dLinkClick);
  });

  $('.qr-code-print-all:not(.sEnrollmentEdit-processed)', context).addClass('sEnrollmentEdit-processed').each(function() {
    $(this).bind('click', function() {
      var courseSectionNid = Drupal.settings.s_enrollment.qr_code.course_section_nid;
      var courseSectionName = Drupal.settings.s_enrollment.qr_code.course_section_name;
      var uids = Drupal.settings.s_enrollment.qr_code.uids;

      var popup = new Popups.Popup();
      popup.disableInputFocus = true;
      popup.extraClass = 'popups-small';
      var body = '<p class="print-qr-code-confirm-modal">' + Drupal.t('Do you want to print all QR codes for @courseName?', {'@courseName': courseSectionName}) + '</p>';
      body += '<p>' + Drupal.t('Your QR codes will open in a new tab.') + '<p>';

      var buttons = {
        popup_submit: {
          title: Drupal.t('Print'),
          func: function() {
            sEnrollmentGenerateQrCodesAndOpenPrintPageAllMembers(courseSectionNid, popup);
          }
        },
        popup_cancel: {
          title: Drupal.t('Cancel'),
          func: function() {
            popup.close();
          }
        },
      };
      popup.open(Drupal.t('Print QR Codes'), body, buttons);
    });
  });
};

function sEnrollmentAjax(btn, url, context) {
  var context = ( typeof context != 'undefined' ) ? context : sEnrollmentEditWrapper;
  $('.filter-btn', context).not(btn).removeClass('active');
  var enrollmentViewWrapper = $('.enrollment-view-wrapper', context);
  sToggleActiveLoader('enrollment-user-list', $('.enrollment-user-list', enrollmentViewWrapper));
  $.ajax({
    url: '/'+url,
    dataType: 'html',
    success: function( data , status , xhr ){
      enrollmentViewWrapper.replaceWith( data );
      Drupal.attachBehaviors(context);
      var scope = sEnrollmentGetGradingGroupScope();
      if(scope){
        scope.updateGradingGroupTags();
        if(btn != null){
          scope.$apply(function(){
            scope.activeNid = null;
          });
        }
        scope.load();
      }
      sPopupsResizeCenter();

      var numResults = $('.num-results', context);
      if (numResults.length) {
        sEnrollmentAnnounceStatus(numResults.text(), 200);
      }
    }
	});
}

function sEnrollmentEditConfirmDialog(action, msg, wrapper){
	var popup = new Popups.Popup();
  popup.disableInputFocus = true;
	popup.extraClass = 'popups-small s-user-'+action+'-warning';
	var body = '<p>'+msg+'</p>';
	var buttons = {
			'popup_submit': {
				title: Drupal.t('Confirm'), func: function(){
				switch(action){
					case 'promote':
						sEnrollmentPromoteAjax(wrapper);
						break;
					case 'demote':
						sEnrollmentDemoteAjax(wrapper);
						break;
					case 'unenroll':
						sEnrollmentChangeRemoveRowAjax(wrapper, Drupal.t('has been successfully unenrolled.'));
						break;
          case 'reenroll':
						sEnrollmentChangeRemoveRowAjax(wrapper, Drupal.t('has been successfully re-enrolled.'));
						break;
          case 'remove':
						sEnrollmentChangeRemoveRowAjax(wrapper, Drupal.t('has been successfully removed.'));
						break;
					case 'approve':
						sEnrollmentApproveAjax(wrapper);
						break;
				}
				popup.close();
			}
		},
		'popup_cancel': {
			title: Drupal.t('Cancel'), func: function(){
			popup.close();
			}
		}
	};
	popup.open(Drupal.t('Confirmation'), body, buttons);
}

function sEnrollmentPrintQRCodeConfirmDialog(username, uid, courseSectionNid) {
  var popup = new Popups.Popup();
  popup.disableInputFocus = true;
  popup.extraClass = 'popups-small';
  var body = '<p class="print-qr-code-confirm-modal">' + Drupal.t('Do you want to print a QR code for @username?', {'@username': username}) + '</p>';
  body += '<p>' + Drupal.t('Your QR code will open in a new tab.') + '<p>';

  var buttons = {
    popup_submit: {
      title: Drupal.t('Print'),
      func: function() {
        sEnrollmentGenerateQrCodesAndOpenPrintPage([uid], courseSectionNid, popup);
      }
    },
    popup_cancel: {
      title: Drupal.t('Cancel'),
      func: function() {
        popup.close();
      }
    },
  };
  popup.open(Drupal.t('Print QR Code'), body, buttons);
}

function sEnrollmentPromoteAjax(wrapper){
	var href = wrapper.attr('href');
	var ajax = wrapper.attr('ajax');
	$.ajaxSecure({
		url: '/'+ajax,
		dataType: 'json',
		success: function(data){
	    $('.enrollment-filters .active').click();
      sEnrollmentAjaxUpdateParentAccessLink(data, wrapper.parents('#roster-wrapper'));
		}
	});
}

function sEnrollmentDemoteAjax(wrapper){
	var href = wrapper.attr('href');
	var ajax = wrapper.attr('ajax');
	$.ajaxSecure({
		url: '/'+ajax,
		dataType: 'json',
		success: function(data){
			if(data.result){
			  $('.enrollment-filters .active').click();
        sEnrollmentAjaxUpdateParentAccessLink(data, wrapper.parents('#roster-wrapper'));
			}
			else{
				var row = wrapper.parents('tr:first').parent();
				var errorRow = '<tr class="error"><td colspan="3">'+data.message+'</td></tr>';
				row.prepend(errorRow);
				$('tr.error', row.parent()).fadeOut(4500, sPopupsResizeCenter);
				sEnrollmentAnnounceStatus(data.message, 500);
			}
		}
	});
}

function sEnrollmentChangeRemoveRowAjax(wrapper, msg){
	var href = wrapper.attr('href');
	var ajax = wrapper.attr('ajax');
	var enrollmentsWrapper = $('#enrollments-editor');
  var enrollmentsRosterWrapper = $('.roster-top', enrollmentsWrapper.parents('#roster-wrapper'));
	$.ajaxSecure({
		url: '/'+ajax,
		dataType: 'json',
		success: function(data){
			var row = wrapper.parents('tr');
      if(data.result){
        if(wrapper.hasClass('enrollment-unenroll')) {
          $('.enrollment-filters .archived-filter').removeClass('hidden');
        }
				var name = $('.user-name a', row).text();
		  		name = htmlentities(name);
				var replaceHTML = '<td colspan="3">'+name + ' ' + msg + '</tr>';
				$('td', row).remove();
				row.append(replaceHTML).fadeOut(2500, sPopupsResizeCenter);
				sEnrollmentAnnounceStatus(name + ' ' + msg, 500);
				var totalCountEl = $('.enrollment-view-nav .total', enrollmentsWrapper);
				var endCountEl = $('.enrollment-view-nav .end-count', enrollmentsWrapper);
				var totalCount = parseInt(totalCountEl.text())-1;
				var endCount = parseInt(endCountEl.text());
				totalCountEl.text(totalCount);
				if(endCount > totalCount){
					endCountEl.text(endCount-1);
				}
				if($('.enrollment-filters .pending-filter', enrollmentsRosterWrapper).length){
					var pendingFilter = $('.enrollment-filters .pending-filter', enrollmentsRosterWrapper);
					var isPending = pendingFilter.hasClass('active');
					if(isPending){
						var pendingEl = $('.count', pendingFilter);
						var curPending = parseInt(pendingEl.text());
						var newPending = curPending-1;
						if(newPending == 0){
							pendingFilter.remove();
							$('.enrollment-filters .all-filter', enrollmentsRosterWrapper).trigger('click');
						}
						else{
							pendingEl.text(newPending);
						}
					}
				}
				if($('.enrollment-filters .request-filter', enrollmentsRosterWrapper).length){
					var requestFilter = $('.enrollment-filters .request-filter', enrollmentsRosterWrapper);
					var hasRequest = requestFilter.hasClass('active');
					if(hasRequest){
						var requestEl = $('.count', requestFilter);
						var curRequest = parseInt(requestEl.text());
						var newRequest = curRequest-1;
						if(newRequest == 0){
							requestFilter.remove();
							$('.enrollment-filters .all-filter', enrollmentsRosterWrapper).trigger('click');
						}
						else{
							requestEl.text(newPending);
						}
					}
				}

        sEnrollmentAjaxUpdateParentAccessLink(data, enrollmentsWrapper.parents('#roster-wrapper'));
			}
			else{
				var errorRow = '<tr class="error"><td colspan="3">'+data.message+'</td></tr>';
				row.before(errorRow);
				$('tr.error', row.parent()).fadeOut(4500, sPopupsResizeCenter);
				sEnrollmentAnnounceStatus(data.message, 500);
			}
		}
	});
}

function sEnrollmentApproveAjax(wrapper){
	var href = wrapper.attr('href');
	var ajax = wrapper.attr('ajax');
	var enrollmentsWrapper = $('#enrollments-editor');
  var enrollmentsRosterWrapper = $('.roster-top', enrollmentsWrapper.parents('#roster-wrapper'));
	$.ajaxSecure({
		url: '/'+ajax,
		dataType: 'json',
		success: function(data){
			var row = wrapper.parents('tr');
			var name = $('.user-name a', row).text();
			var successMsg = name + ' ' + Drupal.t('has been successfully added.');
			var replaceHTML = '<td colspan="3">' + successMsg + '</tr>';
			$('td', row).remove();
			row.append(replaceHTML).fadeOut(2500, sPopupsResizeCenter);
			sEnrollmentAnnounceStatus(successMsg, 500);
			var totalCountEl = $('.enrollment-view-nav .total', enrollmentsWrapper);
			var endCountEl = $('.enrollment-view-nav .end-count', enrollmentsWrapper);
			var totalCount = parseInt(totalCountEl.text())-1;
			var endCount = parseInt(endCountEl.text());
			totalCountEl.text(totalCount);
			if(endCount > totalCount){
				endCountEl.text(endCount-1);
			}
			if($('.enrollment-filters .request-filter', enrollmentsRosterWrapper).length){
				var requestFilter = $('.enrollment-filters .request-filter', enrollmentsRosterWrapper);
				var hasRequest = requestFilter.hasClass('active');
				if(hasRequest){
					var requestEl = $('.count', requestFilter);
					var curRequest = parseInt(requestEl.text());
					var newRequest = curRequest-1;
					if(newRequest == 0){
						requestFilter.remove();
						$('.enrollment-filters .all-filter', enrollmentsRosterWrapper).trigger('click');
					}
					else{
						requestEl.text(newPending);
					}
				}
			}
			if($('.enrollment-filters .pending-filter', enrollmentsRosterWrapper).length){
				var pendingFilter = $('.enrollment-filters .pending-filter', enrollmentsRosterWrapper);
				var isPending = pendingFilter.hasClass('active');
				if(isPending){
					var pendingEl = $('.count', pendingFilter);
					var curPending = parseInt(pendingEl.text());
					var newPending = curPending-1;
					if(newPending == 0){
						pendingFilter.remove();
						$('.enrollment-filters .all-filter', enrollmentsRosterWrapper).trigger('click');
					}
					else{
						pendingEl.text(newPending);
					}
				}
			}

    sEnrollmentAjaxUpdateParentAccessLink(data, enrollmentsWrapper.parents('#roster-wrapper'));
	}
	});
}

function sEnrollmentGetGradingGroupScope(){
  var gradingGroups = $('#grading-groups-wrapper');
  if(gradingGroups.length > 0){
    var scope = sAngular.getScope(gradingGroups);
    if(scope != undefined){
      return scope;
    }
  }
  return false;
}

/**
 * Parent Access Codes
 *  update: download link state
 */
function sEnrollmentAjaxUpdateParentAccessLink(data, context) {
  var dLink = $('.parent-access-code:not(.s-js-course-is-inactive)', context);
  if(dLink.length == 1 && data.parent_access_code_allowed != undefined) {
    if(data.parent_access_code_allowed) {
      dLink.removeClass('disabled');
    }
    else {
      dLink.addClass('disabled');
    }
  }
}

function _sEnrollmentGenerateQrCodesAndOpenPrintPageSubmitForm(url, formVars){
  var $form = $('<form>').attr({
    action: url,
    target: '_blank',
    method: 'post'
  });
  function addFormVal(name, value){
    $form.append(
      $("<input>").attr({
        type: 'hidden',
        name: name
      }).val(value)
    );
  }
  addFormVal('form_build_id', Drupal.settings.s_common.csrf_key);
  addFormVal('form_token', Drupal.settings.s_common.csrf_token);
  for (var formVarProp in formVars){
    if(formVars.hasOwnProperty(formVarProp)){
      addFormVal(formVarProp, formVars[formVarProp]);
    }
  }
  $('body').append($form);
  $form.submit();
}

function sEnrollmentGenerateQrCodesAndOpenPrintPage(uids, courseSectionNid, popup) {
  var formVars = {};
  uids.forEach(function(uid){
    formVars['uids[' + uid.toString() + ']'] =  uid;
  });

  $form = _sEnrollmentGenerateQrCodesAndOpenPrintPageSubmitForm(
    '/qr-code-print/course/' + courseSectionNid.toString() + '/print',
    formVars
  );
  popup.close();
}

function sEnrollmentGenerateQrCodesAndOpenPrintPageAllMembers(courseSectionNid, popup) {
  $form = _sEnrollmentGenerateQrCodesAndOpenPrintPageSubmitForm(
    '/qr-code-print/course/' + courseSectionNid.toString() + '/print/all',
    {}
  );
  popup.close();
}

$(document).bind('popups_form_success', function() {
  if (!$('#roster-wrapper').length) return;
  var msgEl = $('#main-content-wrapper .popup-messages-wrapper .messages').first();
  if (msgEl.length) {
    var msgClone = msgEl.clone();
    msgClone.find('.messages-close-btn').remove();
    sEnrollmentAnnounceStatus(msgClone.text().trim(), 500);
  }
});
