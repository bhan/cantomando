'use strict';

/* Directives */
var directives = angular.module('directives', []);

function stackedbargraphfunc(scope, element, $compile) {
  var generated = false;
  scope.render = function(data, char2sound, displayInfo) {
    if (!data || !char2sound || !displayInfo || generated) return;

    // sort by matching sounds in descending order
    data.sort(function compare(a, b) {
      return b['chars'].length - a['chars'].length
    });

    var table = d3.select(element[0]).append('table').attr('class', 'inner');
    var rows = table.selectAll('tr')
      .data(data).enter()
      .append('tr');
    rows.append('th').attr('class', 'inner')
      .text(function(d) { return d['sound']+':'; })
    ;
    var mandolabel = displayInfo['mando']['shortname'] + ': ';
    var cantolabel = displayInfo['canto']['shortname'] + ': ';
    rows.append('td').attr('class', 'inner')
      .selectAll('span')
      .data(function(d) { return d['chars']; })
      .enter()
        .append('span').attr('class', 'inner')
        .attr('ng-click', function(d) { return 'tooltip()'; })
        .text(function(d) { return d; })
        .attr('title', function(d) {
          return mandolabel + char2sound[d]['mando'].join(' ') + '\n'
               + cantolabel + char2sound[d]['canto'].join(' ');
        })
        .call(function() {
          $compile(this[0].parentNode)(scope);
        })
    ;
    //$("span.inner").tooltip({ content: "Awesome" });

    generated = true;
  }
  scope.$watch('data', function() {
    scope.render(scope.data, scope.char2sound, scope.displayInfo);
  }, true);
}
directives.directive('cmStackedBarGraph', ['$compile',
  function ($compile) {
    return {
      restrict: 'E',
      scope: {
        displayInfo: '=',
        data: '=',
        char2sound: '='
      },
      link: function(scope, element, attrs) {
        return stackedbargraphfunc(scope, element, $compile);
      }
    };
  }
]);
