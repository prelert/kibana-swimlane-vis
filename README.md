# Swimlane visualization for Kibana

A swimlane visualization for Kibana, with builds available for both Kibana 4 and Kibana 5.

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

Different releases of the plugin are available to work with either Kibana 4 or Kibana 5.

The distribution for Kibana 4 has been tested with Kibana versions:
* 4.3
* 4.4
* 4.5
* 4.6

and the distribution for Kibana 5 has been built for versions:
* 5.0.0
* 5.0.1
* 5.0.2
* 5.1.1
* 5.1.2
* 5.2.2
* 5.3.0
* 5.3.1
* 5.3.2
* 5.4.0
* 5.4.1
* 5.4.2
* 5.4.3

## Installation

### Kibana 4.x:

Linux or OS X:

```
bin/kibana plugin -i prelert_swimlane_vis -u https://github.com/prelert/kibana-swimlane-vis/archive/v0.1.0.tar.gz
```

Windows:

```
bin/kibana plugin -i prelert_swimlane_vis -u https://github.com/prelert/kibana-swimlane-vis/archive/v0.1.0.zip
```

### Kibana 5.0.0:

```
bin/kibana-plugin install https://github.com/prelert/kibana-swimlane-vis/releases/download/v5.0.0/prelert_swimlane_vis-5.0.0.zip
```

### Kibana 5.0.1:

```
bin/kibana-plugin install https://github.com/prelert/kibana-swimlane-vis/releases/download/v5.0.1/prelert_swimlane_vis-5.0.1.zip
```

### Kibana 5.0.2:

```
bin/kibana-plugin install https://github.com/prelert/kibana-swimlane-vis/releases/download/v5.0.2/prelert_swimlane_vis-5.0.2.zip
```

### Kibana 5.1.1:

```
bin/kibana-plugin install https://github.com/prelert/kibana-swimlane-vis/releases/download/v5.1.1/prelert_swimlane_vis-5.1.1.zip
```

### Kibana 5.1.2:

```
bin/kibana-plugin install https://github.com/prelert/kibana-swimlane-vis/releases/download/v5.1.2/prelert_swimlane_vis-5.1.2.zip
```

### Kibana 5.2.2:

```
bin/kibana-plugin install https://github.com/prelert/kibana-swimlane-vis/releases/download/v5.2.2/prelert_swimlane_vis-5.2.2.zip
```

### Kibana 5.3.0:

```
bin/kibana-plugin install https://github.com/prelert/kibana-swimlane-vis/releases/download/v5.3.0/prelert_swimlane_vis-5.3.0.zip
```

### Kibana 5.3.1:

```
bin/kibana-plugin install https://github.com/prelert/kibana-swimlane-vis/releases/download/v5.3.1/prelert_swimlane_vis-5.3.1.zip
```

### Kibana 5.3.2:

```
bin/kibana-plugin install https://github.com/prelert/kibana-swimlane-vis/releases/download/v5.3.2/prelert_swimlane_vis-5.3.2.zip
```

### Kibana 5.4.0:

```
bin/kibana-plugin install https://github.com/prelert/kibana-swimlane-vis/releases/download/v5.4.0/prelert_swimlane_vis-5.4.0.zip
```

### Kibana 5.4.1:

```
bin/kibana-plugin install https://github.com/prelert/kibana-swimlane-vis/releases/download/v5.4.1/prelert_swimlane_vis-5.4.1.zip
```

### Kibana 5.4.2:

```
bin/kibana-plugin install https://github.com/prelert/kibana-swimlane-vis/releases/download/v5.4.2/prelert_swimlane_vis-5.4.2.zip
```

### Kibana 5.4.3:

```
bin/kibana-plugin install https://github.com/prelert/kibana-swimlane-vis/releases/download/v5.4.3/prelert_swimlane_vis-5.4.3.zip
```

## Uninstall

### Kibana 5.x:

```
bin/kibana-plugin remove prelert_swimlane_vis
```

## Usage

The first step in creating the visualization is to configure the metric that will be displayed.
Select the Elasticsearch aggregation to be used - count, average, sum, min and max are currently available.
If using average, sum, min or max, select the numeric field that will be aggregated. From Kibana 4.5, a
custom label can also be entered if desired, which will be displayed against the value in tooltips. In our
example we are plotting maximum response time, with the numeric value stored in the `actual` field of the results:

![image](resources/step1.png)

The next step is to configure the field by which you want the results to be split to form the swimlanes using
an Elasticsearch terms aggregation. Select the field for the *View by* bucket aggregation, which will typically be
one of the *string* type fields in your results. Use the *Size* dropdown to select the maximum number of swimlanes
that will be displayed. In our example, we will be viewing results by `airline`, showing the top 15 airlines by
maximum response time:

![image](resources/step2.png)

Note if no *View by* buckets are configured, a single swimlane will be displayed showing the behavior of the
selected metric over all results.

The final step is to select the time field in your results. The time frame for the intervals in the swimlane
visualization can be specified in terms of seconds, minutes, hours, days, weeks, months, or years, or just
leave it to the *Auto* setting of Kibana which will aim to pick the optimum interval depending on the time
span of the query. An *interval* dropdown control is also available at the top of the swimlane for use when
the visualization has been saved and added to a dashboard.

![image](resources/step3.png)

## Options

The Options tab allows you to configure the color band thresholds, the format of the value shown in the tooltip
when hovering over a band in the swimlane, whether to display the legend showing the lower threshold values
for each of the color bands, and whether to sort the lanes alphabetically. Alternative colors for the swimlane
cells can be chosen here by using the provided colorpickers or by entering hexidecimal color values.

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

To alter the numeric ranges for any of the bands, use the *Band thresholds* section of the Options tab to
enter the desired value, noting that the values entered define the *lower* threshold for each band. For example,
in the screenshot above, the thresholds have been adjusted to suit the range of response times from the flight
comparison website data, with values of 3000 or more displayed in red.

It is not yet possible to alter the number of color bands.

By default a legend will be displayed above the swimlane showing the configured lower band threshold values
for each of the colors. This legend can be hidden by deselecting the *Show threshold legend* checkbox in the
Options tab.

### Tooltip formatting

By default, the value shown in the tooltip when hovering over a band in the swimlane is shown to one decimal
place. To alter the format of the tooltip to suit values in your data set, enter the desired format in the
*Tooltip formatting* section of the Options tab. Refer to the [Numeral.js](http://numeraljs.com/) documentation
for the range of accepted formats, with that being the library used to format the value in the tooltip.

The date and time shown in the tooltip is displayed in the format that Kibana uses for displaying pretty-formatted
dates. This `dateFormat` option can be configured in the *Advanced Settings* page under the Kibana Management
application.

### Lane sorting

By default the lanes will be displayed in the order returned by the configured *View by* bucket aggregation. To
perform a secondary alphabetical sort to the lane order, select *Ascending* or *Descending* as desired from the
*Order lanes alphabetically* dropdown control.


## Issues
Please file issues [here](https://github.com/prelert/kibana-swimlane-vis/issues).


## About Us

Prelert is the leading provider of behavioral analytics for IT security, IT operations, and business operations teams. Our solution analyzes log data, finds anomalies, links them together and lets the data tell the story behind advanced security threats, IT performance problems, and business disruptions.

Leveraging machine learning anomaly detection and other behavioral analytics capabilities, the solution automates the analysis of massive data sets, eliminating manual effort and human error. Hundreds of progressive IT organizations rely on Prelert to detect advanced threat activity, reduce false positive alerts and enable faster root cause analysis. Prelert lets your data tell the story.
