var WorldMapVisualisation = function() {
	var self = this;
	this.tabID = '#worldmap';
	
	this.MAX_LABEL_LENGTH = 35;

	this.svgSpace = d3.select('#worldmap-space-svg');
	this.gSpace = this.svgSpace.append('g');

	this.svg = d3.select('#worldmap-svg');
	this.g = this.svg.append('g');
	this.scale = 1

	this.zoom = d3.behavior.zoom()
    			.scaleExtent([1, 9])
    			.on('zoom', function() {
    				var t = d3.event.translate;
    				var s = d3.event.scale; 
    				var h = self.height/4;

    				t[0] = Math.min(
    						(self.width/self.height)  * (s - 1), 
    						Math.max( self.width * (1 - s), t[0] )
    					);

    				t[1] = Math.min(
    						h * (s - 1) + h * s, 
    						Math.max(self.height  * (1 - s) - h * s, t[1])
    					);

				  	self.zoom.translate(t);
				  	self.g.attr('transform', 'translate(' + t + ')scale(' + s + ')');

				  	if (s != self.scale) {
				  		self.scale = s;
				  		self.drawPoints();
				  	}
				});


	this.svg.call(this.zoom);
	this.svgSpace.call(d3.behavior.zoom()
    			.scaleExtent([1, 9])
    			.on('zoom', function() {
				}));

}


WorldMapVisualisation.prototype.draw = function () {
	var self = this;

	self.width = document.getElementById('worldmap').offsetWidth
	self.height = self.width / 2;

	self.svg.attr('width', self.width - 300)
  		.attr('height', '100%')

  	self.svgSpace.attr('width', 300)
  		.attr('height', '100%')

	self.projection = d3.geo.mercator()
					.translate([((self.width-300)/2), (self.height / 2)])
					.scale( (self.width-300) / 2 / Math.PI);

	self.path = d3.geo.path().projection(self.projection);
	self.countriesDrawn = false;

	d3.json('data/world-topo-min.json', function(error, world) {
		self.drawMap(topojson.feature(world, world.objects.countries).features);
	});

	self.mapping = self._createMapping();
	self.buckets = self._createBuckets();
	self.spaceBuckets = self._createSpaceBuckets();
};

WorldMapVisualisation.prototype.drawMap = function (topo) {
	var self = this;

	d3.select('#pie-chart-wrapper').style('display', 'none');
	self.svg.style('background-color', '#A1B8E5');

	if (!self.countriesDrawn) {
		self.g.selectAll('.country').remove();


		self.g.selectAll('.country').data(topo).enter().insert('path')
			.attr('class', 'country')
			.attr('d', self.path)
			.attr('id', function(d,i) { return d.id; })
			.attr('title', function(d,i) { return d.properties.name; })
			.attr('stroke-width', 0.5 / self.scale)
			.attr('stroke', '#A1B8E5')
			.style('fill', function(d, i) { return '#FFFFFF' /* d.properties.color; */ });

		self.countriesDrawn = true;
	}

	self.drawPoints();
}

WorldMapVisualisation.prototype.drawPoints = function() {
	var self = this;

	d3.selectAll('.gpoint').remove();

	for (var location in self.buckets) {
		if (self.buckets.hasOwnProperty(location)) {
			self.drawPoint(location, self.buckets[location]);
		}
	}

	self.drawSpaceTelescopes(self.spaceBuckets);
}

