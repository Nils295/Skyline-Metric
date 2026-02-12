export function renderRainCard(containerSelector, rainData) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  // Falls keine Daten da sind oder Array leer ist
  if (!rainData || rainData.length === 0) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <div class="weather-card">
        <h2 class="card-title">
            🌧️ Regen-Wahrscheinlichkeit (12h)
        </h2>
        <div class="rain-bar-container">
            ${rainData
              .map((hour, index) => {
                const label = index === 0 ? "Jetzt" : hour.time;
                const isNow = index === 0;

                return `
                <div class="rain-bar-item">
                    <span class="bar-value-label">${hour.prob}%</span>
                    <div class="bar-bg">
                        <div class="bar-fill" style="height: ${hour.prob}%; ${isNow ? "background: #60a5fa;" : ""}"></div>
                    </div>
                    <span class="bar-time" style="${isNow ? "color: white; font-weight: bold;" : ""}">
                        ${label}
                    </span>
                </div>`;
              })
              .join("")}
        </div>
    </div>`;
}
