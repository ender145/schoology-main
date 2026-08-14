Drupal.behaviors.sCourseCourses = function(context){
  $(".filter-course-search a").bind("click", function(){
    $(this).parents("#s-course-search-form").submit();
    return false;
  });

  $('.courses-listing .course-item:not(.sCourseCourses-processed)').addClass('sCourseCourses-processed').each(function(){
    if($(".course-mgmt-link", this).length > 0){
      $(this).sActionLinks(
          {
            hidden: false,
            wrapper: '.course-mgmt-link',
            rowClass: '.list-item'
          }
      );
    }
  });
  $('#course-section-search-results:not(.sCourseCourses-processed)').addClass('sCourseCourses-processed').each(function(){
    if($(".course-mgmt-link", this).length > 0){
      $(this).sActionLinks(
          {
            hidden: false,
            wrapper: '.course-mgmt-link',
            rowClass: '.section-item'
          }
      );
    }
  });
  
  
  $('.courses-listing.browse:not(.sCourseCourses-processed)', context).addClass('sCourseCourses-processed').each(function(){
    var coursesListing = $(this);
    $('.course-item .course_name .clickable', coursesListing).click(function(){
      var courseItem = $(this).parents('.course-item');

      if(courseItem.data('inProgress'))
        return false;

      var courseDetails = $('.course-details', courseItem);

      if(courseDetails.length){
        courseDetails.toggle();
      } else {
        courseItem.data('inProgress', 1);
        var courseNID = $(this).parents('.course-item').attr('id').split('-')[1];
        var courseDetails = $('<div class="course-details"></div>');
        courseDetails.html('<img src="/sites/all/themes/schoology_theme/images/ajax-loader.gif" alt="' + Drupal.t('Loading') + '" />');
        courseItem.append(courseDetails);
        $.ajax({
          type: "GET",
          url: '/course/' + courseNID + '/ajax_details',
          dataType: "json",
          success: function(html){
            courseDetails.empty();
            courseDetails.hide();
            courseDetails.html(html);
            $('.toggle-inactive-courses', courseDetails).click(function(){
              var showTxt = Drupal.t('Show');
              var hideTxt = Drupal.t('Hide');
              var spanTxt = $('span', $(this));
              if(spanTxt.text() == showTxt){
                spanTxt.text(hideTxt);
              } else {
                spanTxt.text(showTxt);
              }
              $(this).next().toggle();
            });
            $('.sections-active .list-item, .sections-inactive .list-item', courseItem).each(function(){
              if($(".course-mgmt-link", this).length > 0){
                $(this).sActionLinks(
                    {
                      hidden: false,
                      wrapper: '.course-mgmt-link',
                      rowClass: '.list-item'
                    }
                );
              }
            });
            courseDetails.show();
            courseItem.data('inProgress', 0);
            Drupal.attachBehaviors(courseDetails);
          }
        });
      }
    });
  });

  $('.s-course-block-more-link:not(.sCourseCourses-processed)').addClass('sCourseCourses-processed').each(function(){
    sCourseCoursesBindMoreBtn( $(this) );
  });
  
  $('.s-js-archive-section:not(.sCoursesCourses-processed), .s-js-restore-section:not(.sCoursesCourses-processed)', context).addClass('sCourseCourses-processed').each(function(){
      $(this).click(function(){
          var section_info = $(this).attr('id').split('-');
          var action = section_info[0];
          //validate action is acceptable
          if (action != 'restore' && action !='archive'){  
            return false;
          }
          section_id = section_info.pop();         
          courseName = section_info[2] +': ' + section_info[3];
          var courseArchiveActionPopupBody = '<p class = "' + action + '-confirmation">' + Drupal.t('Are you sure you want to ' + action) + ' <b>' + courseName + '</b><p class = "description">' + Drupal.t('Note: This will ' + action + ' the course for all course members too</p>');
          sCommonConfirmationPopup({     
              title: action.charAt(0).toUpperCase() + action.slice(1) + ' Course/Section',
              body: courseArchiveActionPopupBody,
              extraClass: ' section-' + action,
              confirm: {
                text:Drupal.t('Submit'),
                func: function(){
                $.ajaxSecure({
                  url: '/course/' + section_id + '/' + action,
                  dataType: 'json',
                  success: function (data){
                    msg = Drupal.theme.sAjaxMessage(data.msg + '"' + courseName + '"', data.msgClass);
                    $('#content-wrapper', context).before(msg);
                    $('.messages-close-btn', context).click(function(){
                      $('.messages-close-btn', context).parent().fadeOut(500 , function(){
                      $('.messages', context).remove();
                      });
                    });
                    
                    //remove section row from dom
                    var sectionRow = $('#section-' + section_id, context);            
                    var courseWrapper = sectionRow.parents('.course-item');
                    sectionRow.fadeOut(1000,function(){
                      $(this).remove();
                    });
                    //if it is last section, remove the course wrapper as well (checking for 1 not 0 since items fade out)
                    if (courseWrapper.find('.section-item').length == 1){
                      courseWrapper.remove();
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

// not sure why attachbehaviors not working
function sCourseCoursesBindMoreBtn( btn ){

   btn.bind('click', function(){
    var href = btn.attr('href');
    btn.replaceWith('<img src="/sites/all/themes/schoology_theme/images/ajax-loader.gif" alt="' + Drupal.t('Loading') + '" class="more-loading" id="course-block-more-loading"/>');

    $.ajax({
      type: "GET",
      url: href,
      dataType: "json",
      success: function(json){
        var course_parent_ul = $('#course-block-more-loading').parent('ul');
        $('#course-block-more-loading').remove();
        var response_html = $(json.html);
        var new_sections = $('ul.courses-listing' , response_html ).html();
        //Drupal.attachBehaviors(new_sections);
        course_parent_ul.append(new_sections);
        sCourseCoursesBindMoreBtn( $('.s-course-block-more-link') )
      }
    });
  });
}
