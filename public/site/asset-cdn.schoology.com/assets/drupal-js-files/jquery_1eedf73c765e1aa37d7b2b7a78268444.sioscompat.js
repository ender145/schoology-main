/*
 * sioscompat v1.0
 * schoology minimal custom compatibilty for mobile webkit browsers
 */

(function($){
  $.fn.sioscompat = function(options) {

    var opts = $.extend( {}, $.fn.sioscompat.defaults, options);

    // device detection via user agent
    var device_agent = navigator.userAgent.toLowerCase();
    var id_match = device_agent.match(/(iphone|ipod|ipad)/);

    if (!id_match && !opts.override)
      return;


    /// date module date popup compat
    $(this).not('.sios-enabled)').addClass('sios-enabled').each(function(){

      var base_obj = $(this);
      var time_inputs = [];

      if( Drupal.settings.datePopup && typeof Drupal.settings.datePopup == 'object') {
        // replace time-select inputs with the 'time' input
        $.each( Drupal.settings.datePopup , function( index , val ){
          if( typeof val == 'object' && val.func && val.func == 'timeEntry' ) {
           Drupal.settings.datePopup[ index ].func = null;
           time_inputs.push( replaceTimeInput( $('#'+String(index),base_obj) ) );
          }
        });
      }

      if( time_inputs.length > 0 ) {
        var invalid_inputs = [];
        time_inputs[0].parents('form').submit(function(){
          $.each( time_inputs , function( index , obj ){
            var time_val = obj.val();
            if(time_val == '')
              return;

            time_val = time_val.toUpperCase().trim();
            time_val = time_val.replace(/[^0-9APMapm:]+/g,'');

            if( time_val.match(/^[0-9]{1,2}:[0-9]{2}$/) ){
              // convert from military time
              var time_parts = time_val.split(":");

              var hour = Number(time_parts[0]);
              if( hour > 12 ){
                time_parts.push('PM');
                time_parts[0] = String(hour - 12);
              } else if( hour < 12 ) {
                time_parts.push('AM');

                if( hour == 0 )
                  time_parts[0] = "12";
              } else {
                time_parts.push('PM');
              }

              time_val = time_parts[0] + ':' + time_parts[1];
              if( time_parts.length > 2 )
                time_val += time_parts[2];
            }

            obj.val(time_val);

            if(!time_val.match(/[0-9]{1,2}:[0-9]{2}AM|PM/))
              invalid_inputs.push( obj );
          });
        });
      }
    });



    function replaceTimeInput( base_input  ) {

      // html 5 time input
      var time_input = $('<input type="time" />');
      time_input.attr({'id': base_input.attr('id') , 'name': base_input.attr('name') , 'class': base_input.attr('class') , 'maxlength': base_input.attr('maxlength') } );

      // infotip
      var cluetip_content = Drupal.t('Please enter the time in this format: HH:MM am/pm');
      var infotip_obj = $('<span class="infotip ipad-time" tipsygravity="sw"><span class="infotip-content">' + cluetip_content + '</span></span>');

      base_input.replaceWith( time_input );
      time_input.after( infotip_obj );

      // infotip functionality
      sAttachBehavior( 'sCommonInfotip' , time_input.parent() );

      return time_input;
    }

  }

  // plug-in defaults
  $.fn.sioscompat.defaults = {
   'override' : false // override device detection and run the plugin anyways
  };
})(jQuery)
