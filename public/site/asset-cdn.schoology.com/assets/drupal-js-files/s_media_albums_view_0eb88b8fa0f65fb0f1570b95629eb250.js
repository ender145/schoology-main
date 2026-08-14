Drupal.behaviors.sMediaAlbumsView = function(context){

	$('.sshuffleContainer:not(.sMediaAlbumView-processed)', context).addClass('sMediaAlbumView-processed').each(function(){
    var container = $(this);
    var parentObj = $(this).parents('.shuffleParent-albums');

		var ajax_opts = {
			url: Drupal.settings.s_media_album_shuffle_options.ajax_url,
			type: "POST",
			data: { album_id: container.attr('maId') },
			dataType: 'json',
			success: function (data, status){
		  },
		  error: function (data, status, e){
		    if(typeof e != 'undefined')
		      alert(Drupal.t("There was a problem and your change was not saved. Please reload the page and try again in a few moments."));
		  }
		};

		container.sShuffle({
			'ajax_opts': ajax_opts,
			'ajax_enabled': true,
			'ppdrag_opts': {
				'dzObj': parentObj ,
				'dzSubSelector': 'a.album-cover-image',
				'dzSelector': '.sshuffleContainer'
			}
		});

		container.bind('click',function(e){
			e.preventDefault();
			// this click event is firing at the end of a drag-drop
			var shuffle_disable_click = $(this).data('sshuffle_disable_click');
			$(this).data('sshuffle_disable_click',false)
			if( shuffle_disable_click )
				return false;
			window.location.href = $(this).attr('malink');
	  });
	});

	// Because albums have variable length titles, they have variable height and there are float fixer (i.e. 'clear: both')
	// divs after every 2 albums to create height formatted rows. These clearing divs must be readjusted when shuffling
	$(document).bind('sshuffle_aftershuffle',function(){

	  var albumCount = 0;
	  var albumPerRowCount = 2;
	  var parentObj = $(".shuffleParent-albums");
	  $('.sshuffleRowClear' , parentObj ).remove();

	  $('.sshuffleContainer' , $(".shuffleParent-albums")).each(function() {
      if( ++albumCount % albumPerRowCount == 0 ){
      	$(this).after('<div class="sshuffleRowClear"></div>');
      }
		});
  });
}
