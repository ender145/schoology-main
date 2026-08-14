/*
 * expected html structure:
 * <div class='sUserAutocompleteMain'>
 *  <div>
 *    <input class='ac_input' />
 *   </div>
 * </div>
 */

(function($) {
  $.fn.sUserAutocomplete = function(options) {
    var existing_opts = $(this).data('sUserAutocompleteOpts'),
        thisObj = $(this);

    if( existing_opts ) {
      if( options.clear ) {
        var opts = $(this).data('sUserAutocompleteOpts');
        $(this).data('sUserAutocompleteRecipients',[]);

        $(this).parent('.sUserAutocompleteInputParent').siblings("."+opts.userlink_class).each(function(){
          $(this).remove();
        });

        $(this).show().focus();
        $("#"+opts.helper_id).hide();
      }

      return $(this);
    }

    var opts = $.extend( true , {}, $.fn.sUserAutocomplete.defaults, options);

    // generate a unique class and append
    var len = $('input.ac_input:not(.sui-count)').length;
    opts.sui_class = opts.autocomplete_opts.sui_class = 'sui'+String(len);
    $(this).addClass('sui-count '+opts.sui_class);

    $(this).data('sUserAutocompleteRecipients',[]);
    $(this).data('sUserAutocompleteOpts', opts );

    if(opts.helper_id && opts.helper_text){
      var helper = $("<div></div>").attr('id',opts.helper_id).addClass('recipient-helper').css('display','none').html(opts.helper_text);
      $('body').append(helper);
    }

    $(this).parent().addClass('sUserAutocompleteInputParent');

    $(this).bind('keydown',function(e){
      var opts = $(this).data('sUserAutocompleteOpts');
      if( $(this).data('sUserAutocompleteRecipients').length == 0 ) $("#"+opts.helper_id).show();
    });

    $(this).bind('focus',function(){
      var opts = $(this).data('sUserAutocompleteOpts');
        if($(this).data('sUserAutocompleteRecipients').length == 0){
          var pos = $(this).position();
          var height = $(this).height() + $(this).innerHeight();
          $("#"+opts.helper_id).css({'position':'absolute','top': pos.top + height }).show();
        }
    });

    $(this).bind('blur',function(){
      var opts = $(this).data('sUserAutocompleteOpts');
      $("#"+opts.helper_id).hide();
    });

    $(this).bind('keypress',function(){
      var opts = $(this).data('sUserAutocompleteOpts');
      $("#"+opts.helper_id).hide();
    });

    /**
     * Calculate the remaining length of the container object and fill the rest with the input box to create an inline feel.
     * Might want to consider a threshold for the width of the input box as it can potentially be too small (e.g. 1px).
     */
    var recalculateInputWidth = function(containerObj){
      var inputWrapper = $("div.sUserAutocompleteInputParent", containerObj);
      var boxWidth = containerObj.width();
      var sumNameWidths = 0;
      var extraWidth = inputWrapper.outerWidth(true) - inputWrapper.width();

      $("span."+opts.userlink_class,containerObj).each(function(){
        var elementWidth = $(this).outerWidth(true) + 1;
        sumNameWidths += elementWidth;
        if(sumNameWidths >= boxWidth){
          sumNameWidths = elementWidth;
        }
      });

      inputWrapper.width(boxWidth - sumNameWidths - extraWidth);
    };

    var removeUser = function(){
      var uid = $(this).attr('id').replace("user-remove","");
      var userlink = $("#user"+uid);
      var userlistParent = $(this).parents('.sUserAutocompleteMain');
      var parentInput = userlistParent.find('.ac_input');
      var recipts = parentInput.data("sUserAutocompleteRecipients");
      recipts = $.grep(recipts, function(value) { return value != uid; });
      parentInput.data("sUserAutocompleteRecipients",recipts);
      userlink.remove();
      parentInput.show().focus();
      recalculateInputWidth(userlistParent);
      $(document).trigger('sUserAutocomplete_onuserremove',[$(this),uid,recipts]);
    };

    var addUser = function(data, formatted){
      var opts = thisObj.data('sUserAutocompleteOpts');
      var recipts = thisObj.data('sUserAutocompleteRecipients');

      $(document).trigger('sUserAutocomplete_beforeuseradd', [data, recipts]);
      $("#"+opts.helper_id).hide();

      var uid = String(data.u);
      var userlist_parent = thisObj.parents('.sUserAutocompleteMain');
      if($.inArray(uid, recipts)==-1) {
        var userlink = $("<span></span>").attr({'id':'user'+uid}).addClass(opts.userlink_class);
        if(typeof data.userlink_class != 'undefined'){
          userlink.addClass(data.userlink_class);
        }
        var removeuserlink = $("<span></span>").addClass("name-wrapper-remove").attr("id","user-remove"+uid).html("X");
        var userspan = $("<span></span>").addClass("name-wrapper").html(data.n).append(removeuserlink);
        userlink.append(userspan);

        removeuserlink.bind('click', removeUser);

        $('div.sUserAutocompleteInputParent',userlist_parent).before(userlink);
        recipts.push(uid);
        recalculateInputWidth(userlist_parent);
        $(document).trigger('sUserAutocomplete_onuseradd',[userlink,uid,recipts]);
      }

      thisObj.data('sUserAutocompleteRecipients',recipts);
      if( opts.max_users > 0 && recipts.length == opts.max_users ) thisObj.blur().hide();

      thisObj.val('');

      return false;
    };

    // initialize data if there are any
    (function(){
      var userlistParent = thisObj.closest('.sUserAutocompleteMain'),
          userInits = userlistParent.find('.user-init');
      userInits.each(function(){
        var data = $(this).data();
        if(typeof data.u != 'undefined'){
          addUser(data);
        }
      });
      userInits.remove();
    })();

    $(this)
      .autocomplete($(this).data('sUserAutocompleteOpts').userlist, $(this).data('sUserAutocompleteOpts').autocomplete_opts )
      .result(function(event,data,formatted){
        return addUser(data, formatted);
      });

    return $(this);
  };

  // plug-in defaults
  $.fn.sUserAutocomplete.defaults = {
    userlist: [],
    helper_id: 'sUserAutocomplete-recipient-helper',
    helper_text: 'Type the name of someone in your network',
    max_users: 1, // max number of selected users (zero for no limit)
    userlink_class: 'user',
    clear: false,
    user_unique: true, // user cannot appear more than once
    autocomplete_opts: {
      width: 310,
      minChars: 1,
      matchContains: true,
      matchSubset: false,
      mustMatch: false,
      scroll: false,
      multiple: true,
      autoFill: false,
      formatItem: function(row, i, max) {
        var parentInput = $('.'+this.sui_class);
        var opts = parentInput.data('sUserAutocompleteOpts');
        var recipts = parentInput.data('sUserAutocompleteRecipients');
        var acResults = $('div.ac_results');

        //hack for preventing an empty popup from displaying if the results only show users that have been selected previously
        if( opts.user_unique && $.inArray( row.u , recipts ) != -1 ){
          if(acResults.length > 0){
            acResults.removeClass('ac_results').addClass('ac_results_hidden');
          }
          return false;
        }
        $('div.ac_results_hidden').removeClass('ac_results_hidden').addClass('ac_results');

        var html = '<div class="ac-row"><div class="ac-picture"><img src="'+row.p+'" /></div><div class="ac-name">'+row.n+ '</div><div class="ac-school">'+row.s+'</div></div>';
        return html;
      },
      formatMatch: function(row, i, max) {
        return row.n;
      },
      formatResult: function(row) {
        return row.n;
      },
      parse: function(data){
        var parsed = [];

        if(!data)
          return parsed;

        rows = typeof data == 'string' ? eval('('+data+')') : data;

        for (var i=0; i < rows.length; i++) {
          var row = rows[i];
          parsed[parsed.length] = {
            data: row,
            value: row[0],
            result: row[0]
          };
        }

        return parsed;
      }
    }
  };
})(jQuery);