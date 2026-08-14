Drupal.behaviors.sMediaAlbumCreate = function(context){

	$('#s-media-album-create-form:not(.sGradesItemAddForm-processed)').addClass('sGradesItemAddForm-processed').each(function(){
		var form = $(this);

		$('#toggle-copy:not(.sMediaAlbumCreateProcessed)' , form ).addClass('sMediaAlbumCreateProcessed').click(function(){
		  $(this).siblings().toggle();
		  popup = Popups.activePopup();
		  if(popup != null) Popups.resizeAndCenter(popup);
		  return false;
		});
		
		$('.course-checkbox').click(function(){
			var parent = $(this).parents('.addl-course').filter(':first');
			$('.addl-course-options', parent).toggle();
		});
		
	});
}

/**
 * Popups.js updateMethod: callback
 */
function sMediaAlbumCreateCallback(data){ 
  Popups.close();
  var poPath = '/'+ data.path + '/content/add';
  if(data.path_query.length>0) {
      poPath += "?" + data.path_query;
  }

  var po = { ajaxForm: false,
	    extraClass: 'popups-large',
		updateMethod: 'none',
		href: poPath,
		hijackDestination: false,
		disableCursorMod: true,
		disableAttachBehaviors: false
	};

  Popups.openPath(this, po, window);

  $(document).unbind('popups_close')
  .bind('popups_close',function(p,a){
	  window.location.href = '/' + data.path;
	  return false;
  	});

  return false;
}