import { initSearch, renderHistory } from "./search.js";
import { renderWeatherCard } from "./weatherCard.js";
import { renderChart } from "./chart.js";
import { renderRainCard } from "./rainCard.js";

const API_BASE = "http://127.0.0.1:8000";
let favorites = JSON.parse(localStorage.getItem("weather_favs")) || [];
let searchHistory = JSON.parse(localStorage.getItem("weather_history")) || [];
let refreshInterval;

let compareMode = false;
let firstCity = null;

/**
 * Aktualisiert die Favoriten-Liste im UI und im LocalStorage
 */
function updateFavList() {
  const list = document.getElementById("favorites-list");
  if (!list) return;

  if (favorites.length === 0) {
    list.innerHTML = `
      <div style="color: #94a3b8; font-size: 0.85rem; padding: 10px; text-align: center; border: 1px dashed rgba(255,255,255,0.1); border-radius: 10px;">
        ⭐ Klicke auf das Herz-Icon bei einer Stadt, um Favoriten zu speichern.
      </div>`;
    return;
  }
  // ... restliche map-Logik

  list.innerHTML = favorites
    .map(
      (f) => `
        <li class="fav-item">
            <span class="fav-link" data-lat="${f.lat}" data-lon="${f.lon}" data-name="${f.name}" style="cursor: pointer; flex-grow: 1; font-weight: 500;">
                📍 ${f.name}
            </span>
            <button class="remove-fav" data-name="${f.name}" style="background:none; border:none; color:#64748b; cursor:pointer; font-size: 1.2rem;">✕</button>
        </li>
    `,
    )
    .join("");
  localStorage.setItem("weather_favs", JSON.stringify(favorites));
}

