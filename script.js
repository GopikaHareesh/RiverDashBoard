// script.js
const map = L.map('map').setView([54.5, -1.3], 7);

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
  { type: 'Foam', location: 'River Tees near Yarm', lat: 54.508, lng: -1.357 },
  { type: 'Dead fish', location: 'Tyne at Hexham', lat: 54.974, lng: -2.099 },
  { type: 'Unusual color', location: 'Wear near Durham', lat: 54.775, lng: -1.576 }
];

const table = document.getElementById('reportTable');
let draggableMarker = null;

function addReportToMap(report) {
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${pollutionColors[report.type]};width:14px;height:14px;border-radius:50%;border:2px solid white;"></div>`
  });

  L.marker([report.lat, report.lng], { icon }).addTo(map)
    .bindPopup(`<b>${report.type}</b><br>${report.location}`);

  const row = table.insertRow();
  row.insertCell(0).textContent = report.type;
  row.insertCell(1).textContent = report.location;
  row.insertCell(2).textContent = report.lat;
  row.insertCell(3).textContent = report.lng;
}

reports.forEach(addReportToMap);

document.getElementById('reportForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const newReport = {
    type: document.getElementById('pollutionType').value,
    location: document.getElementById('location').value,
    lat: parseFloat(document.getElementById('lat').value),
    lng: parseFloat(document.getElementById('lng').value)
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
const catchmentLayer = L.layerGroup();

// ✅ Load Outfalls into layer group
fetch("outfalls.geojson")
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
        radius: 6,
        fillColor: "#00bcd4",
        color: "#007b8a",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      }),
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        layer.bindPopup(
          `<b>Outfall Info</b><br>
           Node: ${props.NODE_REF}<br>
           Sewerage: ${props.SEW_USGE}<br>
           Legal: ${props.LEG_STAT}<br>
           Status: ${props.OP_STAT}`
        );
      }
    }).addTo(outfallLayer);
  });

fetch("northumbria_catchment.geojson")
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      style: feature => {
        const type = feature.properties["water-body-type"]?.string || "Other";

        const colorMap = {
          "River": "#64b5f6",
          "Lake": "#81c784",
          "Canal": "#ffd54f",
          "Coastal": "#4dd0e1",
          "Other": "#e0e0e0"
        };

        return {
          color: "#1a237e", // dark blue outline
          weight: 2,
          fillColor: colorMap[type] || "#e0e0e0",
          fillOpacity: 0.3
        };
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties.name;
        const type = feature.properties["water-body-type"]?.string || "Unknown";

        layer.bindPopup(`<b>${name}</b><br>Type: ${type}`);

        layer.on("mouseover", function () {
          this.setStyle({
            weight: 3,
            fillOpacity: 0.5
          });
        });

        layer.on("mouseout", function () {
          this.setStyle({
            weight: 2,
            fillOpacity: 0.3
          });
        });
      }
    }).addTo(catchmentLayer);
  });



// ✅ Add both layers to map
outfallLayer.addTo(map);
catchmentLayer.addTo(map);

// ✅ Add toggle control
L.control.layers(null, {
  "Outfalls": outfallLayer,
  "Catchments": catchmentLayer
}, { collapsed: false }).addTo(map);
