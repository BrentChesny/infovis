var EarthVisualisation = function() {
	var self = this
	this.tabID = '#earth';

	// On default scale, half the height will represent DEFAULT_SCALE_DISTANCE pc.
	this.DEFAULT_SCALE = 2.5;
	this.DEFAULT_SCALE_DISTANCE = 10000;

	this.DEFAULT_PLANET_SCALE = 0.3;

	this.svg = d3.select('#earth-svg');
	this.earth = this.svg.select('.earth');

	this.zoom = d3.behavior.zoom()
		.scaleExtent([0.1, 10000])
		.scale(this.DEFAULT_SCALE)
		.on('zoom', function() {
			self._setPlanetScaledPositions();
		});
	this.svg.call(this.zoom);

	this.planetZoom = d3.behavior.zoom()
		.scaleExtent([0.1, 10])
		.scale(this.DEFAULT_PLANET_SCALE)
		.on('zoom', function() {
			self._setPlanetScales();
		});

	this._createSliders();

	this._createScaleIndications();

	this.discoveryMethodsSelection = {};
	dataHandler.onDataLoaded(function() {self._createLegend()});


	this.svg.on('click', function() {
		dataHandler.toggleHighlightedPlanet(null);
	});
}

EarthVisualisation.prototype.draw = function () {
	var self = this;
	var tooltip = d3.select('#tooltip');
	var center = this._getSvgCenter();
	var size = this._getSvgSize();

	this.earth.attr('cx', center.x)
		.attr('cy', center.y);

	var selectedPlanets = dataHandler.selectedData.filter(function(element) {
		return self.discoveryMethodsSelection[element['pl_discmethod']];
	});

	this._calcDiscoveryMethodDistribution(selectedPlanets);

	var planets = this.svg.select('g.planets').selectAll('circle.planet').data(selectedPlanets);
	planets.exit().remove();
	planets.enter().append('circle')
		.on('mouseover', function(d) {
			tooltip.transition()
				.duration(200)
				.style('opacity', .95)
			tooltip.html('<b>' + d['pl_name'] + '</b><br/>' +
					'Radius: ' + ((d['pl_rade'] == '')? '?' : d['pl_rade'] + ' Earth radii') + '<br/>' +
					'Distance from Earth: ' + ((d['st_dist'] == '')? '?' : d3.format('.0f')(d['st_dist']) + ' pc') + '<br/>'
				)
				.style('left', (d3.event.pageX + 10) + 'px')
				.style('top', (d3.event.pageY + 10) + 'px');
			}
		)
		.on('mouseout', function(d) {
			tooltip.transition()
				.duration(500)
				.style('opacity', 0);
			}
		)
		.on('click', function(d) {
			dataHandler.toggleHighlightedPlanet(d);
			d3.event.stopPropagation();
		})
		;
	planets.classed('planet', true)
		.attr('cx', center.x)
		.attr('fill', 'black')
		.attr('opacity', function(d) {
			if(dataHandler.highlightedPlanet == null)
			 	return '0.5';
			if(dataHandler.highlightedPlanet['rowid'] == d['rowid'])
				return '1.0';
			else
				return '0.2';
		})
		.attr('stroke', 'black')
		.attr('stroke-width', function(d) {
			if(dataHandler.highlightedPlanet != null && dataHandler.highlightedPlanet['rowid'] == d['rowid'])
				return 1;
			else
				return 0;
		})
		.attr('r', 1);

	this.scaleIndications
		.attr('cx', center.x)
		.attr('cy', center.y);

	this.scaleIndicationLabels
		.attr('x', center.x);

	this.planetScaleIndications
		.attr('transform', function(d) {return 'translate(0, ' + (size.height -  d.bottomOffset) + ')'});

	this._setPlanetScaledPositions();
	this._setPlanetScales();
	this._setPlanetRotations();
	this._setPlanetColors();
	this._createPieChart();
};

EarthVisualisation.prototype.rescale = function (scale) {
	this.zoom.scale(scale);
	// Trigger zoom event listeners
	this.zoom.event(this.svg);
};

EarthVisualisation.prototype.rescalePlanets = function (scale) {
	this.planetZoom.scale(scale);
	// Trigger zoom event listeners
	this.planetZoom.event(this.svg);
};

EarthVisualisation.prototype._setPlanetColors = function () {
	this.svg.selectAll('circle.planet')
		.attr('fill', function(d) {return dataHandler.discoveryMethodsColorMap(d['pl_discmethod'])});
};

