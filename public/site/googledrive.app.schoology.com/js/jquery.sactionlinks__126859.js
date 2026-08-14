/*
 * Action Links
 * A Tool that allows a sec of buttons to be displayed by a gear
 * and contain a dropdown of user choices
 * Created: by Jeremy Friedman 12/24/2009
 * 
 * Update: the s_actionlinks_hide event has been removed.  It is never listened for and
 * was preventing the onbeforeunload event from firing in the gradebook.
 *
 */
var sActionLinkBodySet = false;
var sActionLinkBodySet2 = false;
(function($) {
  $.fn.sActionLinks = function(options) {
    var opts = $.extend( {}, $.fn.sActionLinks.defaults, options);

    if( opts.hide_all ){
      $(".action-links-unfold").removeClass('active').next().hide();
      $(".sActionLinksVisible").removeClass('sActionLinksVisible')
      return;
    }

    // determine if the gears are hidden or shown by default
    var hidden = options.hidden;

    // determine if there is a custom wrapper element we can use
    var wrapper = options.wrapper;
    var rowClass = options.rowClass;
    var item = $(this);

    if (hidden) {
      item.bind('mouseenter', function() {
        var element = $(this);
        if (wrapper.length > 0) $(wrapper, element).addClass('sActionLinksVisible');
      });

      item.bind('mouseleave', function() {
        var element = $(this);

        if (!$(".action-links", element).is(":visible")) {
          if (wrapper.length > 0) $(wrapper, element).removeClass('sActionLinksVisible');
          $(".action-links", element).hide();
        }
      }).trigger('mouseleave');
    }

    $(".action-links-unfold").data('s_actionlinks_opts', opts);

    // If the link has "tabindex" attribute that means
    // we want to make its internal navigation accessible with keyboard
    if (item[0].hasAttribute('tabindex')) {
      item
        .bindEnterHandler(function() {
          $(this).find('.action-links-unfold').click();
        })
        .find('ul.action-links > li')
        .attr('tabindex', '0')
        .bindEnterHandler(function() {
          var $clickable = $(this).find('.clickable');

          // If it is a link then move to the specified href when Enter is pressed
          if ($clickable.attr('href')) {
            window.location.href = $clickable.attr('href');
          } else {
            $clickable.click();
          }
        });
    }
    

    $(".action-links-unfold", item).bind('click', function(e) {
      $('.keep-open').each(function(){
        $(this).trigger('sActionsClicked');
      });
      
      e.stopPropagation();
      if(!$(this).hasClass('disabled')){
        $(this).toggleClass('active').next().toggle();
        $(".action-links-unfold").not($(this)).removeClass('active').next().hide();
        $(".sActionLinksVisible").not($(this).parents(".sActionLinksVisible")).removeClass('sActionLinksVisible');

        if( $(this).hasClass('active') ) {
          $(document).unbind('click.sactionlinks').bind('click.sactionlinks',function(event) {

            var cur_menu = $(event.target).parents('li');
            var parent_btn = cur_menu.parent('ul.action-links').siblings('.action-links-unfold');
            var opts = parent_btn.data( 's_actionlinks_opts');

            if(typeof opts == 'object' && opts.stay_open)
              return;

            $(".action-links-unfold").not(cur_menu).not('.keep-open').removeClass('active').next().hide();

            if( $(".action-links-unfold.active").size() == 0 ){
              $(document).unbind('click.sactionlinks');
              $(".sActionLinksVisible").removeClass('sActionLinksVisible');
            }
          });
        }
        else {
          $(document).unbind('click.sactionlinks');
        }
      }
    });


    $(".action-links a", item).bind('click',function(event) {
      var parent_ul = $(this).parents('.action-links');
      var parent_btn = parent_ul.siblings('.action-links-unfold');

      parent_ul.hide();
      parent_btn.removeClass('active');      
    });
  };

  // plug-in defaults
  $.fn.sActionLinks.defaults = {
    hidden : true,
    hide_all: false,
    stay_open: false // whether or not to hide the menu when a menu item is clicked
  };

  // Attach handler on the "Enter" key press
  $.fn.bindEnterHandler = function(handler) {
    return this.bind('keypress', function(e) {
      if (e.which === 13) {
        handler.call(this, e);
        return false;
      }
    })
  };
})(jQuery);
