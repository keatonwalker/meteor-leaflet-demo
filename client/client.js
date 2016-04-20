function toRad(n) {
    return n * Math.PI / 180;
};
function toDeg(n) {
    return n * 180 / Math.PI;
};
function destVincenty(lat1, lon1, brng, dist) {
    //https://gist.github.com/mathiasbynens/354587
    var a = 6378137,
        b = 6356752.3142,
        f = 1 / 298.257223563, // WGS-84 ellipsiod
        s = dist,
        alpha1 = toRad(brng),
        sinAlpha1 = Math.sin(alpha1),
        cosAlpha1 = Math.cos(alpha1),
        tanU1 = (1 - f) * Math.tan(toRad(lat1)),
        cosU1 = 1 / Math.sqrt((1 + tanU1 * tanU1)), sinU1 = tanU1 * cosU1,
        sigma1 = Math.atan2(tanU1, cosAlpha1),
        sinAlpha = cosU1 * sinAlpha1,
        cosSqAlpha = 1 - sinAlpha * sinAlpha,
        uSq = cosSqAlpha * (a * a - b * b) / (b * b),
        A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq))),
        B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq))),
        sigma = s / (b * A),
        sigmaP = 2 * Math.PI;
    while (Math.abs(sigma - sigmaP) > 1e-12) {
        var cos2SigmaM = Math.cos(2 * sigma1 + sigma),
            sinSigma = Math.sin(sigma),
            cosSigma = Math.cos(sigma),
            deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) - B / 6 * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));
        sigmaP = sigma;
        sigma = s / (b * A) + deltaSigma;
    };
    var tmp = sinU1 * sinSigma - cosU1 * cosSigma * cosAlpha1,
        lat2 = Math.atan2(sinU1 * cosSigma + cosU1 * sinSigma * cosAlpha1, (1 - f) * Math.sqrt(sinAlpha * sinAlpha + tmp * tmp)),
        lambda = Math.atan2(sinSigma * sinAlpha1, cosU1 * cosSigma - sinU1 * sinSigma * cosAlpha1),
        C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha)),
        L = lambda - (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM))),
        revAz = Math.atan2(sinAlpha, -tmp); // final bearing
    return [lon1 + toDeg(L), toDeg(lat2)];
};

createCircleSector = function(lat, long, beamWidth, azimuth, range){

    var startAngle = (azimuth + (360 - (beamWidth / 2.0))) % 360
    var radiusPoints = [[long, lat]]
    //Create a point every 1 degree around the arc
    for (i = 0; i <= beamWidth; i++){
        var angle = (startAngle + i) % 360
        var radPoint = destVincenty(lat, long, angle, range)
        radiusPoints.push(radPoint)
    };
    radiusPoints.push([long, lat]);
    return radiusPoints;
};


// on startup run resizing event
Meteor.startup(function() {
  $(window).resize(function() {
    $('#map').css('height', window.innerHeight - 82 - 45);
  });
  $(window).resize(); // trigger resize event 
});
 
// create marker collection
var Markers = new Meteor.Collection('markers');

Meteor.subscribe('markers');

Template.map.rendered = function() {
  L.Icon.Default.imagePath = 'packages/bevanhunt_leaflet/images';

  map = L.map('map', {
    doubleClickZoom: false
  }).setView([40.778614, -111.887902], 13);

  L.tileLayer.provider('Thunderforest.Outdoors').addTo(map);

  map.on('dblclick', function(event) {
    Markers.insert({latlng: event.latlng});
  });

  var query = Markers.find();
  query.observe({
    added: function (document) {
      var marker = L.marker(document.latlng).addTo(map)
        .on('click', function(event) {
          map.removeLayer(marker);
          Markers.remove({_id: document._id});
        });
    },
    removed: function (oldDocument) {
      layers = map._layers;
      var key, val;
      for (key in layers) {
        val = layers[key];
        if (val._latlng) {
          if (val._latlng.lat === oldDocument.latlng.lat && val._latlng.lng === oldDocument.latlng.lng) {
            map.removeLayer(val);
          }
        }
      }
    }
  });
};

Template.map.events({
  'submit .edit-schedule-item': function(event){
    event.preventDefault();
      var latLongEntry = $(event.target);
      var lat = latLongEntry.find('[class=latitude]').val();
      var long = latLongEntry.find('[class=longitude]').val();
      var beamWidth = latLongEntry.find('[class=beam-width]').val();
      var azimuth = latLongEntry.find('[class=azimuth]').val();
      var range = latLongEntry.find('[class=range]').val();
    //console.log(lat);
    //  console.log(long);
    //  console.log(createCircleSector(parseFloat(lat), parseFloat(long), 10, 90, 500));
      var circleSector = createCircleSector(parseFloat(lat), parseFloat(long),
                                            parseFloat(beamWidth), parseFloat(azimuth), parseFloat(range));
      map.setView([lat, long], 13);
      var geojsonFeature = {
          "type": "Feature",
          "properties": {
              "name": "State Office",
              "amenity": "office",
              "popupContent": "Here it is"
          },
          "geometry": {
              "type": "Polygon",
              "coordinates": [circleSector]
          }
      };
      L.geoJson(geojsonFeature).addTo(map);
  }
});
