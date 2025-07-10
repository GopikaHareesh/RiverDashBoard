// script.js
const map = L.map('map').setView([54.5, -1.3], 7);
const outfallMarkers = [];  // To store all outfall marker references
const pollutionLayer = L.layerGroup().addTo(map);
const allReports = [];



L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

const pollutionColors = {
  "Foam": "orange",
  "Dead fish": "red",
  "Unusual color": "purple",
  "Sewage smell": "brown"
};

const reports = [
  {
    type: 'Foam',
    location: 'River Tees near Yarm',
    lat: 54.508,
    lng: -1.357,
    datetime: '2025-07-11T08:30'
  },
  {
    type: 'Dead fish',
    location: 'Tyne at Hexham',
    lat: 54.974,
    lng: -2.099,
    datetime: '2025-07-10T15:45'
  },
  {
    type: 'Unusual color',
    location: 'Wear near Durham',
    lat: 54.775,
    lng: -1.576,
    datetime: '2025-07-09T10:00'
  }
];


const table = document.getElementById('reportTable');
let draggableMarker = null;

function addReportToMap(report) {
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${pollutionColors[report.type]};width:14px;height:14px;border-radius:50%;border:2px solid white;"></div>`
  });

  const marker = L.marker([report.lat, report.lng], { icon }).addTo(pollutionLayer);  // add to its own layer

  marker.bindPopup(`
    <b>${report.type}</b><br>
    ${report.location}<br>
    <small>${report.datetime}</small><br>
    <button onclick="showNearbyOutfalls(${report.lat}, ${report.lng})">
      Nearby outfalls (1km)
    </button>
  `);

  allReports.push(report);  // if you want filtering later

  const row = table.insertRow();
  row.insertCell(0).textContent = report.type;
  row.insertCell(1).textContent = report.location;
  row.insertCell(2).textContent = report.lat;
  row.insertCell(3).textContent = report.lng;
  row.insertCell(4).textContent = report.datetime;
}

reports.forEach(addReportToMap);

document.getElementById('reportForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const newReport = {
  type: document.getElementById('pollutionType').value,
  location: document.getElementById('location').value,
  lat: parseFloat(document.getElementById('lat').value),
  lng: parseFloat(document.getElementById('lng').value),
  datetime: document.getElementById('datetime').value
};

  addReportToMap(newReport);
  this.reset();
});

function useMyLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);

      document.getElementById('lat').value = lat;
      document.getElementById('lng').value = lng;
      map.setView([lat, lng], 14);

      if (draggableMarker) map.removeLayer(draggableMarker);

      draggableMarker = L.marker([lat, lng], { draggable: true }).addTo(map);

      draggableMarker.on('dragend', function(e) {
        const { lat, lng } = e.target.getLatLng();
        document.getElementById('lat').value = lat.toFixed(6);
        document.getElementById('lng').value = lng.toFixed(6);
      });
    }, () => {
      alert('Unable to retrieve your location.');
    });
  } else {
    alert('Geolocation is not supported by your browser.');
  }
}

map.on('click', function(e) {
  if (!e.originalEvent.target.closest('.leaflet-interactive')) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    document.getElementById('lat').value = lat;
    document.getElementById('lng').value = lng;

    if (draggableMarker) map.removeLayer(draggableMarker);
    draggableMarker = L.marker([lat, lng], { draggable: true }).addTo(map);
    draggableMarker.on('dragend', function(e) {
      const { lat, lng } = e.target.getLatLng();
      document.getElementById('lat').value = lat.toFixed(6);
      document.getElementById('lng').value = lng.toFixed(6);
    });
  }
});


// 🗂️ Create LayerGroups for toggling
const outfallLayer = L.layerGroup();
const riverLayer = L.layerGroup();
const catchmentLayer = L.layerGroup();

// ✅ Load Outfalls into layer group
fetch("outfalls.geojson")
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      pointToLayer: function (feature, latlng) {
        const marker = L.circleMarker(latlng, {
          radius: 6,
          fillColor: "#00bcd4",
          color: "#007b8a",
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        });
        outfallMarkers.push({ marker, latlng }); // store it for later
        return marker;
      },
      onEachFeature: function (feature, layer) {
        const props = feature.properties;
        layer.bindPopup(`<b>Outfall</b><br>Node: ${props.NODE_REF}<br>Status: ${props.OP_STAT}`);
      }
    }).addTo(outfallLayer);
  });

// ✅ Load and classify catchment data
fetch("northumbria_catchment.geojson")
  .then(res => res.json())
  .then(data => {
    data.features.forEach(feature => {
      const geomType = feature.geometry.type;
      const waterType = feature.properties["water-body-type"]?.string || "Other";
      const geomCategory = feature.properties["geometry-type"] || "Other";
      const name = feature.properties.name || "Unnamed";

      // Highlight style for river selection
      const defaultRiverStyle = { color: "#0d47a1", weight: 3, dashArray: "4" };
      const highlightStyle = { color: "#1e88e5", weight: 5, dashArray: "1" };

      // 1️⃣ River lines
      if ((geomType === "LineString" || geomType === "MultiLineString") && waterType === "River") {
        L.geoJSON(feature, {
          style: defaultRiverStyle,
          onEachFeature: (f, layer) => {
            const type = f.properties["water-body-type"]?.string || "N/A";
            const id = f.properties.id || "N/A";
            const name = f.properties.name || "Unnamed River";

            layer.bindPopup(`<b>River:</b> ${name}<br>
              <b>Type:</b> ${type}<br>
              <b>ID:</b> ${id}`);

            layer.on("mouseover", function () {
              this.setStyle({ weight: 5 });
            });

            layer.on("mouseout", function () {
              this.setStyle(defaultRiverStyle);
            });

            layer.on("click", function () {
              this.setStyle(highlightStyle);
              this.openPopup();
            });
          }
        }).addTo(riverLayer);
      }

      // 2️⃣ Catchment polygons
      else if (geomType.includes("Polygon") && geomCategory.includes("Catchment")) {
        L.geoJSON(feature, {
          style: { color: "#1565c0", fillColor: "#90caf9", weight: 2, fillOpacity: 0.3 },
          onEachFeature: (f, layer) => {
            layer.bindPopup(`<b>Catchment:</b> ${f.properties.name || "Unnamed"}`);
          }
        }).addTo(catchmentLayer);
      }
    });

    // ✅ Default visible layers
    outfallLayer.addTo(map);
    catchmentLayer.addTo(map);
    riverLayer.addTo(map);

    // 🗂️ Layer toggle control
    L.control.layers(null, {
      "Outfalls": outfallLayer,
      "Catchments": catchmentLayer,
      "Rivers": riverLayer
    }, { collapsed: false }).addTo(map);
  });
  window.showNearbyOutfalls = function (lat, lng) {
  const center = L.latLng(lat, lng);

  outfallMarkers.forEach(({ marker, latlng }) => {
    const distance = center.distanceTo(latlng); // meters
    if (distance <= 1000) {
      marker.setStyle({
        color: "#d32f2f",
        fillColor: "#ef5350",
        radius: 8
      });
      marker.bringToFront();
      marker.openPopup();
    }
  });

  L.circle(center, {
    radius: 1000,
    color: "#f44336",
    fill: false,
    dashArray: "4 4"
  }).addTo(map);
};