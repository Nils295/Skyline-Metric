// ... getWeatherIcon und getDayName bleiben gleich ...
function getWeatherIcon(code) {
  if (code === undefined) return "🌡️";
  if (code <= 1) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "☁️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  if (code <= 99) return "⛈️";
  return "🌡️";
}

function getDayName(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-DE", { weekday: "short" });
}

export function renderWeatherCard(containerSelector, data, isLoading = false) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  if (isLoading) {
    container.innerHTML = `<div class="skeleton-title skeleton"></div><div class="skeleton-temp skeleton"></div><div class="skeleton-box skeleton" style="height:150px"></div>`;
    return;
  }

  const loadTime = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Formatierung der Sonnenzeiten (nur Uhrzeit hh:mm)
  const sunrise = new Date(data.sunrise).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const sunset = new Date(data.sunset).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Dynamischer Hintergrund
  const body = document.body;
  body.className = "";
  if (data.weathercode <= 1) body.classList.add("theme-sunny");
  else if (data.weathercode <= 3) body.classList.add("theme-cloudy");
  else body.classList.add("theme-rainy");

  container.innerHTML = `
    <div style="position: relative;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h3 style="margin: 0; font-size: 1.8rem;">${data.name}</h3>
          <p style="margin: 0; font-size: 0.8rem; color: #94a3b8;">Aktualisiert: ${loadTime} Uhr</p>
          <div style="display: flex; align-items: center; gap: 20px; margin: 10px 0;">
            <div style="font-size: 3.5rem; font-weight: 700;">${data.temp.toFixed(1)}°C</div>
            <div style="font-size: 3.5rem;">${getWeatherIcon(data.weathercode)}</div>
          </div>
          <p style="color: #cbd5e1; margin-top: -10px;">Gefühlt: <strong>${data.feels_like.toFixed(1)}°C</strong></p>
        </div>
        <button id="fav-toggle" data-name="${data.name}" data-lat="${data.lat}" data-lon="${data.lon}" class="fav-btn">❤</button>
      </div>
      
      <div class="info-grid">
        <div class="info-box-styled"><label>UV-Index <br></label><span>${data.uv_index.toFixed(1)}</span></div>
        <div class="info-box-styled"><label>Wind <br></label><span>${data.wind} km/h</span></div>
        <div class="info-box-styled"><label>Feuchte <br></label><span>${data.rhum}%</span></div>
        <div class="info-box-styled"><label>Regen <br></label><span>${data.prcp} mm</span></div>
        <div class="info-box-styled"><label>Aufgang</label><span style="font-size: 1rem;"> ${sunrise}</span></div>
        <div class="info-box-styled"><label>Untergang</label><span style="font-size: 1rem;"> ${sunset}</span></div>
      </div>

      <h4 style="margin: 25px 0 10px 0; font-size: 1rem; color: #94a3b8;">5-Tage Vorhersage</h4>
      <div class="forecast-row">
        ${data.forecast
          .map(
            (day) => `
          <div class="forecast-item">
            <span class="day">${getDayName(day.date)}</span>
            <span class="icon">${getWeatherIcon(day.code)}</span>
            <span class="temps">${day.temp_max.toFixed(0)}° / ${day.temp_min.toFixed(0)}°</span>
          </div>
        `,
          )
          .join("")}
      </div>

      <button</button>
    </div>
  `;
}
