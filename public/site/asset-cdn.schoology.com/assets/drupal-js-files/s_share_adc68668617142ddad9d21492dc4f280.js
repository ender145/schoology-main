Drupal.behaviors.sShare = function(context) {

  $('.s-share-checkbox-form-wrapper:not(.sShareProcessed)', context ).addClass('sShareProcessed').each(function(){
    var form = $(this);

    //display the checkboxes when the rectangular toggler is clicked
    $('.checkbox-toggler', form).click(function(){
      var toggler = $(this);
      var checkboxes = $('.checkboxes-wrapper', form);
      var is_active = toggler.hasClass('active');

      if( is_active ) {
        toggler.removeClass('active');
        checkboxes.addClass('hidden').hide();
      } else {
        toggler.addClass('active');
        checkboxes.removeClass('hidden').show();
      }

      if( !is_active ){
        $('body').bind('click.sShareToggleCheckbox', function(e){
          var target = $(e.target);
          if(!target.hasClass('s-share-checkbox-form-wrapper') && target.parents('.s-share-checkbox-form-wrapper').length == 0){
            checkboxes.addClass('hidden');
            toggler.removeClass('active');
            $('body').unbind('click.sShareToggleCheckbox');
          }
        });
      }
      else{
        $('body').unbind('click.sShareToggleCheckbox');
      }
    });
    
    $('.checkbox-toggler', form).bind('sActionsClicked', function(){
      $('.checkboxes-wrapper', form).addClass('hidden');
      $(this).removeClass('active');
      $('body').unbind('click.sShareToggleCheckbox');
    });

    $('.checkbox-share-wrapper', form).each(function(){
      var wrapper = $(this);
      var checkbox = $('input:checkbox', wrapper);
      var newWindow = false;
      var provider = $('.provider', wrapper).html();

      //if user is not connected, open the authorize page if user checks the checkbox
      if(checkbox.hasClass('invalid-token')){
        checkbox.change(function(){
          if(checkbox.is(":checked")){
            if(!newWindow || newWindow.closed){
              newWindow = window.open('/share/' + provider + '/authorize', provider + 'auth', "height=600,width=1000");
            }
            newWindow.focus();
          }
        });
      }

      //if user successfully connected, stop opening the authorize page on the checkbox's check event
      $('.auth-success', wrapper).click(function(){
        checkbox.unbind('change');
      });
    });

  });

  if( window.location.hash.match(/^#setmessage-.+/gi) ){
    sShareSuccessMessage( window.location.hash.split('-').pop() );
    window.location.hash = '';
  }

  $('#hidden-success:not(.sShareProcessed)', context ).addClass('sShareProcessed').each(function(){
    var wrapper = $(this);
    var openerBody = $(window.opener.document.body);
    var callbackState = $('#hidden-success-state', wrapper);
    var provider = $('.provider', wrapper).html();
    var isProviderForm = $('#s-user-edit-external-providers-form', openerBody).length > 0;

    //if auth was successful, trigger the event that unbinds the checkbox change event in the opener window
    if(callbackState.val() == 1){
      $('.' + provider + '-auth-success', openerBody).click();
    }

    if(callbackState.val() != 1 || !isProviderForm){
      var destination = isProviderForm ? '#external-providers-wrapper' : false;
      sShareSuccessMessage(false, true, destination);
    }

    window.close();
  });


  $('#s-user-edit-external-providers-form:not(.sShareProcessed)' , context ).addClass('sShareProcessed').each(function(){
    var form = $(this);
    var newWindow = false; //get a reference to the auth window in case it already exist

    //for each of the connect link, open the connect page in a new window
    $('.connect-link', form).each(function(){
      var link = $(this);
      link.click(function(e){
        // remember which connect button was pressed, so if there is success we can show the right sucess message later on
        $(document).data('lastConnect',$(this).parents('.provider').eq(0).attr('class').split(' ').pop());

        newWindow = window.open(link.attr('href'), 'authwindow', "height=600,width=1000");
        newWindow.focus();
        return false;
      });
    });

    //if auth is successful, reload the page so that the disconnect buttons will display
    $('.auth-success', form).click(function(){
      var lastConnect = String($(document).data('lastConnect'));

      window.location.hash = '#setmessage-' + lastConnect;
      window.location.reload(true);
    });

  });


  $('.authorize-block-wrapper:not(.sShareProcessed)' , context ).addClass('sShareProcessed').each(function(){
    var wrapper = $(this);

    //connect to providers
    $('.connect-btn', wrapper).each(function(){
      var link = $(this);
      link.click(function(e){
        newWindow = window.open(link.attr('href'), 'authwindow', "height=600,width=1000");
        newWindow.focus();
        return false;
      });
    });

    //if successful open the connect form popup
    $('.auth-success', wrapper).each(function(){
      var connectLink = $(this);
      var parent = connectLink.parents('.provider-wrapper');
      connectLink.click(function(){
        var options = {
          href : connectLink.html(),
          extraClass : 'popups-small'
        }
        Popups.openPath(connectLink, options);
        parent.empty();
      });
    });

  });

  $('.invite-block-wrapper:not(.sShareProcessed)' , context ).addClass('sShareProcessed').each(function(){
    //bind the invite events on the buttons
    $('.invite-btn:not(.added)').each(function(){
      var button = $(this);
      var email = button.siblings('.email').html();
      //change button to gray once the person is invited
      button.bind('click', function(){
        $.ajaxSecure({
          url : '/share/invite?email=' + encodeURIComponent(email),
          dataType: 'json',
          success : function(data){
            if(data.success){
              button.html(Drupal.t('Invited'));
              button.addClass('added');
              button.unbind('click');
            }
          }
        });
      });
    });
  });

  $('#social-share-wrapper:not(.sShareProcessed)' , context ).addClass('sShareProcessed').each(function(){
    var socialShare = $('#social-share', wrapper);
    socialShare.sActionLinks({hidden: false ,wrapper: '.add-resource-action-links'});
    $('.share-link').each(function(){
      var link = $(this);
      link.click(function(e){
        var href = link.attr('href');
        var newWindow = window.open(href, 'sharewindow', 'width=1000,height=600');
        newWindow.focus();
      });
    });
  });
}

function sShareSetMessage(message, messageClass, destination){
  if(!destination){
    destination = '#main-content-wrapper';
  }
  $(destination).prepend('<div class="' + messageClass + ' messages s-share-auth-message"><div class="messages-close-btn">x</div><div class="message-container">' + message + '</div></div>');
  $('.messages-close-btn').click(function(){
    $('.s-share-auth-message').remove();
  });
}

// if there is a message set in the windowed page, append it to the parent page
var sShareSuccessMessage = function(hash_token, useOpener, destination){
  if( hash_token ) {
    var message;
    var messageClass = 'status';
    switch ( hash_token ){
      case 'twitter': message = Drupal.t('You have successfully linked your account with Twitter'); break;
      case 'google': message = Drupal.t('You have successfully linked your account with Google'); break;
      case 'fb': message = Drupal.t('You have successfully linked your account with Facebook'); break;
    }

  } else {
    // if a message is set append that message in the opener window
    var authMessage = $('.auth-message');
    var message = authMessage.html();
    var messageClass = authMessage.hasClass('error') ? 'error' : 'status';
  }

  if(message){
    if(!useOpener){
      sShareSetMessage(message, messageClass, destination);
    }
    else{
      window.opener.sShareSetMessage(message, messageClass, destination);
    }
  }
};