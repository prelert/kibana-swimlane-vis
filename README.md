# Swimlane visualization for Kibana

A swimlane visualization for Kibana 4.

The visualization displays the behavior of a metric value over time across a field from the results.
Each lane displays a different value of the selected field, with the relative size of the metric
for that field over each time indicated by the color of the symbol at that time.

![image](resources/screenshot.png)

An example use case is shown below, where the swimlane is displaying data from a flight comparison website.
The average response time for each airline is plotted in a separate lane, with response times shown depending
on magnitude, with blue used for the shortest response times, then yellow, orange, and red for the longest
response times:

![image](resources/visualization.png)

## Compatibility

This plugin has been tested with Kibana versions 4.3, 4.4 and 4.5.

## Installation

### Automatic

```
bin/kibana plugin -i prelert_swimlane_vis -u https://github.com/prelert/kibana-swimlane-vis/archive/v0.1.0.zip
```

## Options

The options tab allows you to configure the color band thresholds and the format of the value shown
in the tooltip when hovering over a marker in the swimlane.

![image](resources/options.png)

### Color band thresholds

The swimlane uses five different colors to indicate the value of the metric over a time interval, from
light blue for the smallest values, through to red for the largest values. By default, the thresholds are
set for a 0 to 100 range of values, with the ranges set to:

| Range            | Color         |
| -----------------|---------------|
| 0 <= value < 3   | light blue    |
| 3 <= value < 25  | blue          |
| 25 <= value < 50 | yellow        |
| 50 <= value < 75 | orange        |
| 75 <= value      | red           |


### Tooltip formatting


## Issues
Please file issues [here](https://github.com/prelert/kibana-swimlane-vis/issues).




