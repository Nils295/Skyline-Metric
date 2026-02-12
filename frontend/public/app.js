import { initSearch, renderHistory } from "./search.js";
import { renderWeatherCard } from "./weatherCard.js";
import { renderChart } from "./chart.js";
import { renderRainCard } from "./rainCard.js";

const API_BASE = window.location.origin;
let favorites = JSON.parse(localStorage.getItem("weather_favs")) || [];
let searchHistory = JSON.parse(localStorage.getItem("weather_history")) || [];
let refreshInterval;
let compareMode = false;
let firstCity = null;

function updateFavList() {
  const list = document.getElementById("favorites-list");
  if (!list) return;

  if (favorites.length === 0) {
    list.innerHTML = `
      <div style="color: #94a3b8; font-size: 0.85rem; padding: 10px; text-align: center; border: 1px dashed rgba(255,255,255,0.1); border-radius: 10px;">
        ⭐ Klicke auf das Herz-Icon bei einer Stadt, um Favoriten zu speichern.
      </div>`;
  } else {
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
  }
  localStorage.setItem("weather_favs", JSON.stringify(favorites));
}

async function loadCity(name, lat, lon) {
  // 1. Sicherheits-Check: Koordinaten validieren
  const numLat = parseFloat(lat);
  const numLon = parseFloat(lon);

  if (isNaN(numLat) || isNaN(numLon)) {
    console.error("Ungültige Koordinaten für:", name, lat, lon);
    return;
  }

  try {
    // Skeleton-Loader starten
    renderWeatherCard("#current-body", {}, true);
    const sectionChart = document.getElementById("section-chart");
    if (sectionChart) sectionChart.style.display = "block";

    // --- LOGIK: VERGLEICHSMODUS ---
    if (compareMode && firstCity && firstCity.lat !== undefined) {
      console.log("Vergleich wird gestartet:", firstCity.name, "vs", name);

      const btn30 = document.getElementById("btn-load-30d");
      const isLongTerm = btn30 && btn30.parentElement.style.display === "none";
      const daysParam = isLongTerm ? 30 : 7;

      // URL für Vergleich und aktuelles Wetter der 2. Stadt
      const compareUrl = `${API_BASE}/api/weather/compare?lat1=${firstCity.lat}&lon1=${firstCity.lon}&name1=${encodeURIComponent(firstCity.name)}&lat2=${numLat}&lon2=${numLon}&name2=${encodeURIComponent(name)}&days=${daysParam}`;
      const weatherUrl = `${API_BASE}/api/weather/current?lat=${numLat}&lon=${numLon}`;

      // In app.js innerhalb von loadCity im Vergleichs-Block ergänzen:
      window.currentLat2 = numLat;
      window.currentLon2 = numLon;

      // BEIDE Anfragen parallel ausführen
      const [compRes, featRes] = await Promise.all([
        fetch(compareUrl),
        fetch(weatherUrl),
      ]);

      if (!compRes.ok || !featRes.ok)
        throw new Error("API Fehler im Vergleichsmodus");

      // Hier lag der Fehler: Die JSON-Umwandlung fehlte!
      const compareData = await compRes.json();
      const weatherData = await featRes.json();

      // UI Aktualisieren
      renderWeatherCard("#current-body", {
        name,
        lat: numLat,
        lon: numLon,
        ...weatherData,
      });
      renderRainCard("#rain-container", weatherData.rain_forecast);
      renderChart("temp-chart", compareData, true);

      // Status zurücksetzen
      compareMode = false;
      document.getElementById("compare-info").style.display = "none";

      firstCity = { name, lat: numLat, lon: numLon };
      reset30DayButton();
      return; // WICHTIG: Hier beenden
    }

    // --- LOGIK: NORMALER MODUS ---
    console.log("Normaler Modus für:", name);
    firstCity = { name, lat: numLat, lon: numLon };

    const [weatherRes, chartRes] = await Promise.all([
      fetch(`${API_BASE}/api/weather/current?lat=${numLat}&lon=${numLon}`),
      fetch(`${API_BASE}/api/weather/chart?lat=${numLat}&lon=${numLon}`),
    ]);

    if (!weatherRes.ok || !chartRes.ok) throw new Error("API Ladefehler");

    const weatherData = await weatherRes.json();
    const chartData = await chartRes.json();

    renderWeatherCard("#current-body", {
      name,
      lat: numLat,
      lon: numLon,
      ...weatherData,
    });
    renderRainCard("#rain-container", weatherData.rain_forecast);
    renderChart("temp-chart", chartData.series, false);

    reset30DayButton();

    // Refresh & History
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => loadCity(name, numLat, numLon), 600000);

    if (name && !searchHistory.some((city) => city.name === name)) {
      searchHistory.unshift({ name, lat: numLat, lon: numLon });
      if (searchHistory.length > 3) searchHistory.pop();
      localStorage.setItem("weather_history", JSON.stringify(searchHistory));
      renderHistory("#search-history-container", searchHistory, (n, la, lo) =>
        loadCity(n, la, lo),
      );
    }
  } catch (error) {
    console.error("Fehler in loadCity:", error);
    document.getElementById("current-body").innerHTML =
      `<div style="padding:20px; color:#f87171;">⚠️ Fehler beim Laden der Stadt. Bitte versuche es erneut.</div>`;
  }
}

