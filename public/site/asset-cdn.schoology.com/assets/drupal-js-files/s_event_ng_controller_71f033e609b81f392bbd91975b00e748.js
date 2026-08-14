sAngular.addController('s_event_fcalendar_filter_menu', ['$scope', 'Calendar', function($scope, Calendar){
  $scope.menuopts = [];
  $scope.calendar = $('#fcalendar');
  $scope.filter_menu_form = $('#s-event-fcalendar-filter-menu-form', $scope.calendar.parent());
  $scope.default_colors = {
    'user': 'color-default-personal',
    'group': 'color-default-groups',
    'course': 'color-default-courses',
    'school': 'color-default-school'
  };
  var isLightColorEnabled = Drupal.settings.s_event.filter_menu.is_light_color_enabled;
  var NUM_DEFAULT_COLORS = 16;
  var NUM_DARK_COLORS = 10;
  var NUM_LIGHT_COLORS = 10;

  $scope.colors = {};
  $scope.initColorPicker = function(selected_color) {
    var selected_color = selected_color || '';
    // default realm colors
    var realms = ['user', 'group', 'course', 'school'];
    for(r = 0; r < realms.length; r++) {
      $scope.colors['c-defaults-' + (r+1)] = {'class': $scope.default_colors[ realms[r] ], 'selected': (selected_color == $scope.default_colors[ realms[r] ]) ? true : false};
    }
    if(!isLightColorEnabled) {
      for (i = 1; i <=NUM_DEFAULT_COLORS; i++) {
        $scope.colors['color-' + i] = {
          'class': 'color-' + i,
          'selected': (selected_color == 'color-' + i) ? true : false
        };
      }
    }
    else {
      for(i=1; i<=NUM_LIGHT_COLORS; i++) {
        var currentColor = 'color-light-' + i;
        var isSelected = (selected_color === currentColor);

        $scope.colors[currentColor] = {
          'class': currentColor,
          'selected': isSelected
        };
      }
    }
    for(i=1; i<=NUM_DARK_COLORS; i++) {
      var currentColor = 'color-dark-' + i;
      var isSelected = (selected_color === currentColor);

      $scope.colors[currentColor] = {
        'class': currentColor,
        'selected': isSelected
      };
    }
  };
  $scope.initColorPicker();
  $scope.handleKeyPress = function(event) {
    if (isEnterOrSpaceKeyEvent(event)) {
      event.preventDefault(); // Prevent page scrolling on Space press
      if (!$scope.$$phase) {
        // Only call $apply if a digest cycle is NOT already in progress
        $scope.$apply(() => $scope.showMenu(event));
      } else {
        // Use $evalAsync if a digest cycle is in progress
        $scope.$evalAsync(() => $scope.showMenu(event));
      }
    }
  };

  $scope.showMenu = function(event) {
    // Check if the dropdown menu is already open, if its open then close it
    if ($scope.show_dropdown_menu) {
      $scope.closeMenu();
      return;
    }
    $scope.show_ajax_loader = true;
    Calendar.getRealmSettings(function(settings){
      $scope.menuopts = settings;
      $scope.use_building_names = false;
      var last_building_title;
      for(i = 0; i < $scope.menuopts.length; i++) {
        menu_opt = $scope.menuopts[i];
        menu_opt.filter_selected_color = (menu_opt.filter_enabled == 1) ? menu_opt.color : '';
        if(menu_opt.realm == 'course') {
          //only use building name in listing when courses are in multiple buildings
          if (last_building_title && last_building_title != menu_opt.building_title) {
            $scope.use_building_names = true;
          }
          else {
            last_building_title = menu_opt.building_title;
          }
        }
      }
      if($scope.use_building_names == true){
        $.each($scope.menuopts ,function(idx, o){o.subtitle = o.building_title;});
      }
      $scope.show_ajax_loader = false;
      $scope.show_dropdown_menu = true;

      // Update aria-expanded attribute for the button
      const dropdownButton = document.querySelector('.fcalendar-filter-menu-header');
      if (dropdownButton) { dropdownButton.setAttribute('aria-expanded', 'true'); }

      // Attach the keydown event listener to close the menu with Escape
      document.addEventListener('keydown', $scope.handleKeyDown);
      $scope.$on('$destroy', function() { document.removeEventListener('keydown', $scope.handleKeyDown); });
      // Use setTimeout to ensure that the focus happens after the dropdown is rendered
      setTimeout(function() {
        // Select the first checkbox and focus on it
        const firstCheckbox = document.querySelector('.sEventFcalendarFilterMenuContainer .checkbox');
        if (firstCheckbox) {
          firstCheckbox.focus();
        }
      }, 0);
    });
  };

  $scope.closeMenu = function() {
     $scope.show_dropdown_menu = false;

    // Update aria-expanded attribute for the button
    const dropdownButton = document.querySelector('.fcalendar-filter-menu-header');
    if (dropdownButton) { dropdownButton.setAttribute('aria-expanded', 'false'); }

    // Remove the keydown event listener
    document.removeEventListener('keydown', $scope.handleKeyDown);

    // Return focus to the button
    dropdownButton.focus();
  };

// Handle Escape key for closing the menu
  $scope.handleKeyDown = function(event) {
    if (event.key === 'Escape') {
      $scope.closeMenu();
      $scope.$apply(); // Ensure Angular's digest cycle runs for the UI update
    }
  };

  $scope.toggleFilter = function(i, menuopt) {
    if(menuopt.filter_enabled == 1) {
      $scope.menuopts[i].filter_enabled = 0;
      $scope.menuopts[i].filter_selected_color = '';
    }
    else {
      $scope.menuopts[i].filter_enabled = 1;
      $scope.menuopts[i].filter_selected_color = $scope.menuopts[i].color;
    }
    $scope.saveSettings('filter', $scope.menuopts[i]);

    var enabled_filters = 0;
    for(n = 0; n < $scope.menuopts.length; n++) {
      if($scope.menuopts[n].filter_enabled == 1) {
        enabled_filters++;
      }
    }
    $scope.menu_title = enabled_filters > 0
      ? enabled_filters + ' ' + Utils.i18n.t('core.of') + ' ' + $scope.menuopts.length + ' ' + Utils.i18n.t('core.calendars')
      : Utils.i18n.t('core.all_calendars');
    $scope.updateCalendar('filters');
  };

  $scope.showColorPicker = function(i, menuopt, e) {
    if($scope.color_picker.selected_realm === i) {
      $scope.color_picker = {
        show: false,
        selected_realm: ''
      };
      return;
    }
    var position = $(e.target).position();
    $scope.initColorPicker(menuopt.color);
    var leftPosition = ($(e.target).parents('.fcalendar-filter-menu-wrapper').width() + 24);
    if ($(document).attr('dir') === 'rtl') {
      leftPosition = ($(e.target).parents('.fcalendar-filter-menu-wrapper').width() - 395);
    }
    $scope.color_picker = {
      show: true,
      top: (position.top - 19),
      left: leftPosition,
      selected_realm: i
    };
  };

  $scope.selectColor = function(color) {
    var k = $scope.color_picker.selected_realm;
    $scope.menuopts[k].color = color['class'];
    $scope.menuopts[k].filter_selected_color = ($scope.menuopts[k].filter_enabled == 1) ? color['class'] : '';
    $scope.saveSettings('color', $scope.menuopts[k]);
    $scope.color_picker = {
      show: false,
      selected_realm: ''
    };
    $scope.updateCalendar('colors');
  };

  $scope.updateCalendar = function(type) {
    var selected_realms = [];
    var selected_colors = {};
    for(i = 0; i < $scope.menuopts.length; i++) {
      var realm_key = $scope.menuopts[i].realm + '-' + $scope.menuopts[i].realm_id;
      if($scope.menuopts[i].filter_enabled == 1 && type == 'filters') {
        selected_realms.push(realm_key);
      }
      if($scope.menuopts[i].color != '' && type == 'colors') {
        selected_colors[realm_key] = $scope.menuopts[i].color;
      }
    }

    if(type == 'filters') {
      sFCalendarFilterMenu.selected_filter_realms = selected_realms;
    }
    else if(type == 'colors') {
      sFCalendarFilterMenu.selected_filter_colors = selected_colors;
    }

    $scope.calendar.fullCalendar('rerenderEvents');
  };

  /**
   * See: s_common_request_under_limit()
   *  We don't want to exceed the request rate limit; queue the user's save actions (ie, toggling checkboxes or selecting colors)
   */
  $scope.setTimeoutQueue = [];
  $scope.savedRealmQueue = {};

  $scope.submitSave = function() {
    for(i = 0; i < $scope.setTimeoutQueue.length; i++) {
      clearTimeout($scope.setTimeoutQueue[i]);
    }
    $scope.setTimeoutQueue = [];

    Calendar.saveRealmSettings($scope.savedRealmQueue, function(response){
      $scope.show_ajax_loader = $scope.setTimeoutQueue.length > 0 ? true : false;
    });
    $scope.savedRealmQueue = {};
  };

  $scope.saveSettings = function(save_type, realmObj) {
    $scope.show_ajax_loader = true;
    $scope.setTimeoutQueue.push( setTimeout($scope.submitSave, 3000) );

    var realm_key = realmObj.realm + '-' + realmObj.realm_id;
    $scope.savedRealmQueue[realm_key] = realmObj;
  };

}]);

sAngular.addDirective('sEventFcalendarFilterMenuContainer', [function(){
  return   {
    restrict : 'C',
    link : function(scope, element, attrs){
      $(document).bind('click.s_event_filter_menu_close', function(e){
        if($(e.target).parents('.sEventFcalendarFilterMenuContainer').length == 0) {
          scope.color_picker.show = false;
          scope.show_dropdown_menu = false;
          scope.$apply();
        }
      });

      scope.show_ajax_loader = false;
      scope.show_dropdown_menu = false;
      scope.color_picker = {show: false, top: 0, left: 0, selected_realm: ''};
      scope.$apply();
    }
  }
}]);

sAngular.addDirective('sEventFilterMenuWrapper', [function(){
  return   {
    restrict : 'C',
    link : function(scope, element, attrs){
      element.bind('scroll', function(){
        scope.color_picker.show = false;
        scope.$apply();
      });
    }
  }
}]);