async function loadCity(name, lat, lon) {
  try {
    // --- 1. VERGLEICHS-MODUS LOGIK ---
    if (compareMode && firstCity) {
      const res = await fetch(
        `${API_BASE}/api/weather/compare?lat1=${firstCity.lat}&lon1=${firstCity.lon}&name1=${encodeURIComponent(firstCity.name)}&lat2=${lat}&lon2=${lon}&name2=${encodeURIComponent(name)}`,
      );
      const data = await res.json();

      renderChart("temp-chart", data, true);

      compareMode = false;
      document.getElementById("compare-info").style.display = "none";

      // --- NEU: Nach dem Laden der 2. Stadt automatisch zum Chart scrollen ---
      const chartSection = document.getElementById("section-chart");
      if (chartSection) {
        chartSection.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      return;
    }

    firstCity = { name, lat, lon };

    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => loadCity(name, lat, lon), 600000);

    if (!searchHistory.some((city) => city.name === name)) {
      searchHistory.unshift({ name, lat, lon });
      if (searchHistory.length > 3) searchHistory.pop();
      localStorage.setItem("weather_history", JSON.stringify(searchHistory));
      renderHistory("#search-history-container", searchHistory, (n, la, lo) =>
        loadCity(n, la, lo),
      );
    }

   // --- Ab ca. Zeile 90 in app.js ---

// 1. Haupt-Wetter Skeleton (bestehend)
renderWeatherCard("#current-body", {}, true);

// 2. NEU: Rain-Card Skeleton
const rainContainer = document.getElementById("rain-container");
if (rainContainer) {
    rainContainer.innerHTML = `
        <section class="weather-card">
            <h2 class="card-title">Regen-Vorschau</h2>
            <div class="skeleton skeleton-rain"></div>
        </section>`;
}

// 3. NEU: Chart-Sektion anzeigen und Skeleton einfügen
const sectionChart = document.getElementById("section-chart");
if (sectionChart) {
    sectionChart.style.display = "block";
    const chartDiv = document.getElementById("temp-chart");
    if (chartDiv) {
        chartDiv.innerHTML = '<div class="skeleton skeleton-chart"></div>';
    }
    // Button während des Ladens verstecken
    const footer = sectionChart.querySelector(".chart-footer");
    if (footer) footer.style.display = "none";
}

    const [weatherRes, chartRes] = await Promise.all([
      fetch(`${API_BASE}/api/weather/current?lat=${lat}&lon=${lon}`),
      fetch(`${API_BASE}/api/weather/chart?lat=${lat}&lon=${lon}`),
    ]);

    const weatherData = await weatherRes.json();
    const chartData = await chartRes.json();

    renderWeatherCard("#current-body", { name, lat, lon, ...weatherData });
    renderRainCard("#rain-container", weatherData.rain_forecast);

    document.getElementById("section-chart").style.display = "block";
    const btn30 = document.getElementById("btn-load-30d");
    if (btn30) {
      btn30.parentElement.style.display = "flex";
      btn30.innerHTML = "📈 30 Tage Verlauf laden";
      btn30.disabled = false;
    }

    renderChart("temp-chart", chartData.series, false);
  } catch (error) {
    console.error("Fehler in loadCity:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // HOME-BUTTON LOGIK
  const logoHome = document.getElementById("logo-home-link");
  if (logoHome) {
    logoHome.addEventListener("click", (e) => {
      e.preventDefault();

      // Reset App State
      compareMode = false;
      firstCity = null; // Wichtig: Damit die App "vergisst", welche Stadt fixiert war

      // UI aufräumen
      const info = document.getElementById("compare-info");
      if (info) {
        info.style.display = "none";
        info.innerHTML = ""; // Löscht den Inhalt (wichtig für CSS :empty)
      }

      const searchInput = document.querySelector("#search-root input");
      if (searchInput) searchInput.value = "";

      // Zurück zur Startansicht
      document.getElementById("section-chart").style.display = "none";
      document.getElementById("current-body").innerHTML =
        "Suche einen Ort, um zu starten...";
      document.getElementById("rain-container").innerHTML = "";

      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  // ... restlicher Code
  // Favoriten beim Start anzeigen
  updateFavList();

  initSearch(
    "#search-root",
    (query) => {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.length) {
            const { lat, lon, display_name } = data[0];
            loadCity(display_name.split(",")[0], lat, lon);
          }
        });
    },
    (lat, lon) => loadCity("Mein Standort", lat, lon),
  );

  renderHistory("#search-history-container", searchHistory, (n, la, lo) =>
    loadCity(n, la, lo),
  );

  document.addEventListener("click", async (e) => {
    // Favoriten hinzufügen
    if (e.target.id === "fav-toggle") {
      const { name, lat, lon } = e.target.dataset;
      if (!favorites.find((f) => f.name === name)) {
        favorites.push({ name, lat, lon });
        updateFavList();
      }
    }

    // Favoriten löschen
    if (e.target.classList.contains("remove-fav")) {
      favorites = favorites.filter((f) => f.name !== e.target.dataset.name);
      updateFavList();
    }

    // Vergleichs-Modus
    // In der app.js innerhalb des Click-Listeners
    // In app.js innerhalb des Click-Listeners (ca. Zeile 116)
    // In app.js innerhalb des Click-Listeners (ca. Zeile 116)
    if (e.target.id === "btn-start-compare") {
      if (!firstCity) return;
      compareMode = true;

      const info = document.getElementById("compare-info");
      if (info) {
        info.style.display = "flex"; // Auf Flex umstellen für Button-Layout
        info.innerHTML = `
      <span>📍 <b>${firstCity.name}</b> fixiert. Suche 2. Stadt...</span>
      <button id="btn-cancel-compare" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">Abbrechen</button>
    `;
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
      const searchInput = document.querySelector("#search-root input");
      if (searchInput) {
        setTimeout(() => {
          searchInput.focus();
          searchInput.value = "";
        }, 400);
      }
    }

    // NEU: Vergleich abbrechen
    if (e.target.id === "btn-cancel-compare") {
      compareMode = false;
      document.getElementById("compare-info").style.display = "none";
    }

    // 30 Tage laden
    if (e.target.id === "btn-load-30d") {
      if (!firstCity) return;
      const btn = e.target;
      btn.innerHTML = "⌛ Lade Daten...";
      btn.disabled = true;
      try {
        const res = await fetch(
          `${API_BASE}/api/weather/chart?lat=${firstCity.lat}&lon=${firstCity.lon}&days=30`,
        );
        const data = await res.json();
        renderChart("temp-chart", data.series, false);
        btn.parentElement.style.display = "none";
      } catch (err) {
        btn.innerHTML = "❌ Fehler";
        btn.disabled = false;
      }
    }

    // Klick auf Favorit oder History-Chip
    if (
      e.target.classList.contains("fav-link") ||
      e.target.classList.contains("history-chip")
    ) {
      const { name, lat, lon } = e.target.dataset;
      if (name && lat && lon) loadCity(name, lat, lon);
    }
  });
});
