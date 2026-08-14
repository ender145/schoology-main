(function($) {
  $(document).ready(function() {
    // Get the Assignments homepage setting flag from Drupal.settings (injected by backend)
    const HOME_ASSIGNMENTS_SETTING_FLAG = Drupal.settings.s_user.home_assignments_setting_flag;
    var homepagePreferenceChanged = false;
    var homepagePreference = null;
    var initialHomepagePreference = null;

    // Store initial homepage preference on page load
    var $homepageViewRadios = $('input[name="homepage_view"]');
    if ($homepageViewRadios.length) {
      initialHomepagePreference = parseInt($homepageViewRadios.filter(':checked').val(), 10);

      // Track when homepage preference changes
      $homepageViewRadios.change(function() {
        homepagePreferenceChanged = true;
        homepagePreference = parseInt($(this).val(), 10);
      });
    }

    /* Trigger the event when the save button is clicked
       Fire event ONLY when user changes TO Assignments (was not Assignments before)
     */
    $('[id^=edit-submit]').click(function() {
      // Guard clause: Return early if Gainsight not available
      if (!window._gainsightInitialized || !window.aptrinsic) {
        return;
      }

      // Track Assignments Tab Default event when user changes TO Assignments (was not Assignments before)
      if (homepagePreferenceChanged && 
          homepagePreference === HOME_ASSIGNMENTS_SETTING_FLAG && 
          initialHomepagePreference !== HOME_ASSIGNMENTS_SETTING_FLAG) {
        window.aptrinsic('track', 'Assignments_Tab_Default', {
          enableAssignmentTab: true
        });
      }
    });
  });
})(jQuery);

