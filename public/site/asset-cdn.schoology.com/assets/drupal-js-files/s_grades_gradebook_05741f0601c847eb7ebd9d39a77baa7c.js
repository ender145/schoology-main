Drupal.behaviors.sGradesGradebook = function(context){
	$('.gradebook-course:not(.sGradesGradebook-processed)').addClass('sGradesGradebook-processed').each(function(){
		var gradebookCourse = $(this);
		$('.gradebook-course-title', $(this)).click(function(){
			var $grades = $('.gradebook-course-grades', gradebookCourse);
			var $button = $('a[role="button"]', this);
			var isExpanded = $grades.is(':visible');
			
			$grades.toggle();
			$button.attr('aria-expanded', isExpanded ? 'false' : 'true');
			return false;
		});
	});

	$('.gradebook-course-title:visible').each(function(){
		var $grades = $('.gradebook-course-grades', $(this).parent());
		var $button = $('a[role="button"]', this);
		if ($grades.is(':hidden')) {
			$button.attr('aria-expanded', 'false');
		} else {
			$button.attr('aria-expanded', 'true');
		}
	});
	$('.gradebook-course-title:visible > .gradebook-course-grades').hide();

  // specify a hash string on the top to open and scroll to that course by default
  $(function(){
    if(typeof window.location.hash != 'undefined' && window.location.hash.length){
      var matches = window.location.hash.match(/section=(\d+)/);
      if(matches){
        var courseRow = $('#s-js-gradebook-course-' + matches[1], context);
        if(courseRow.length){
          $('.gradebook-course-grades', courseRow).show();
          $('.gradebook-course-title a[role="button"]', courseRow).attr('aria-expanded', 'true');
          $(window).scrollTop(courseRow.offset().top);
        }
      }
    }
  });

	$("#s-grades-grades-print-form:not(.sGradesGradebook-processed)").addClass('sGradesGradebook-processed').each(function(){
    var formObj = $(this);
    var submitBtn = $('#edit-submit', formObj).closest('.submit-span-wrapper');

    submitBtn.hide();
    
    var studentCbObjs = $(".form-checkboxes.students input[type=checkbox]", formObj);
    var studentSelectAllCbObj = $('#edit-students-selectall', formObj);
    
    studentSelectAllCbObj.click(function(){
      var checked = $(this).is(':checked');
      studentCbObjs.prop('checked', checked).eq(0).change();
    });
    studentSelectAllCbObj.prop('checked', (studentCbObjs.length == studentCbObjs.filter(':checked').length));
    
    studentCbObjs.each(function(){
      $(this).bind('click',function(){
        if(!$(this).is(':checked')) {
          studentSelectAllCbObj.prop('checked',false);
        }
        studentSelectAllCbObj.prop('checked', (studentCbObjs.length == studentCbObjs.filter(':checked').length));
      });
    });
    
    var gpsCbObjs = $(".existing-grading-periods input[type=checkbox]", formObj);
    var gpsSelectAllCbObj = $('#edit-gps-selectall', formObj);
    
    gpsSelectAllCbObj.click(function(){
      var checked = $(this).is(':checked');
      gpsCbObjs.prop('checked', checked).eq(0).change();
    });
    gpsSelectAllCbObj.prop('checked', (gpsCbObjs.length == gpsCbObjs.filter(':checked').length));
    
    gpsCbObjs.each(function(){
      $(this).bind('click',function(){
        if(!$(this).is(':checked')) {
          gpsSelectAllCbObj.prop('checked',false);
        }
        gpsSelectAllCbObj.prop('checked', (gpsCbObjs.length == gpsCbObjs.filter(':checked').length));
      });
    });    

    $("input[type=checkbox]", formObj).change(function(){
      
      // You must check at least 1 student and 1 grading period in order to submit the form
      var studentsChecked = $('.form-checkboxes input[type=checkbox]:checked').length;
      var gpsChecked = $('.existing-grading-period-item input[type=checkbox]:checked').length;
      
      if(studentsChecked && gpsChecked){
        submitBtn.show();
        return;
      }
      
      submitBtn.hide();
    });
	});
}