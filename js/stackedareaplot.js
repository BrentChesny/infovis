var StackedAreaPlot = function() {
    this.tabID = "#stacked-area-plot";
    this.chart = null;
}

StackedAreaPlot.prototype.draw = function() {
    var colors = this._colorMapping();
    var methods = this._discMethods(dataHandler.selectedData);
    var hists = this._hists(methods);
    var groups = [];
    
    hists.forEach(function(hist) {
        groups.push(hist[0]);
    });
    
    var types = {};
    var ticks = this._generateXTicks();
    
    groups.forEach(function(group) {
        types[group] = 'area';
    });
    
    //if (this.chart == null) {
        this.chart = c3.generate({
            'bindto': '#stacked-area-plot-div',
            'data': {
                'columns': hists,
                'types': types,
                'groups': [groups],
                'colors': colors
            },
            'axis': {
                'x': {
                    'type': 'category',
                    'categories': ticks
                }
            },
            'point': {
                'show': false
            },
            'grid': {
                'x': {
                    'lines': [
                        {
                            'value': '2009',
                            'text': 'Kepler Launch'
                        }
                    ]
                }
            },
            'legend': {
                'show': false
            }
        });
    // } else {
    //     this.chart.load({
    //         'columns': hists,
    //         'types': types,
    //         'groups': [groups],
    //         'categories': ticks,
    //         'unload': true
    //     });
    // }
}

StackedAreaPlot.prototype._discMethods = function(data) {
    var methods = {};
    
    data.forEach(function(entry) {
        var method = entry['pl_discmethod'];
        var year = Number(entry['pl_disc']);
        
        if (method in methods) {
            methods[method].push(year);
        } else {
            methods[method] = [year];
        }
    });
    
    return methods;
}

StackedAreaPlot.prototype._hists = function(methods) {
    var hists = [];
    var binCount = dataHandler.currentRange[1] - dataHandler.currentRange[0] + 1;

    for (var method in methods) {
        if (methods.hasOwnProperty(method)) {
            var bins = d3.layout.histogram()
                .bins(binCount)
                .range(dataHandler.currentRange)
                (methods[method]);
            
            var hist = [];
            
            bins.forEach(function(bin) {
                hist.push(bin.y);
            });

            hists.push([method].concat(hist));
        }
    }
    
    return hists;
}

StackedAreaPlot.prototype._generateXTicks = function() {
    var i = dataHandler.currentRange[0];
    var ticks = [];
    
    while (i <= dataHandler.currentRange[1]) {
        ticks.push(i.toString());
        i += 1;
    }
    
    return ticks;
}

StackedAreaPlot.prototype._colorMapping = function() {
    var methods = dataHandler.discoveryMethodsColorMap.domain()
    var colors = dataHandler.discoveryMethodsColorMap.range()
    var colormap = {}
    methods.forEach(function(method, index) {
        colormap[method] = colors[index];
    });
    return colormap;
}