WorldMapVisualisation.prototype.drawPoint = function(name, bucket) {
	var self = this;

	var lon = bucket.coords.lon;
	var lat = bucket.coords.lat;
	var size = bucket.values.length;

	var gpoint = self.g.append('g').attr('class', 'gpoint');
	var x = self.projection([lon,lat])[0];
	var y = self.projection([lon,lat])[1];

	var tooltip = d3.select('#tooltip');

	if (size === 0)
		return;

	gpoint.append('svg:circle')
		.attr('cx', x)
		.attr('cy', y)
		.attr('class', 'point')
		.attr('r', 2*Math.sqrt(size) / Math.sqrt(self.scale) )
		.attr('fill', '#B80004')
		.attr('stroke', '#B80004')
		.attr('stroke-width', 2 / self.scale)
		.attr('fill-opacity', 0.3)
		.on('mouseover', function() {
			d3.select(this).attr('stroke', '#348D61').attr('fill', '#348D61');
			tooltip.transition()
				.duration(200)
				.style('opacity', .95)
			tooltip.html('<b>' + name + '</b><br/>')
				tooltip.style('left', (d3.event.pageX + 10) + 'px')
				.style('top', (d3.event.pageY + 10) + 'px');
		})
		.on('mouseout', function() {
			d3.select(this).attr('stroke', '#B80004').attr('fill', '#B80004');

			tooltip.transition()
				.duration(500)
				.style('opacity', 0);
		})
		.on('click', function() {
			self.drawPieCharts(name, bucket);
		});
}

WorldMapVisualisation.prototype.drawSpaceTelescopes = function(telescopes) {
	var self = this;

	self.gSpace.append('g').attr('class', 'gpoint').append('svg:text')
				.attr('x', 150)
				.attr('y', 30)
				.style('text-anchor', 'middle')
				.text('Space Telescopes')
				.attr('font-family', 'sans-serif')
                .attr('font-size', '20px')
                .attr('fill', 'white');

	var height = self.svgSpace[0][0].scrollHeight / 3.5;
	height = (height == 0) ? ((self.svgSpace[0]['parentNode'].scrollHeight - 230) / 3.5) : height;
	var offset = 50;
	var i = 0

	for (var name in telescopes) {
		if (telescopes.hasOwnProperty(name)) {
			var telescope = telescopes[name];
			(function(name, telescope, height) {
				var size = telescope.length;

				var gpoint = self.gSpace.append('g').attr('class', 'gpoint');
				if (size == 0)
					return;

				gpoint.append('svg:circle')
				.attr('cx', 150)
				.attr('cy', height * i + height/2 + offset)
				.attr('class', 'point')
				.attr('r', 2*Math.sqrt(size/(300 / height)) )
				.attr('fill', '#B80004')
				.attr('stroke', '#B80004')
				.attr('stroke-width', 2)
				.attr('fill-opacity', 0.3)
				.on('mouseover', function() {
					d3.select(this).attr('stroke', '#348D61').attr('fill', '#348D61');
				})
				.on('mouseout', function() {
					d3.select(this).attr('stroke', '#B80004').attr('fill', '#B80004');
				})
				.on('click', function() {
					var bucket = {coords: {}, values: telescope}
					self.drawPieCharts(name, bucket);
				});

				gpoint.append('svg:text')
				.attr('x', 150)
				.attr('y', height * i + height/2 + offset)
				.attr('dy', 25 + 2*Math.sqrt(size/(300 / height)))
				.style('text-anchor', 'middle')
				.text(name)
				.attr('font-family', 'sans-serif')
                .attr('font-size', '12px')
                .attr('fill', 'white');
			})(name, telescope, height);
			i++;
		}
	}
}

WorldMapVisualisation.prototype._createBuckets = function() {
	var self = this;

	var locations = self._unique(dataHandler.locations.map(function(entry) {
		return entry.name
	}));

	var buckets = {};

	locations.forEach(function(name) {
		buckets[name] = {
			coords: self._findCoordinates(name),
			values: []
		}
	});

	dataHandler.selectedData.forEach(function(entry) {
		if (entry.pl_facility in self.mapping) {
			buckets[self.mapping[entry.pl_facility]].values.push(entry);
		}
	});

	return buckets;
}

WorldMapVisualisation.prototype._createSpaceBuckets = function() {
	var buckets = {
		'Kepler' : [],
		'CoRoT' : [],
		'Hubble Space Telescope': []
	};

	dataHandler.selectedData.forEach(function(entry) {
		if (entry.pl_facility in buckets) {
			buckets[entry.pl_facility].push(entry);
		}
	});

	return buckets;
}

