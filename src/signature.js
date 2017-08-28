/*
 * https://github.com/legalthings/signature-pad-angular
 * Copyright (c) 2015 ; Licensed MIT
 */

angular.module('signature', []);

angular.module('smartApp').directive('signaturePad', ['$interval', '$timeout', '$window',
  function ($interval, $timeout, $window) {
    'use strict';

    var EMPTY_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA'+
    'jgAAADcCAQAAADXNhPAAAACIklEQVR42u3UIQEAAAzDsM+/6UsYG0okFDQHMBIJAMMBDAfAcADDATAcwHAAwwEwH'+
    'MBwAAwHMBzAcAAMBzAcAMMBDAcwHADDAQwHwHAAwwEMB8BwAMMBMBzAcADDATAcwHAADAcwHADDAQwHMBwAwwEMB'+
    '8BwAMMBDAfAcADDATAcwHAAwwEwHMBwAAwHMBzAcAAMBzAcAMMBDAcwHADDAQwHwHAAwwEwHMBwAMMBMBzAcAAMB'+
    'zAcwHAADAcwHADDAQwHMBwAwwEMB8BwAMMBDAfAcADDATAcwHAAwwEwHMBwAAwHMBzAcCQADAcwHADDAQwHwHAAw'+
    'wEMB8BwAMMBMBzAcADDATAcwHAADAcwHMBwAAwHMBwAwwEMBzAcAMMBDAfAcADDAQwHwHAAwwEwHMBwAAwHMBzAc'+
    'AAMBzAcAMMBDAcwHADDAQwHwHAAwwEMB8BwAMMBMBzAcADDATAcwHAADAcwHMBwAAwHMBwAwwEMB8BwAMMBDAfAc'+
    'ADDATAcwHAAwwEwHMBwAAwHMBzAcAAMBzAcAMMBDAcwHADDAQwHwHAAwwEMB8BwAMMBMBzAcADDkQAwHMBwAAwHM'+
    'BwAwwEMBzAcAMMBDAfAcADDAQwHwHAAwwEwHMBwAMMBMBzAcAAMBzAcwHAADAcwHADDAQwHMBwAwwEMB8BwAMMBM'+
    'BzAcADDATAcwHAADAcwHMBwAAwHMBwAwwEMBzAcAMMBDAegeayZAN3dLgwnAAAAAElFTkSuQmCC';

    return {
      restrict: 'EA',
      replace: true,
      template: '<div class="signature" style="width: 100%; max-width:{{width}}px; height: 100%;'+
      ' max-height:{{height}}px;"><canvas style="display: block; margin: 0 auto;"'+
      'ng-mouseup="onMouseup()" ng-mouseleave="onMouseup()"></canvas></div>',
      scope: {
        accept: '=?',
        clear: '=?',
        disabled: '=?',
        dataurl: '=?',
        height: '@',
        width: '@',
        fieldForm: '=',
        fieldId: '=',
        notifyDrawing: '&onDrawing',
        displayOnly: '='
      },
      controller: [
        '$scope',
        function ($scope) {

          $scope.accept = function () {
            return {
              isEmpty: $scope.dataurl === EMPTY_IMAGE,
              dataUrl: $scope.dataurl
            };
          };

          $scope.dataurl = $scope.fieldForm[$scope.fieldId];
          $scope.dataUrl = $scope.dataurl;

          $scope.onMouseup = function () {
            $scope.updateModel();
            $scope.notifyDrawing({ drawing: false });
          };

          $scope.updateModel = function () {
            $timeout(function(){
              $scope.dataurl = $scope.signaturePad.isEmpty() ? EMPTY_IMAGE : $scope.signaturePad.toDataURL();
              $scope.fieldForm[$scope.fieldId] = $scope.dataurl;
            });
          };

          $scope.clear = function () {
            delete $scope.fieldForm[$scope.fieldId];
            $scope.signaturePad.clear();
            $scope.dataurl = EMPTY_IMAGE;
          };

          $scope.$watch('dataurl', function (dataUrl) {
            if (!dataUrl || $scope.signaturePad.toDataURL() === dataUrl) {
              return;
            }

            $scope.setDataUrl(dataUrl);
          });
        }
      ],
      link: function (scope, element) {
        scope.width = $('.signatureWrapper').width()-26;

        var canvas = element.find('canvas')[0];
        var parent = canvas.parentElement;
        var scale = 0;
        var ctx = canvas.getContext('2d');

        var width = parseInt(scope.width-26, 10);
        var height = parseInt(scope.height, 10);

        canvas.width = width;
        canvas.height = height;

        scope.signaturePad = new SignaturePad(canvas);// jshint ignore:line

        scope.setDataUrl = function(dataUrl) {
          var ratio = Math.max(window.devicePixelRatio || 1, 1);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(ratio, ratio);

          scope.signaturePad.clear();
          scope.signaturePad.fromDataURL(dataUrl);

          $timeout(function() {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(1 / scale, 1 / scale);
          });
        };

        scope.$watch('disabled', function (val) {
          if(val){
            scope.signaturePad.off();
          }else{
            scope.signaturePad.on();
          }
        });

        var calculateScale = function() {
          var newScale = Math.min(parent.clientWidth / width, 1);

          if (newScale === scale) {
            return;
          }

          var newWidth = width * newScale;
          //var newHeight = height * newScale;
          //canvas.style.height = Math.round(newHeight) + 'px';
          canvas.style.width = Math.round(newWidth) + 'px';

          scale = newScale;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(1 / scale, 1/ scale);
        };

        var resizeIH = $interval(calculateScale, 200);

        scope.$on('$destroy', function () {
          $interval.cancel(resizeIH);
          resizeIH = null;
        });

        angular.element($window).bind('resize', calculateScale);
        scope.$on('$destroy', function () {
          angular.element($window).unbind('resize', calculateScale);
        });

        calculateScale();

        element.on('touchstart', onTouchstart);
        element.on('touchend', onTouchend);

        function onTouchstart(event) {
          event.preventDefault();
        }

        function onTouchend(event) {
          scope.$apply(function () {
            // updateModel
            scope.updateModel();

            // notify that drawing has ended
          });
          event.preventDefault();
        }
      }
    };
  }
]);

// Backward compatibility
angular.module('ngSignaturePad', ['signature']);
