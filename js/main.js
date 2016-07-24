var twoDec = d3.format(".2f");
var commas = d3.format(",");

$('#stats').hide();

function size(){
  var windowH = $(window).height();
  $("#map-container").height(windowH);
  $("#infoWrapper").height(windowH);
}
size();
$(window).resize(size);


// create basic leaflet map
// ========================
// tile layer for base map
var hotUrl = 'http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  hotAttribution = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, Tiles from <a href="http://hot.openstreetmap.org/" target="_blank">H.O.T.</a>',
  hotLayer = L.tileLayer(hotUrl, {attribution: hotAttribution});
// initialize map w options
var map = L.map('map', {
  layers: [hotLayer],
  center: new L.LatLng(0,0),
  zoom: 2,
  minZoom: 2
});

// ADD CONTROL FOR ZOOM TO EXTENT
var extentControl = L.Control.extend({
  options: {
    position: 'topleft',
		title: 'Full extent',
    content: '<span class="glyphicon glyphicon-resize-full"></span>'
  },
  onAdd: function (map) {
    var className = 'leaflet-control-zoom-extent', content, container;
    container = map.zoomControl._container;
    content = this.options.content;
    this._createButton(this.options.title, className, content, container, this);
    return container;
  },
  _createButton: function (title, className, content, container, context) {
    this.link = L.DomUtil.create('a', className, container);
    this.link.href = '#';
    this.link.title = title;
    this.link.innerHTML = content;
    return this.link;
  }
});
map.addControl(new extentControl());

function mapToBounds() {
    map.fitBounds(mapBounds);
}
$('.leaflet-control-zoom-extent').click(function(){
  mapToBounds();
})

var drawnItems = new L.FeatureGroup();


// initialize the SVG layer for D3 drawn survey points
map._initPathRoot()

// pick up the SVG from the map object
var svg = d3.select("#map").select("svg");
map.addLayer(drawnItems);
var pointsGroup = svg.append('g').attr("id", "points");

var fc, mappedPts, mapBounds;

function getSurveyData() {
  d3.csv("data/survey-data2.csv", function(surveyData){

    function reformat(array) {
      var data = [];
      array.map(function (d, i) {
        data.push({
          id: i,
          type: "Feature",
          geometry: {
            coordinates: [+d.x, +d.y],
            type: "Point"
          },
          properties: {
            age: +d.age,
            number: +d.number
          }
        });
      });
      return data;
    }
    fc = { type: "FeatureCollection", features: reformat(surveyData) };

    // add a circle to the svg markers group for each survey point
    mappedPts = pointsGroup.selectAll("circle")
      .data(fc.features)
      .enter().append("circle").attr("r", 3)
      .attr('class','pt');
    // when map view changes adjust the locations of the svg circles
    function update(){
      mappedPts.attr("cx",function(d) { return map.latLngToLayerPoint([d.geometry.coordinates[1], d.geometry.coordinates[0]]).x});
      mappedPts.attr("cy",function(d) { return map.latLngToLayerPoint([d.geometry.coordinates[1], d.geometry.coordinates[0]]).y});
    }
    map.on("viewreset", update);
    update();
    var d3Bounds = d3.geoBounds(fc) // [[left, bottom], [right, top]]
    mapBounds = [
      [d3Bounds[0][1],d3Bounds[0][0]], // southWest
      [d3Bounds[1][1],d3Bounds[1][0]]  // northEast
    ];
    mapToBounds();
  });
}



var shapeOptions = {
  clickable: false,
  color: '#7a0177',
  fill: false
};

// set options
var options = {
    draw: {
        polyline: false,
        circle: false,
        marker: false,
        polygon: {
            allowIntersection: false, // Restricts shapes to simple polygons
            shapeOptions: shapeOptions
        },
        rectangle: {
            shapeOptions: shapeOptions
        }
    },
    edit: {
        featureGroup: drawnItems, //REQUIRED!!
        remove: false,
        edit: false

    }
};
// add draw control to map w options
var drawControl = new L.Control.Draw(options);
map.addControl(drawControl);

map.on('draw:created', function (e) {
    var type = e.layerType,
        layer = e.layer;
    // console.log(type)
    // console.log(layer)
    // clear previous polygon
    drawnItems.clearLayers();
    // add new polygon to map
    drawnItems.addLayer(layer);
    findInside(layer.toGeoJSON());
    map.fitBounds(L.geoJson(layer.toGeoJSON()).getBounds());

});

function findInside(polygon){
  var enveloped = [];
  $.each(fc.features, function(index, point){
    var inside = turf.inside(point, polygon);
    if(inside){
      enveloped.push({ 'id': point.id, 'age': point.properties.age, 'number': point.properties.number })
    }
  });
  var ids = enveloped.map(function(d){ return d['id']; })
  mappedPts.classed("inside", false);
  mappedPts.filter(function(d){ return ($.inArray(d.id, ids) !== -1) }).classed("inside", true);
  // console.log(enveloped.length)

   ages = enveloped.map(function(d){ return d['age']; });
   numbers = enveloped.map(function(d){ return d['number']; });

  if(ages.length === 0) {
    console.log('zerooooo')
    $('#emptymessage').show();
    $('#stats').hide();
  } else {
    console.log('wat')
    $('#emptymessage').hide();
    $('#stats').show();

    $('#totalpoints').html(commas(ages.length));
    $('#agemin').html(ss.min(ages));
    $('#agemax').html(ss.max(ages));
    $('#agemean').html(twoDec(ss.mean(ages)));
    $('#agemedian').html(ss.median(ages));
    $('#agestandarddeviation').html(twoDec(ss.standardDeviation(ages)));
    $('#agetotal').html(d3.sum(numbers));
    $('#numbermin').html(ss.min(numbers));
    $('#numbermax').html(ss.max(numbers));
    $('#numbermean').html(twoDec(ss.mean(numbers)));
    $('#numbermedian').html(ss.median(numbers));
    $('#numberstandarddeviation').html(twoDec(ss.standardDeviation(numbers)));
  }

};



getSurveyData();