EarthVisualisation.prototype._setPlanetRotations = function () {
	var self = this;

	var center = this._getSvgCenter();
	var disablePieChart = $('#earth-planet-pie-checkbox').prop('checked');

	this.svg.selectAll('circle.planet')
		.attr('transform', function(d) {
			var discMethod = d['pl_discmethod'];
			var randomRotation = (+d['rowid']*443 % 360)/360.0;
			var rotation = self.discoveryMethodAngle[discMethod] * randomRotation + self.cumulativeDiscoveryMethodAngle[discMethod];
			if (disablePieChart)
				rotation = randomRotation * 360;
			return 'rotate(' + rotation + ',' + center.x + ',' + center.y + ')';
		});
};

EarthVisualisation.prototype._setPlanetScaledPositions = function () {
	$('#earth-distance-slider').slider('value', this.distanceSliderScaler(this.zoom.scale()));
	var centerY = this._getSvgCenter().y;
	var maxY = centerY - 10;
	var scaler = d3.scale.linear()
		.domain([0, this.DEFAULT_SCALE_DISTANCE / this.zoom.scale()])
		.range([0,maxY]);
	this.svg.selectAll('circle.planet')
		.attr('cy', function(d) {return centerY - scaler(+d['st_dist'])})
		.attr('style', function (d) {return (d['st_dist'] == '')? 'visibility:hidden' : ''});
	this.scaleIndications
		.attr('opacity', function(d) {return (scaler(d) < 20)? 0 : 1})
		.attr('r', function(d) {return scaler(d)});
	this.scaleIndicationLabels
		.text(function(d) {return (scaler(d) < 20)? '': Math.round(d) + ' pc'})
		.attr('y', function(d) {return centerY - scaler(d)});
};

EarthVisualisation.prototype._setPlanetScales = function () {
	var size = this._getSvgSize();

	$('#earth-planet-slider').slider('value', this.planetSliderScaler(this.planetZoom.scale()));
	var scale = this.planetZoom.scale();
	var usePlanetScale = $('#earth-planet-scale-checkbox').prop('checked');
	this.earth.attr('r', scale);
	this.svg.selectAll('circle.planet')
		.attr('r', function(d) {
			var radius = 10;
			if (usePlanetScale)
				radius = +d['pl_rade'];
			return  radius * scale;
		});

	this.planetScaleIndications
		.attr('style', function(d) { // Used to hide planet scales when too small/large
			if (!usePlanetScale || d.radius * scale < 0.1 || d.radius * scale > 200)
				return 'visibility:hidden';
			else
				return 'visibility:visible';
		})
		.attr('transform', function(d) {
			var y = d.bottomOffset * scale;
			if (y < d.minBottomOffset)
				y = d.minBottomOffset;
			return 'translate(0, ' + (size.height -  y) + ')'
		});

	this.planetScaleIndications.selectAll('circle')
		.attr('r', function(d) {return d.radius * scale});

	this.planetScaleIndications.selectAll('text')
		.attr('x', function(d) {return 60 + d.radius * scale})
};

EarthVisualisation.prototype._getSvgSize = function () {
	var width = $('#earth-svg').outerWidth();
	var height = $('#earth-svg').outerHeight();
	return {width: width, height: height};
};

EarthVisualisation.prototype._getSvgCenter = function () {
	var size = this._getSvgSize();
	return {x: size.width/2, y: size.height/2};
};

EarthVisualisation.prototype._createSliders = function () {
	var self = this;
	this.distanceSliderScaler = d3.scale.log()
		.domain([0.1, 10000])
		.range([0, 1]);

	$('#earth-distance-slider').slider({
		min: 0,
		step: 0.001,
		max: 1
	});
	$('#earth-distance-slider').on('slide', function(event, ui) {
		self.rescale(self.distanceSliderScaler.invert(ui.value));
	});

	this.planetSliderScaler = d3.scale.log()
		.domain([0.1, 10])
		.range([0, 1]);

	$('#earth-planet-slider').slider({
		min: 0,
		step: 0.001,
		max: 1
	});

	$('#earth-planet-slider').on('slide', function(event, ui) {
		self.rescalePlanets(self.planetSliderScaler.invert(ui.value));
	});

	$('#earth-planet-scale-checkbox').change(function() {
		self._setPlanetScales();
	})

	$('#earth-planet-pie-checkbox').change(function() {
		self.draw();
	})
};

