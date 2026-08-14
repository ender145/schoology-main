'use strict';

angular.module('sCommon', ['sCommon.directives']);


/**
 * Directives
 */
angular.module('sCommon.directives', []).
directive('sTipsy', [function() {
   return {
    restrict: 'A',
    link : function(scope, element, attrs){
      $(element).tipsy({gravity: 's'});
    }  
  };
}]);