WorldMapVisualisation.prototype._unique = function(array) {
    var seen = {};
    return array.filter(function(item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
}

WorldMapVisualisation.prototype._findCoordinates = function(name) {
	for (var i = 0; i < dataHandler.locations.length; i++) {
		if (dataHandler.locations[i].name.indexOf(name) !== -1) {
			return {
				lat: dataHandler.locations[i].lat, 
				lon: dataHandler.locations[i].lon
			};
		}
	}

	return null;
}

WorldMapVisualisation.prototype._createMapping = function() {
	var mapping = {};

	dataHandler.locations.forEach(function(location) {
		mapping[location.disc_location] = location.name;
	});

	return mapping;
}


WorldMapVisualisation.prototype._findTelescopes = function(bucket) {
	return bucket.values.map(function(entry) {
		return entry.pl_telescope;
	});
}

WorldMapVisualisation.prototype._findDiscoveryMethods = function(bucket) {
	return bucket.values.map(function(entry) {
		return entry.pl_discmethod;
	});
}

WorldMapVisualisation.prototype.drawPieChartTelescopes = function(name, bucket) {
	var self = this;

	d3.select('#pie-chart-body').append('div').attr('id', 'detail-pie-chart-telescopes');
	$('#detail-pie-chart-telescopes').width(self.svg.attr('width')/2-50);

    var telescopes = self._findTelescopes(bucket);
    var truncatedTelescopes = [];
    telescopes.forEach(function(entry) {
        if (entry.length > self.MAX_LABEL_LENGTH) {
            truncatedTelescopes.push(entry.substring(0, self.MAX_LABEL_LENGTH - 3) + '...');
        } else {
            truncatedTelescopes.push(entry);
        }
    });

	var telescopeGroups = d3.nest()
					.key(function(d) { return d; })
					.rollup(function(v) { return v.length; })
					.entries(truncatedTelescopes)
					.map(function(entry) {
						return [entry.key, entry.values]
					});

	var chartTelescopes = c3.generate({
		bindto: '#detail-pie-chart-telescopes',
		size: {
			height: 200
		},
		legend: {
			position: 'right'
		},
		data: {
			type: 'pie',
			columns: telescopeGroups
		},
		pie: {
			label: {
				format: function(value, ratio, id) {
					return value;
				}
			}
		}
	});

}

WorldMapVisualisation.prototype.drawPieChartDiscMethods = function(name, bucket) {
	var self = this;

	d3.select('#pie-chart-body').append('div').attr('id', 'detail-pie-chart-discovery');
	$('#detail-pie-chart-discovery').width(self.svg.attr('width')/2-50);
	
    var discMethods = self._findDiscoveryMethods(bucket);
	var discMethodGroups = d3.nest()
					.key(function(d) { return d; })
					.rollup(function(v) { return v.length; })
					.entries(discMethods)
					.map(function(entry) {
						return [entry.key, entry.values]
					});

	var methods = dataHandler.discoveryMethodsColorMap.domain()
	var colors = dataHandler.discoveryMethodsColorMap.range()
	var colormap = {}
	methods.forEach(function(method, index) {
		colormap[method] = colors[index];
	});

	var chartDisc = c3.generate({
		bindto: '#detail-pie-chart-discovery',
		size: {
			height: 200
		},
		legend: {
			position: 'right'
		},
		data: {
			type: 'pie',
			columns: discMethodGroups,
			colors: colormap
		},
		pie: {
			label: {
				format: function(value, ratio, id) {
					return value;
				}
			}
		}
	});

}

WorldMapVisualisation.prototype.drawPieCharts = function(name, bucket) {
	var self = this;

	d3.select('#detail-pie-chart').remove();
	d3.select('#pie-chart-wrapper').style('display', 'block');
	d3.select('#pie-chart-wrapper').style('width', self.svg.attr('width')-50);
	d3.select('#pie-chart-close').on('click', function() {
		d3.select('#pie-chart-wrapper').style('display', 'none');
	});
	d3.select('#pie-chart-title span').text(name);

	self.drawPieChartTelescopes(name, bucket);
	self.drawPieChartDiscMethods(name, bucket);
}
