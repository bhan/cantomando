'use strict';

/* Controllers */
var controllers = angular.module('controllers', []);

controllers.controller('TableCtrl', ['$scope', '$routeParams', '$http', '$q',
  function($scope, $routeParams, $http, $q) {
    $scope.displayInfo = {
      'canto': { 'name': 'Cantonese', 'format': 'wav' },
      'korean': { 'name': 'Korean', 'format': '' },
      'mando': { 'name': 'Mandarin', 'format': 'mp3' },
      'minnan': { 'name': 'Minnan', 'format': '' },
      'viet': { 'name': 'Vietnamese', 'format': '' },
    }
    $scope.from = (!$routeParams.hasOwnProperty('from') || !($routeParams.from in $scope.displayInfo))
      ? 'mando' : $routeParams.from; // if malformed, default to mando
    $scope.to = (!$routeParams.hasOwnProperty('to') || !($routeParams.to in $scope.displayInfo))
      ? 'canto' : $routeParams.to; // if malformed, to is canto
    if ($routeParams.from === $routeParams.to) { // default to mando->canto
      $scope.from = 'mando'; $scope.to = 'canto';
    }
    $http.get('data/' + $scope.from + '/initialsFinals.json').success(function(data) {
      $scope.initials = data['initials']; $scope.finals = data['finals'];
      $scope.mouseStatus = {}; // sound->"DOWN"|"MOVED"|"UP"
      $scope.mouseIniStatus = {}; // initial->"DOWN"|"MOVED"|"UP"
      $scope.mouseFinStatus = {}; // final->"DOWN"|"MOVED"|"UP"
      $scope.showStatus = {}; // sound->true|false whether cell shown or hidden
      $scope.hovered = {}; // stores hover status for ini+fin
      for (var i = 0; i < $scope.initials.length; ++i) {
        $scope.mouseIniStatus[$scope.initials[i]] = "UP";
        for (var j = 0; j < $scope.finals.length; ++j) {
          $scope.mouseFinStatus[$scope.finals[j]] = "UP";
          var sound = $scope.initials[i] + $scope.finals[j];
          $scope.mouseStatus[sound] = "UP";
          $scope.showStatus[sound] = false;
          $scope.hovered[sound] = false;
        }
      }
    });

    var asyncReqs = {};
    asyncReqs[$scope.from] = $http.get('data/' + $scope.from + '/charSounds.json')
    asyncReqs[$scope.to] = $http.get('data/' + $scope.to + '/charSounds.json')
    $q.all(asyncReqs).then(function(reqs) {
      $scope.charSounds = {};
      $.each(reqs, function(language, req) {
        $.each(req.data, function(character, sounds) {
          if (!(character in $scope.charSounds)) { $scope.charSounds[character] = {}; }
          $scope.charSounds[character][language] = sounds;
        });
      });
      // for each character, find corresponding toneless "to" language sounds for "from" sounds
      var fromToData = {}
      var getNoTone = function (sound) {
        return /[^0-9]+/g.exec(sound)[0];
      }
      $.each(reqs[$scope.from].data, function(character, fromSounds) {
        $.each(fromSounds, function(fromIndex, fromSound) {
          var fromSoundNoTone = getNoTone(fromSound);
          if (!(fromSoundNoTone in fromToData)) { fromToData[fromSoundNoTone] = {}; }
          $.each(reqs[$scope.to].data[character] || [], function(toSoundIndex, toSound) {
            var toSoundNoTone = getNoTone(toSound);
            if (!(toSoundNoTone in fromToData[fromSoundNoTone])) {
              fromToData[fromSoundNoTone][toSoundNoTone] = [];
            }
            if (fromToData[fromSoundNoTone][toSoundNoTone].indexOf(character) === -1) {
              fromToData[fromSoundNoTone][toSoundNoTone].push(character);
            }
          });
        });
      });
      $scope.data = {}
      $.each(fromToData, function(fromSound, toSounds) {
        $scope.data[fromSound] = [];
        $.each(toSounds, function(toSound, chars) {
          $scope.data[fromSound].push({ 'sound': toSound, 'chars': chars })
        });
      });
    });

    $scope.showTooltip = function(sound, ch, labelsound) { // TODO: consider d3
      var infoId = labelsound + ch;
      if ($('#' + infoId).length > 0) return;

      var html = '<table id="' + infoId + '" width="100%">';
      html += '<tr><td><a target="_blank" href="http://wiktionary.org/wiki/' + ch + '">' + ch + '</a></td>';
      $.each($scope.displayInfo, function(language, info) {
        html += '<td>'
        $.each($scope.charSounds[ch][language] || [], function(i, languageSound) {
          html += '<span onclick="this.firstChild.play()"><audio src="data/sounds_' + language + '/' + languageSound + '.' + info.format + '"></audio>'+ languageSound +'</span> ';
        })
        html += '</td>';
      });
      html += '</tr>';
      html += '</table>';
      $('#' + labelsound + '_info').append(html);
    }

    $scope.inData = function(ini, fin) {
      return $scope.hasOwnProperty('data')
          && $scope.data.hasOwnProperty(ini+fin);
    }
    $scope.show = function(ini, fin) { // return whether to show ini+fin cell
      return $scope.showStatus[ini+fin];
    }
    $scope.mouseDown = function(ini, fin) {
      $scope.mouseStatus[ini+fin] = "DOWN";
    }
    $scope.mouseMove = function(ini, fin) {
      $scope.mouseStatus[ini+fin] = "MOVED";
    }
    $scope.mouseUp = function(ini, fin) {
      var sound = ini + fin;
      if ($scope.mouseStatus[sound] === "DOWN") {
        // toggle showStatus iff no mouseMove in between (allow highlighting)
        $scope.showStatus[sound] = !$scope.showStatus[sound];
      }
      $scope.mouseStatus[sound] = "UP";
    }
    $scope.mouseIniDown = function(ini) {
      $scope.mouseIniStatus[ini] = "DOWN";
    }
    $scope.mouseIniMove = function(ini) {
      $scope.mouseIniStatus[ini] = "MOVE";
    }
    $scope.mouseIniUp = function(ini) {
      if ($scope.mouseIniStatus[ini] === "DOWN") {
        // toggle showStatus iff no mouseMove in between (allow highlighting)
        var hidden_found = false;
        var idx = 0; // find first hidden cell
        for (var idx = 0; idx < $scope.finals.length; ++idx) {
          var sound = ini+$scope.finals[idx];
          if (!$scope.showStatus[sound]) {
            hidden_found = true; break;
          }
        }
        // if >1 hidden then show all else hide all
        if (!hidden_found) { idx = 0; }

        for ( ; idx < $scope.finals.length; ++idx) {
          var sound = ini+$scope.finals[idx];
          $scope.showStatus[sound] = hidden_found;
          $scope.mouseStatus[sound] = "UP";
          $scope.mouseFinStatus[$scope.finals[idx]] = "UP";
        }
      }
      $scope.mouseIniStatus[ini] = "UP";
    }
    $scope.mouseFinDown = function(fin) {
      $scope.mouseFinStatus[fin] = "DOWN";
    }
    $scope.mouseFinMove = function(fin) {
      $scope.mouseFinStatus[fin] = "MOVE";
    }
    $scope.mouseFinUp = function(fin) {
      if ($scope.mouseFinStatus[fin] === "DOWN") {
        // toggle showStatus iff no mouseMove in between (allow highlighting)
        var hidden_found = false;
        var idx = 0;
        for ( ; idx < $scope.initials.length; ++idx) {
          var sound = $scope.initials[idx]+fin;
          if (!$scope.showStatus[sound]) {
            hidden_found = true; break;
          }
        }
        // if hidden_found then show all else hide all
        if (!hidden_found) idx = 0;
        for ( ; idx < $scope.initials.length; ++idx) {
          var sound = $scope.initials[idx]+fin;
          $scope.showStatus[sound] = hidden_found;
          $scope.mouseStatus[sound] = "UP";
          $scope.mouseIniStatus[$scope.initials[idx]] = "UP";
        }
      }
      $scope.mouseFinStatus[fin] = "UP";
    }
    $scope.tglShowAll = function() {
      var hidden_found = false;
      var i_idx = 0;
      for ( ; i_idx < $scope.initials.length; ++i_idx) {
        for (var j_idx = 0 ; j_idx < $scope.finals.length; ++j_idx) {
          var sound = $scope.initials[i_idx]+$scope.finals[j_idx];
          if (!$scope.showStatus[sound]) {
            hidden_found = true; break;
          }
        }
        if (hidden_found) break;
      }
      // if hidden_found then show all else hide all
      if (!hidden_found) { i_idx = 0; }
      for ( ; i_idx < $scope.initials.length; ++i_idx) {
        $scope.mouseIniStatus[$scope.initials[i_idx]] = "UP";
        for (var j_idx = 0 ; j_idx < $scope.finals.length; ++j_idx) {
          var sound = $scope.initials[i_idx]+$scope.finals[j_idx];
          $scope.showStatus[sound] = hidden_found;
          $scope.mouseStatus[sound] = "UP";
        }
      }
      for (var j_idx = 0 ; j_idx < $scope.finals.length; ++j_idx) {
        $scope.mouseFinStatus[$scope.finals[j_idx]] = "UP";
      }
    }

    $scope.tglHover = function(ini, fin) { // toggle ini+fin hover status
      $scope.hovered[ini+fin] = !$scope.hovered[ini+fin];
    }
    $scope.tglIniHover = function(ini) {
      for (var i = 0; i < $scope.finals.length; ++i) {
        var sound = ini+$scope.finals[i];
        $scope.hovered[sound] = !$scope.hovered[sound];
      }
    }
    $scope.tglFinHover = function(fin) {
      for (var i = 0; i < $scope.initials.length; ++i) {
        var sound = $scope.initials[i]+fin;
        $scope.hovered[sound] = !$scope.hovered[sound];
      }
    }
  }]);
