'use strict';

/* App Module */

var app = angular.module('app', [
  'ngRoute',
  'controllers',
  'directives',
]);

app.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/:from?/:to?', {
        templateUrl: 'partials/table.html',
        controller: 'TableCtrl'
      }).
      otherwise({
        redirectTo: '/mando/canto'
      });
  }]
);
