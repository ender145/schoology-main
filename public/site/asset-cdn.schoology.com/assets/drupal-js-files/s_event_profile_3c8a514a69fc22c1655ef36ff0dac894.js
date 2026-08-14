Drupal.behaviors.sEventProfile = function(context){  
	
	resetActive = false;
	if(typeof Drupal.settings.s_event != 'undefined'){
		resetActive = Drupal.settings.s_event.profile_resetactive;
	}
	
	if(resetActive == 'true'){
		$('.active-trail').removeClass('active-trail');
		$('.active').removeClass('active');
	}
	$('.info-container-event .action-links-wrapper:not(.sCourse-processed)').addClass('sCourse-processed').each(function(){
		$(this).sActionLinks(
				{
					hidden: false,
					wrapper: '.action-links-wrapper'
				}
			);
	});
	
        
  $('.calendar-mini-link:not(.sEventProfile-processed)', context).addClass('sEventProfile-processed').each(function(){
    
    $(this).click(function(event){
        event.preventDefault();
            
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
        
  $('.attachments-video-thumbnails-play:not(.sEventProfile-processed)', context).addClass('sEventProfile-processed').each(function(){
    var btn = $(this);
    btn.bind('click', function(){
      var wrapper = btn.parents(".attachments-video");
      var video = $(".video-video", wrapper);
      wrapper.after(video);
      video.show();
      wrapper.hide();
      return false;
    });
  });
	
	$('.reply-comment').click(function(){
		return false;
	});
	
	setupPagerItems();
	
	function setupPagerItems(){
		$('.pager li').each(function(){
			$('a',this).click(function(){
				$.get($(this).attr('href'),function(data){
					newContent = $('.invitees-list-wrapper',data).html();
					var popup = Popups.activePopup();
					$('.invitees-list-wrapper').html(newContent);
					$('.cancel-btn').attr('href','#');
					$('.cancel-btn').click(function(){
						popup.close();
					});
					Popups.resizeAndCenter(popup);
					setupPagerItems();
				});
				return false;
			});
		});
		classList = new Array('.pager-last','.pager-next','.pager-first','.pager-previous');
	}
	
  
  $('#rsvp-dropdown-options-wrapper #rsvp-options', context).bind('click', function(){
    var rsvpOptions = $(this);
    var rsvpActions = $('#rsvp-options-list', rsvpOptions);
    $('.action-links-unfold', rsvpOptions).toggleClass('active');
    if($('.action-links-unfold', rsvpOptions).hasClass('active')){
      rsvpActions.show();
    }
    else{
      rsvpActions.hide();
    }
  });
  
}