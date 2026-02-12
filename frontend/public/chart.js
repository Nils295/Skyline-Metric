let chartInstance = null;

export function renderChart(containerId, data, isCompare = false) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = ""; // Löscht das Skeleton-Div, bevor ApexCharts startet
  
  // ... restlicher Code zum Erstellen des Charts


  let series = [];
  let colors = ["#60a5fa"]; // Standard Blau

  if (isCompare) {
    series = [
      {
        name: data.city1.name,
        data: data.city1.series.map((i) => ({ x: i.ts * 1000, y: i.temp })),
      },
      {
        name: data.city2.name,
        data: data.city2.series.map((i) => ({ x: i.ts * 1000, y: i.temp })),
      },
    ];
    colors = ["#60a5fa", "#f87171"]; // Blau vs. Rot
  } else {
    series = [
      {
        name: "Temperatur",
        data: data.map((item) => ({ x: item.ts * 1000, y: item.temp })),
      },
    ];
  }

  const options = {
    series: series,
    chart: {
      type: "line",
      height: 350,
      background: "transparent",
      toolbar: { show: false },
    },
    colors: colors,
    stroke: { width: 4, curve: "smooth" },
    xaxis: { type: "datetime", labels: { style: { colors: "#94a3b8" } } },
    yaxis: {
      labels: {
        style: { colors: "#94a3b8" },
        formatter: (v) => v.toFixed(1) + "°",
      },
    },

    legend: {
      labels: {
        colors: "#94a3b8", // Ein helles Blaugrau, passend zu deinem Design
        useSeriesColors: false, // Verhindert, dass der Text die Farbe der Linie übernimmt
      },
      markers: {
        width: 12,
        height: 12,
        strokeWidth: 0,
        radius: 12,
      },
    },
    
    annotations: {
      xaxis: [
        {
          x: new Date().getTime(),
          borderColor: "#fff",
          label: {
            text: "Jetzt",
            style: { color: "#fff", background: "#334155" },
          },
        },
      ],
    },
    grid: { borderColor: "rgba(255,255,255,0.05)" },
  };

  if (chartInstance) chartInstance.destroy();
  chartInstance = new ApexCharts(el, options);
  chartInstance.render();
}
