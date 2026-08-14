Drupal.theme.s_event_fcalendar_filter_menu = function(menu_title){
  var output = '';

  output += '<div class="sEventFcalendarFilterMenuContainer" ng-controller="s_event_fcalendar_filter_menu" role="button">';

  output += '&nbsp;&middot;&nbsp;<span class="clickable fcalendar-filter-menu-header" role="button" ng-click="showMenu()" tabindex="0" ng-keydown="handleKeyPress($event)">{{menu_title || "' + menu_title + '"}}';
  output += '<img src="/sites/all/themes/schoology_theme/images/expandable.gif" class="fcalendar-filter-dropdown-arrow" alt="' + Drupal.t('Calendars. Dropdown.') + '" />';
  output += '</span>';
  output += ' <img padding-left: 15px;" ng-show="show_ajax_loader" class="ajax-loader" src="/sites/all/themes/schoology_theme/images/ajax-loader.gif" alt="' + Drupal.t('Loading') + '" />';

    output += '<div ng-show="show_dropdown_menu" class="fcalendar-filter-menu-wrapper sEventFilterMenuWrapper"  ng-class="{\'use-subtitles\':use_building_names}">';
      output += '<ul>';
        output += '<li class="realm-{{menuopt.realm}}" ng-repeat="menuopt in menuopts">';
          output += '<div title="{{menuopt.title}}" class="menuopt-wrapper" ng-class="{\'has-subtitle\':menuopt.subtitle}" >';
            output += '<span role="checkbox" tabindex="0" class="checkbox" aria-checked="{{menuopt.filter_enabled == 1}}" ng-class="{\'filter-selected\': menuopt.filter_enabled == 1}" ng-click="toggleFilter($index, menuopt)"></span> ';
              output += '<div class="realm-title-wrapper" tabindex="0">';
              output += '<span class="realm-title" ng-click="toggleFilter($index, menuopt)">{{menuopt.title}}</span> ';
              output += '<span class="realm-subtitle">{{menuopt.subtitle}}</span> ';
              output += '</div>';
            output += '<span role="button" tabindex="0" class="selected-color {{menuopt.color}}" ng-click="showColorPicker($index, menuopt, $event)" tabindex="1"></span> ';
          output += '</div>';
        output += '</li>';
      output += '</ul>';
    output += '</div>';

    output += '<div class="color-codes-box" ng-show="color_picker.show" ng-style="{left: color_picker.left + \'px\', top: color_picker.top + \'px\'}">';
      output += '<span class="flag"></span>';
      output += '<div tabindex="0" role="button" class="swatches {{color.class}}" ng-repeat="color in colors" ng-class="{\'color-selected\': color.selected}" ng-click="selectColor(color)" ></div>';
    output += '</div>';
  output += '</div>';
  return output;
}