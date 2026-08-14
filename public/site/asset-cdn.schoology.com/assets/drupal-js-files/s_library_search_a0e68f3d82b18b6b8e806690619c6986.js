Drupal.behaviors.sLibrarySearch = function(context){
	//manage the search bar
	$('#library-search-form-wrapper:not(.sLibrarySearch-processed)', context).addClass('sLibrarySearch-processed').each(function() {
		var menuItem = $('#resources-left-menu-wrapper .search-btn-wrapper').parents('li').eq(0);
		var form = $(this);
		var input = $('input', form);
		$('body').bind('mouseup', function(e){
			if(!form.is(e.target) && form.has(e.target).length === 0){
				form.hide();
				$('.search-btn-wrapper', menuItem).removeClass('active');
			}
		});
		
		$('.search-btn-wrapper span', menuItem).bind('click', function(){
			form.toggle();
			$(this).parent().toggleClass('active');
			input.trigger('focus');
		});
		
		//the search btn magnifying glass (actual search request)
		$('span', form).bind('click', function(){
			sLibrarySearchTrigger(input);
		});
		
		input.bind('keypress', function(e){
			var code = (e.keyCode ? e.keyCode : e.which);
			if(code == 13) { //Enter keycode
				sLibrarySearchTrigger(input);
			}
		});
	});

  // listen to the collection change event from s_library_save_node_form.js
  $(document).unbind('template_location_changed').bind('template_location_changed', function(event, param){
    var paramContext = $('#' + param);
    $('.submit-buttons', paramContext).show();

    if($('#edit-folder-select option', paramContext).length < 2){
      $('#edit-folder-select', paramContext).hide();
      $('.folder-icon', paramContext).hide();
    }
  });

	$('#library-search-filters:not(.sLibrarySearch-processed)', context).addClass('sLibrarySearch-processed').each(function() {
		var wrapper = $(this);
		
		$('.filter-item input', wrapper).bind('change', function(){
			var val = $(this).attr('name').split(':');
			var currentHash = sLibraryGetHash();
			//check if we have anything set for this given key
			var keyValue = sLibrarySearchGetParameterByName(val[0], currentHash);
			var hadExistingKeyHash = keyValue.length;
			var originalString = val[0] + '='+keyValue;
			var newHash = '';
			
			var keyValues = keyValue.split(',');
			var newValues = new Array();
			
			if($(this).is(":checked")){
				var arrayCount = 0;
				for(var i = 0; i < keyValues.length; i++){
					if(keyValues[i].length){
						newValues[arrayCount++] = keyValues[i];
					}
				}
				
				newValues[arrayCount++] = val[1];
			}
			else{
				var arrayCount = 0;
				for(var i = 0; i < keyValues.length; i++){
					if(keyValues[i] != val[1]){
						newValues[arrayCount++] = keyValues[i];
					}
				}
			}
			
			if(newValues.length){
				var newHashString = val[0] + '=' + (newValues.length > 1 ? newValues.join(',') : newValues);
				//if we had an existing string, append, otherwise add the new hash key/value
				newHash = hadExistingKeyHash ? currentHash.replace(originalString, newHashString) : (currentHash + '&' + newHashString);
			}
			else{
				newHash = currentHash.replace("&"+originalString, "");
			}
			sLibrarySetHash(newHash);
		});
		
		$('.more-btn', wrapper).bind('click', function(){
			$(this).hide();
			$('.more-wrapper', $(this).parent()).show();
		});
	});

  sLibraryProcessDownloadButtons(context, window.location.href);
};

function sLibrarySearchTrigger(input){
	if(typeof sLibrarySetHash == 'function'){
		sLibrarySetHash( '/resources/search?query='+input.val() );
	}
	else{
    sAttachBehaviors(['sLibrarySearch', 'sLibrarySaveNodeForm']);
		window.location = '/resources#/resources/search?query='+input.val();

	}
}

function sLibrarySearchGetParameterByName(name, url) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(url);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}