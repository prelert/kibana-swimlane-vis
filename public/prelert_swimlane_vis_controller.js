/*
 ****************************************************************************
 *                                                                          *
 * Copyright 2016 Prelert Ltd                                          *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 *                                                                          *
 ****************************************************************************
 */

var _ = require('lodash');
var $ = require('jquery'); 
var moment = require('moment');
var numeral = require('numeral');
var flot = require("imports?$=jquery!./lib/bower_components/flot/jquery.flot");
require("imports?$=jquery!./lib/bower_components/flot/jquery.flot.selection");
require("imports?$=jquery!./lib/bower_components/flot/jquery.flot.time");
require("imports?$=jquery,this=>window!./lib/bower_components/flot/jquery.flot.resize");
require('ui/courier');
require('ui/timefilter');
require('ui/directives/inequality');

var module = require('ui/modules').get('prelert_swimlane_vis/prelert_swimlane_vis', ['kibana']);

module.controller('PrelertSwimlaneVisController', function($scope, courier) {    

  $scope.$watch('esResponse', function (resp) {

    if (!resp) {
      $scope._previousHoverPoint = null;
      return;
    }

    if (resp.hits.total !== 0) {
      // Remove ng-hide from the parent div as that has display:none,
      // resulting in the flot chart labels falling inside the chart area on first render.
      var ngHideContainer = $("prl-swimlane-vis").closest( ".ng-hide" );
      ngHideContainer.removeClass("ng-hide"); 
    }

    // Process the aggregations in the ES response.
    $scope.processAggregations(resp.aggregations);

    syncViewControls();

    // Tell the swimlane directive to render.    
    $scope.$emit('render');

  });

  $scope.processAggregations = function(aggregations) {

    var dataByViewBy = {};

    if (aggregations && 
        ($scope.vis.aggs.bySchemaName['metric'] !== undefined) &&
        ($scope.vis.aggs.bySchemaName['timeSplit'] !== undefined) ) {
      // Retrieve the visualization aggregations.
      var metricsAgg = $scope.vis.aggs.bySchemaName['metric'][0];
      var timeAgg = $scope.vis.aggs.bySchemaName['timeSplit'][0];
      var timeAggId = timeAgg.id;
      
      if ($scope.vis.aggs.bySchemaName['viewBy'] !== undefined) {
        // Get the buckets of the viewBy aggregation.
        var viewByAgg = $scope.vis.aggs.bySchemaName['viewBy'][0];
        var buckets = aggregations[viewByAgg.id].buckets;         
        _.each(buckets, function(bucket){
          // There will be 1 bucket for each 'view by' value.
          var viewByValue = bucket.key;
          var timesForViewBy = {};
          dataByViewBy[viewByValue] = timesForViewBy;

          var bucketsForViewByValue = bucket[timeAggId].buckets;
          _.each(bucketsForViewByValue, function(valueBucket) {
            // time is the 'valueBucket' key.
            timesForViewBy[valueBucket.key] = {
                value: metricsAgg.getValue(valueBucket)
            };
          });
        });
      } else {
        // No 'View by' selected - compile data for a single swimlane
        // showing the time bucketed metric value.
        var timesForViewBy = {};
        var buckets = aggregations[timeAggId].buckets;         
        _.each(buckets, function(bucket){
          timesForViewBy[bucket.key] = { value: metricsAgg.getValue(bucket) };
        });
        
        // Use the metric label as the swimlane label.
        dataByViewBy[metricsAgg.makeLabel()] = timesForViewBy;
      }

    }

    $scope.metricsData = dataByViewBy;

  };

  function syncViewControls() {
    // Synchronize the Interval control to match the aggregation run in the view,
    // e.g. if being edited via the Kibana Visualization tab sidebar.
    if ($scope.vis.aggs.length === 0 || $scope.vis.aggs.bySchemaName['timeSplit'] === undefined) {
      return;
    }

    // Retrieve the visualization aggregations.
    var timeAgg = $scope.vis.aggs.bySchemaName['timeSplit'][0];

    // Update the scope 'interval' field.
    var aggInterval = _.get(timeAgg, ['params', 'interval', 'val']);
    if (aggInterval === 'custom') {
      aggInterval = _.get(timeAgg, ['params', 'customInterval']);
    } 

    var scopeInterval = $scope.vis.params.interval.val;
    if (scopeInterval && scopeInterval === 'custom') {
      scopeInterval = $scope.vis.params.interval.customInterval;
    }

    var setToInterval = _.findWhere($scope.vis.type.params.intervalOptions, {val: aggInterval});
    if (!setToInterval) {
      setToInterval = _.findWhere($scope.vis.type.params.intervalOptions, {customInterval: aggInterval});
    }
    if (!setToInterval) {
      // e.g. if running inside the Kibana Visualization tab will need to add an extra option in.
      setToInterval = {};

      if (_.get(timeAgg, ['params', 'interval', 'val']) !== 'custom') {
        setToInterval.val = _.get(timeAgg, ['params', 'interval', 'val']);
        setToInterval.display = "Custom: " + _.get(timeAgg, ['params', 'interval', 'val']);
      } else {
        setToInterval.val = "custom";
        setToInterval.customInterval = _.get(timeAgg, ['params', 'customInterval']);
        setToInterval.display = "Custom: " + _.get(timeAgg, ['params', 'customInterval']);
      } 

      $scope.vis.type.params.intervalOptions.push(setToInterval);
    }


    // Set the flags which indicate if the interval has been scaled.
    // e.g. if requesting points at 5 min interval would result in too many buckets being returned.
    var timeBucketsInterval = timeAgg.buckets.getInterval();
    setToInterval.scaled = timeBucketsInterval.scaled;
    setToInterval.scale = timeBucketsInterval.scale;
    setToInterval.description = timeBucketsInterval.description;

    $scope.vis.params.interval = setToInterval;        
  }

  $scope.updateViewState = function() {
    // Set up the visualization in response to a change in the Interval control.
    setupVisualization()
    .then(function () {
      // Re-run the dashboard search.
      return courier.fetch();
    })
    .catch(function(error) {
      console.log("Error updating swimlane visualization with new view state.", error);
    });
  };

  function setupVisualization() {
    // Set the params of the time aggregation to the selected 'interval' field.
    if ($scope.vis) {             
      // Set the aggregation interval of the 'timeSplit' aggregation.
      var visState = $scope.vis.getState();
      var timeAgg = _.find(visState.aggs, { 'schema': 'timeSplit' });
      timeAgg.params.interval = $scope.vis.params.interval.val;
      if ($scope.vis.params.interval.val === 'custom') {
        timeAgg.params.customInterval = $scope.vis.params.interval.customInterval;
      }

      $scope.vis.setState(visState);

      // Update the time interval of the 'editable vis'
      // i.e. if visualization is being viewed in the Kibana Visualize view,
      // we need to update the configurations for the aggregations in the editor sidebar.
      var editableVis = $scope.vis.getEditableVis();
      if (editableVis) {
        var editableVisState = editableVis.getState();  
        var editableTimeAgg = _.find(editableVisState.aggs, { 'schema': 'timeSplit' });
        editableTimeAgg.params.interval = $scope.vis.params.interval.val;
        if ($scope.vis.params.interval.val === 'custom') {
          editableTimeAgg.params.customInterval = $scope.vis.params.interval.customInterval;
        }

        editableVis.setState(editableVisState);
      } 

      return Promise.resolve($scope.vis);
    }

  }

})
.directive('prlSwimlaneVis', function($compile, timefilter) {

  function link(scope, element, attrs) {

    scope._previousHoverPoint = null;
    scope._influencerHoverScope = null;

    scope.$on('render',function(event, d){
      if (scope.vis.aggs.length !== 0 && scope.vis.aggs.bySchemaName['timeSplit'] !== undefined) {
        renderSwimlane();
      }
    });

    function renderSwimlane() {

      var chartData = scope.metricsData || [];
      var allSeries = [];

      // Create a series for each severity color band, 
      // plus an 'unknown' series for scores less than the 'low' threshold.
      var colorBands = ['#e6e6e6', '#d2e9f7', '#8bc8fb', '#ffdd00', '#ff7e00', '#fe5050'];
      var seriesLabels = ['unknown','low','warning','minor','major','critical'];
      _.each(colorBands, function(color, i){
        var series = {};
        series.label = seriesLabels[i];
        series.color = color;
        series.points = { fillColor: color, show: true, radius: 5, symbol: drawChartSymbol,  lineWidth: 1 };
        series.data = [];
        series.shadowSize = 0;
        allSeries.push(series);
      });  

      // Sort the lane labels in reverse so that the order is a-z from the top.
      chartData = sortChartDataByLaneLabel(chartData);
      var laneIds = _.keys(chartData);

      var laneIndex = 0;
      _.each(chartData, function(bucketsForViewByValue, viewByValue) {

        laneIndex = laneIds.indexOf(viewByValue);

        _.each(bucketsForViewByValue, function(dataForTime, time) {
          var value = dataForTime.value;
          
          var pointData = new Array();
          pointData[0] = moment(Number(time));
          pointData[1] = laneIndex + 0.5;
          // Store the score in an additional object property for each point.
          pointData[2] = {score: value};

          var seriesIndex = getSeriesIndex(value);
          allSeries[seriesIndex].data.push(pointData);

        }); 
      });

      // Extract the bounds of the time filter so we can set the x-axis min and max.
      // If no min/max supplied, Flot will automatically set them according to the data values.
      var bounds = timefilter.getActiveBounds();
      var earliest = null;
      var latest = null;
      if (bounds) {
        var timeAgg = scope.vis.aggs.bySchemaName['timeSplit'][0];
        var aggInterval = timeAgg.buckets.getInterval();

        // Elasticsearch aggregation returns points at start of bucket,
        // so set the x-axis min to the start of the aggregation interval.
        earliest = moment(bounds.min).startOf(aggInterval.description).valueOf();
        latest = moment(bounds.max).valueOf();
      }          

      var options = {
          xaxis: {
            mode: "time",
            timeformat: "%d %b %H:%M",
            tickFormatter: function(v, axis) {
              // Only show time if tick spacing is less than a day.
              var tickGap = (axis.max - axis.min)/10000;  // Approx 10 ticks, convert to sec.
              if (tickGap < 86400) {
                return moment(v).format('MMM D HH:mm');
              } else {
                return moment(v).format('MMM D YYYY');
              }   
            },
            min: _.isUndefined(earliest) ? null : earliest,
                max: _.isUndefined(latest) ? null : latest,
                    color: '#d5d5d5'
          },
          yaxis: {
            min: 0,
            color: null,
            tickColor: null,
            tickLength: 0,
          },
          grid: {
            backgroundColor: null,
            borderWidth: 1,
            hoverable: true,
            clickable: false,
            borderColor: '#cccccc',
            color: null,
          },
          legend : {
            show: false
          },
          selection: {
            mode: "x",
            color: '#bbbbbb'
          }
      };

      options.yaxis.max = laneIds.length;
      options.yaxis.ticks = [];
      options.grid.markings = [];

      var yaxisMarking;
      _.each(laneIds, function(labelId, i){
        var labelText = labelId;

        // Crop 'viewBy' labels over 27 chars of more so that the y-axis labels don't take up too much width.
        var labelText = (labelText.length < 28 ? labelText : labelText.substring(0, 25) + "...");
        var tick = [i+0.5, labelText];
        options.yaxis.ticks.push(tick);

        // Set up marking effects for each lane.
        if (i > 0) {
          yaxisMarking = {};
          yaxisMarking.from = i;
          yaxisMarking.to = i+0.03;
          var marking = {yaxis: yaxisMarking, color: "#d5d5d5"};
          options.grid.markings.push(marking);
        }

        if (i % 2 != 0) {
          yaxisMarking = {};
          yaxisMarking.from = i+0.03;
          yaxisMarking.to = i+1;
          var marking = {yaxis: yaxisMarking, color: "#f5f5f5"};
          options.grid.markings.push(marking); 
        }
      });

      // Adjust height of element according to the number of lanes, allow for height of axis labels.
      // Uses hardcoded height for each lane of 32px, with the chart symbols having a height of 28px.
      element.height((laneIds.length * 32) + 50);

      // Draw the plot.
      var plot = $.plot(element, allSeries, options); 

      // Add tooltips to the y-axis labels to display the full 'viewBy' field
      // - useful for cases where a long text value has been cropped.
      // NB. requires z-index set in CSS so that hover is picked up on label.
      var yAxisLabelDivs = $('.flot-y-axis', angular.element(element)).find('.flot-tick-label');
      _.each(laneIds, function(labelId, i) {
        var labelText = labelId;    
        $(yAxisLabelDivs[i]).attr('title', labelText);
      });

      // Show tooltips on point hover.
      element.unbind("plothover");
      element.bind("plothover", function (event, pos, item) {
        if (item) {
          element.addClass('prl-swimlane-vis-point-over ');
          if (scope._previousHoverPoint != item.dataIndex) {
            scope._previousHoverPoint = item.dataIndex;
            $(".prl-swimlane-vis-tooltip").remove();
            if (scope._influencerHoverScope) {
              scope._influencerHoverScope.$destroy();
            }

            var laneIndex = item.series.data[item.dataIndex][1] - 0.5;
            var laneLabel = laneIds[laneIndex]; 
            showTooltip(item, laneLabel);
          }
        } else {
          element.removeClass('prl-swimlane-vis-point-over ');
          $(".prl-swimlane-vis-tooltip").remove();
          scope._previousHoverPoint = null;
          if (scope._influencerHoverScope) {
            scope._influencerHoverScope.$destroy();
          }
        }
      });

      // Set the Kibana timefilter if the user selects a range on the chart.
      element.unbind("plotselected");
      element.bind("plotselected", function (event, ranges) {
        var zoomFrom = ranges.xaxis.from;
        var zoomTo = ranges.xaxis.to;

        // Aggregation returns points at start of bucket, so make sure the time
        // range zoomed in to covers the full aggregation interval.
        var timeAgg = scope.vis.aggs.bySchemaName['timeSplit'][0];
        var aggIntervalMs = timeAgg.buckets.getInterval().asMilliseconds();

        // Add a bit of extra padding before start time.
        zoomFrom = zoomFrom - (aggIntervalMs/4);
        zoomTo = zoomTo+aggIntervalMs;

        timefilter.time.from = moment.utc(zoomFrom);
        timefilter.time.to = moment.utc(zoomTo);
        timefilter.time.mode = 'absolute';
      });

    }
    
    function getSeriesIndex(value) {
      // Maps value to the index of the series used for values in that range.
      // Uses the five colour bands configured in the visualization options,
      // plus an 'unknown' series for scores less than the 'low' threshold.
      if (value < scope.vis.params.lowThreshold) {
        return 0; // 'Unknown' for numbers less than low threshold.
      }
      if (value < scope.vis.params.warningThreshold) {
        return 1;
      }
      if (value < scope.vis.params.minorThreshold) {
        return 2;
      }
      if (value < scope.vis.params.majorThreshold) {
        return 3;
      }
      if (value < scope.vis.params.criticalThreshold) {
        return 4;
      }
      if (value >= scope.vis.params.criticalThreshold) {
        return 5;
      } 
    }
    
    function sortChartDataByLaneLabel(list) {
      // Sorts chart data according to lane label.
      var keys = _.sortBy(_.keys(list), function (key) {
        return key;
      });
      
      // Reverse so that the order is a-z from the top.
      keys = keys.reverse();

      return _.object(keys, _.map(keys, function (key) {
        return list[key];
      }));
    }

    function drawChartSymbol(ctx, x, y, radius, shadow) {
      var size = radius * Math.sqrt(Math.PI) / 2;
      ctx.rect(x - size, y - 14, size + size, 28);
    }

    function showTooltip(item, laneLabel) {
      var pointTime = item.datapoint[0];
      var dataModel = item.series.data[item.dataIndex][2];
      var score = parseInt(dataModel.score);
      var metricsAgg = scope.vis.aggs.bySchemaName['metric'][0];
      var metricLabel = metricsAgg.makeLabel();
      var displayScore = numeral(dataModel.score).format(scope.vis.params.tooltipNumberFormat);

      // Display date using same format as used in Kibana visualizations.
      var formattedDate = moment(pointTime).format('MMMM Do YYYY, HH:mm');
      var contents = formattedDate + "<br/><hr/>";

      contents += (metricLabel + ": " + displayScore);

      var x = item.pageX;
      var y = item.pageY;
      var offset = 5;
      $("<div class='prl-swimlane-vis-tooltip'>" + contents + "</div>").css({
        "position": "absolute",
        "display": "none",
        "top": y + offset,
        "left": x + offset
      }).appendTo("body").fadeIn(200);

      // Position the tooltip.
      var $win = $(window);
      var winHeight = $win.height();
      var yOffset = window.pageYOffset;
      var width = $(".prl-swimlane-vis-tooltip").outerWidth(true);
      var height = $(".prl-swimlane-vis-tooltip").outerHeight(true);

      $(".prl-swimlane-vis-tooltip").css('left', x + offset + width > $win.width() ? x - offset - width : x + offset);
      $(".prl-swimlane-vis-tooltip").css('top', y + height < winHeight + yOffset ? y : y -height);

    }
  }

  return {
    link: link
  };
});