// --- EVENT LISTENERS (Deine originale Logik) ---
// Diese Funktion muss frei in der Datei stehen, damit loadCity sie findet!
function reset30DayButton() {
  const btn30 = document.getElementById("btn-load-30d");
  if (btn30) {
    // Falls der Button oder sein Container versteckt war (durch 30-Tage-Laden),
    // zeigen wir ihn für die neue Stadt wieder an.
    btn30.parentElement.style.display = "flex";
    btn30.innerHTML = "📈 30 Tage Verlauf laden";
    btn30.disabled = false;
  }
}

// --- EVENT LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
  updateFavList();

  // Home Button Logik
  const logoHome = document.getElementById("logo-home-link");
  if (logoHome) {
    logoHome.addEventListener("click", (e) => {
      e.preventDefault();
      compareMode = false;
      firstCity = null;
      const info = document.getElementById("compare-info");
      if (info) info.style.display = "none";
      document.getElementById("section-chart").style.display = "none";
      document.getElementById("current-body").innerHTML = "Suche einen Ort, um zu starten...";
      window.scrollTo({ top: 0, behavior: "smooth" });
      document.title = "Skyline Metric | Wetter"; // Titel zurücksetzen
    });
  }

  // Suche Initialisierung
  initSearch(
    "#search-root",
    (query) => {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.length) {
            const { lat, lon, display_name } = data[0];
            loadCity(display_name.split(",")[0], lat, lon);
          }
        });
    },
    (lat, lon) => loadCity("Mein Standort", lat, lon)
  );

  renderHistory("#search-history-container", searchHistory, (n, la, lo) => loadCity(n, la, lo));

  // Zentraler Click-Handler
  document.addEventListener("click", async (e) => {

const favLink = e.target.closest(".fav-link");
if (favLink) {
  const { name, lat, lon } = favLink.dataset;
  loadCity(name, lat, lon);
  return;
}

    // Favoriten Logik
    if (e.target.id === "fav-toggle") {
      const { name, lat, lon } = e.target.dataset;
      if (!favorites.find((f) => f.name === name)) {
        favorites.push({ name, lat, lon });
        updateFavList();
      }
    }

    if (e.target.classList.contains("remove-fav")) {
      favorites = favorites.filter((f) => f.name !== e.target.dataset.name);
      updateFavList();
    }

    // Vergleichs-Modus starten
    if (e.target.id === "btn-start-compare") {
      if (!firstCity) return;
      compareMode = true;
      const info = document.getElementById("compare-info");
      if (info) {
        info.style.display = "flex";
        info.innerHTML = `<span>📍 <b>${firstCity.name}</b> fixiert. Suche 2. Stadt...</span>
                          <button id="btn-cancel-compare" style="...">Abbrechen</button>`;
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (e.target.id === "btn-cancel-compare") {
      compareMode = false;
      document.getElementById("compare-info").style.display = "none";
    }

    // 30 Tage Button
if (e.target.id === "btn-load-30d") {
  if (!firstCity) return;
  const btn = e.target;
  const originalText = btn.innerHTML;
  btn.innerHTML = "⌛ Lade 30 Tage...";
  btn.disabled = true;

  try {
    const chartCanvas = document.querySelector("#temp-chart canvas");
    // Wir prüfen, ob aktuell zwei Städte (Datasets) im Chart sind
    const isCompareActive =
      chartCanvas &&
      window.currentChartInstance &&
      window.currentChartInstance.data.datasets.length > 1;

    if (isCompareActive) {
      // Wenn ein Vergleich aktiv ist, brauchen wir die 2. Stadt aus dem Chart-Label
      const city2Name = window.currentChartInstance.data.datasets[1].label;

      // Wir nutzen die Daten der ersten Stadt und die Koordinaten der zweiten
      // Hinweis: Damit das perfekt klappt, müssen wir lat2/lon2 beim ersten Vergleich kurz zwischenspeichern
      // Für den Moment nehmen wir die Daten aus dem Chart-Objekt, falls vorhanden, oder fragen neu an.
      const url = `${API_BASE}/api/weather/compare?lat1=${firstCity.lat}&lon1=${firstCity.lon}&name1=${encodeURIComponent(firstCity.name)}&lat2=${window.currentLat2}&lon2=${window.currentLon2}&name2=${encodeURIComponent(city2Name)}&days=30`;

      const res = await fetch(url);
      const data = await res.json();
      renderChart("temp-chart", data, true); // true = Vergleichsmodus beibehalten
    } else {
      // Normaler Modus (nur eine Stadt)
      const url = `${API_BASE}/api/weather/chart?lat=${firstCity.lat}&lon=${firstCity.lon}&days=30`;
      const res = await fetch(url);
      const data = await res.json();
      renderChart("temp-chart", data.series, false);
    }

    btn.parentElement.style.display = "none";
  } catch (err) {
    console.error("30-Tage Fehler:", err);
    btn.innerHTML = "❌ Fehler";
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 2000);
  }
}
  });
});