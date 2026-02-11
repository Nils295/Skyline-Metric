export function initSearch(rootSelector, onSelect, onGeolocate) {
  const root = document.querySelector(rootSelector);
  if (!root) return;

  root.innerHTML = "";
  root.style.display = "flex";
  root.style.flexDirection = "column"; // Damit History unter der Bar ist
  root.style.gap = "10px";
  root.style.width = "100%";
  root.style.maxWidth = "600px";

  // Wrapper für Input + Button (Obere Zeile)
  const topRow = document.createElement("div");
  topRow.style.display = "flex";
  topRow.style.gap = "10px";
  topRow.style.width = "100%";

  const inputWrapper = document.createElement("div");
  inputWrapper.className = "search-wrapper";
  inputWrapper.style.position = "relative";
  inputWrapper.style.flexGrow = "1";

  const icon = document.createElement("span");
  icon.innerHTML = "🔍";
  icon.style.position = "absolute";
  icon.style.left = "15px";
  icon.style.top = "50%";
  icon.style.transform = "translateY(-50%)";
  icon.style.pointerEvents = "none";
  icon.style.opacity = "0.6";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Stadt suchen...";
  input.className = "search-input";
  input.style.width = "100%";
  input.style.padding = "16px 16px 16px 45px";
  input.style.boxSizing = "border-box";

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      onSelect(input.value.trim());
      input.value = "";
      input.blur();
    }
  });

  const geoBtn = document.createElement("button");
  geoBtn.innerHTML = "📍";
  geoBtn.className = "geo-location-btn";

  geoBtn.addEventListener("click", () => {
    if (navigator.geolocation) {
      geoBtn.innerHTML = "⌛";
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onGeolocate(pos.coords.latitude, pos.coords.longitude);
          geoBtn.innerHTML = "📍";
        },
        () => {
          alert("Standortzugriff verweigert.");
          geoBtn.innerHTML = "📍";
        },
      );
    }
  });

  inputWrapper.appendChild(icon);
  inputWrapper.appendChild(input);
  topRow.appendChild(inputWrapper);
  topRow.appendChild(geoBtn);

  // Container für die History-Chips
  const historyContainer = document.createElement("div");
  historyContainer.id = "search-history-container";
  historyContainer.style.display = "flex";
  historyContainer.style.gap = "10px";

  root.appendChild(topRow);
  root.appendChild(historyContainer);
}

// NEUE FUNKTION: Render History Chips
export function renderHistory(selector, history, onClick) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.innerHTML = history
    .map(
      (item) => `
        <span class="history-chip" data-name="${item.name}">
            🕒 ${item.name}
        </span>
    `,
    )
    .join("");

  // Click Events für die Chips
  el.querySelectorAll(".history-chip").forEach((chip, index) => {
    chip.addEventListener("click", () => {
      const item = history[index];
      onClick(item.name, item.lat, item.lon);
    });
  });
}
