Drupal.behaviors.s_user_picture_block = function(context){
  $(".picture_block .picture a").tipsy({gravity : $(document).attr("dir") === 'rtl' ? 'nw' : 'ne' });
}