EarthVisualisation.prototype._createLegend = function () {
	var self = this;

	dataHandler.discoveryMethods.forEach(function(element) {
		self.discoveryMethodsSelection[element] = true;
	});

	var legendItems = d3.select('#earth-legend').selectAll('div')
		.data(dataHandler.discoveryMethods)
		.enter().append('div');
	legendItems.classed('earth-legend-item', true);
	legendItems.append('span')
		.classed('earth-legend-color-block', true)
		.style('border-color', function(d) {return dataHandler.discoveryMethodsColorMap(d)})
		.style('background-color', function(d) {
			if (self.discoveryMethodsSelection[d])
				return dataHandler.discoveryMethodsColorMap(d);
			else
				return 'white';
	}).on('click', function(d) {
		self.discoveryMethodsSelection[d] = !self.discoveryMethodsSelection[d];
		d3.select('#earth-legend').selectAll('.earth-legend-color-block')
			.style('background-color', function(d) {
				if (self.discoveryMethodsSelection[d])
					return dataHandler.discoveryMethodsColorMap(d);
				else
					return 'white';
		});
		self.draw();
	});
	legendItems.append('span')
		.text(function(d) {return d;});
};

EarthVisualisation.prototype._calcDiscoveryMethodDistribution = function (planets) {
	var self = this;

	var counts = {};
	dataHandler.discoveryMethods.forEach(function(discMethod) {counts[discMethod] = 0;});
	planets.forEach(function(planet) {
		var discMethod = planet['pl_discmethod']
		counts[discMethod] += 1;
	});

	var total = 0;
	for(var key in counts) {
		total += counts[key];
	}

	this.discoveryMethodAngle = {};
	this.cumulativeDiscoveryMethodAngle = {};
	var c = 0;
	dataHandler.discoveryMethods.forEach(function(discMethod) {
		var angle = counts[discMethod] / total * 360;
		self.discoveryMethodAngle[discMethod] = angle;
		self.cumulativeDiscoveryMethodAngle[discMethod] = c;
		c += angle;
	});
};

EarthVisualisation.prototype._createPieChart = function () {
	var self = this;

	var center = this._getSvgCenter();

	var arc = d3.svg.arc()
		.outerRadius(center.y - 20)
		.startAngle(function(discMethod) {return 0.0174533 * self.cumulativeDiscoveryMethodAngle[discMethod]})
		.endAngle(function(discMethod) {return 0.0174533 * (self.cumulativeDiscoveryMethodAngle[discMethod] + self.discoveryMethodAngle[discMethod])});

	// Remove old pie for easy code.
	// TODO: reuse old pie instead of deleting
	this.svg.select('#pie').remove();

	var disablePieChart = $('#earth-planet-pie-checkbox').prop('checked');
	if (disablePieChart)
		return;

	var pie = this.svg.select('g.pie-container').append('g')
		.attr('id', 'pie')
		.attr('transform', 'translate(' + center.x + ',' + center.y + ')');

	var pie = pie.selectAll('.arc').data(dataHandler.discoveryMethods);
	pie.exit().remove();
	pie.enter().append('g')
		.classed('arc', true);

	pie.append('path')
		.attr('d', arc)
		.style('fill', function(discMethod) {return dataHandler.discoveryMethodsColorMap(discMethod)})
		.style('opacity', 0.25);
};

EarthVisualisation.prototype._createScaleIndications = function () {
	var data = [1,3,10,30,100,300,1000,3000,10000]
	this.scaleIndications = this.svg.selectAll('circle.scale-indications').data(data);
	this.scaleIndications.enter().append('circle');
	this.scaleIndications.classed('scale-indications', true)
		.attr('stroke', '#AAAAAA')
		.attr('stroke-width', 1)
		.attr('opacity', 1.0)
		.attr('fill', 'none');
	this.scaleIndicationLabels = this.svg.selectAll('text.scale-indication-labels').data(data);
	this.scaleIndicationLabels.enter().append('text');
	this.scaleIndicationLabels.classed('scale-indication-labels', true)
		.text(function(d) {return Math.round(d) + ' pc'})
		.attr('fill', 'gray')
		.attr('dy', -3)
		.attr('text-anchor', 'middle');

	var planetData = [{bottomOffset: 27, minBottomOffset: 40, name: 'Earth', radius: 1}, {bottomOffset: 12, minBottomOffset: 20, name: 'Jupiter', radius: 11.209}];
	this.planetScaleIndications = this.svg.selectAll('g.planet-scale-indications').data(planetData);
	this.planetScaleIndications.enter().append('g');
	this.planetScaleIndications.append('circle')
		.attr('r', function(d) {return d.radius})
		.attr('cx', 50)
		.attr('cy', 0)
		.attr('fill', '#AAAAAA');
	this.planetScaleIndications.append('text')
		.text(function(d) {return d.name})
		.attr('x', 100)
		.attr('font-size', 18)
		.attr('dy', 7)
		.attr('fill', 'gray');
};
