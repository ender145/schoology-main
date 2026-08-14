Drupal.behaviors.sUserProfile = function(context){
	$('.profile-action-links:not(.sUserProfile-processed)', context).addClass('sUserProfile-processed').each(function () {
		$(this).sActionLinks({hidden: false,wrapper: '.profile-action-links'});
	});

	$('.avatar-choice:not(.sUserProfile-processed)', context).addClass('sUserProfile-processed').each(function () {
		var form = $(this).parents('form');
		var avatar = $(this);

		avatar.bind('click', function(){
			var id = $(this).attr('id');
      $("#edit-profile-picture-avatar-choice", form).val(id);
			submitBtn = $('#edit-submit', form);
			submitBtn.attr('disabled', 'disabled');
			form.submit();
		});
	});

	$('.s-user-network-connections .link-btn:not(.sUserProfile-processed)', context).addClass('sUserProfile-processed').each(function () {
            var btn = $(this);
            var wrapper = btn.parent().parent();
            btn.bind('click', function(){
              if ($(this).hasClass('disabled')){
                return false;
              }
              var href = $(this).attr('href')+'&ajax=true';
              $.ajax({
                  type: "GET",
                  url: href,
                  dataType: "html",
                  success: function(html){
                    wrapper.html(html);
                    Drupal.attachBehaviors(wrapper.parent());
                  }
              });
              return false;
            });
	});

  $('.content-top-wrapper .subtitle-wrapper .overflow-toggle-wrapper:not(.sUserProfile-processed)', context).addClass('sUserProfile-processed').each(function() {
    $('.content-top-wrapper .subtitle-wrapper .overflow-toggle-wrapper .overflow-toggle').click(function() {
      var $schoolLinks = $('.content-top-wrapper .subtitle-wrapper .schools-wrapper');
      var isOverflowing = $schoolLinks.innerWidth() < $schoolLinks[0].scrollWidth;

      sUserProfileToggleBuildingDisplay(isOverflowing);
    });

    //Display the overflow toggle if the school links are overflowing
    var $schoolLinks = $('.content-top-wrapper .subtitle-wrapper .schools-wrapper');
    if ($schoolLinks.innerWidth() < $schoolLinks[0].scrollWidth) {
      $(this).removeClass('hidden');
    }
    //save initial height to detect word-wrapping
    var initSchoolLinksHeight = $schoolLinks.height();
    $(window).on("resize", function(){
      var $overflowToggleWrapper = $('.content-top-wrapper div.subtitle-wrapper .overflow-toggle-wrapper');
      if ($schoolLinks.innerWidth() < $schoolLinks[0].scrollWidth || $schoolLinks.height() > initSchoolLinksHeight) {
        $overflowToggleWrapper.removeClass('hidden');
      }
      else{
        $overflowToggleWrapper.addClass('hidden');
      }
    })
  });
}

function sUserProfileToggleBuildingDisplay(displayAllSchools) {
  if (typeof displayAllSchools !== 'boolean') {
    return;
  }

  var $subtitleWrapper = $('.content-top-wrapper div.subtitle-wrapper');
  var $schoolWrapper = $('.content-top-wrapper div.subtitle-wrapper .schools-wrapper');
  var $overflowToggleWrapper = $('.content-top-wrapper div.subtitle-wrapper .overflow-toggle-wrapper');

  var showAllDisplayText = Drupal.t('show all');
  var hideAllDisplayText = Drupal.t('collapse list');


  if (displayAllSchools) {
    $schoolWrapper.append($overflowToggleWrapper);
    $('.overflow-toggle', $overflowToggleWrapper).text(hideAllDisplayText);
  }
  else {
    $subtitleWrapper.append($overflowToggleWrapper);
    $('.overflow-toggle', $overflowToggleWrapper).text(showAllDisplayText);
  }

  $overflowToggleWrapper.toggleClass('schools-displaying', displayAllSchools);
  $schoolWrapper.toggleClass('schools-displaying', displayAllSchools);
  $subtitleWrapper.toggleClass('schools-displaying', displayAllSchools);
}
