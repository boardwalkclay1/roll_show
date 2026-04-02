import API from "/app/js/api.js";

const rangeSelect = document.getElementById("analyticsRange");
const chartUsers = document.getElementById("chartUsers");
const chartTickets = document.getElementById("chartTickets");
const chartRevenue = document.getElementById("chartRevenue");
const chartShows = document.getElementById("chartShows");

function renderSimpleSeries(el, series, labelFormatter) {
  if (!series || !series.length) {
    el.textContent = "No data for this range.";
    return;
  }

  const max = Math.max(...series.map(p => p.value || 0)) || 1;
  const rows = series
    .map(p => {
      const width = Math.max(5, (p.value / max) * 100);
      return `
        <div style="display:flex; align-items:center; margin:2px 0;">
          <div style="width:80px; font-size:11px; opacity:0.8;">${p.label}</div>
          <div style="flex:1; background:rgba(255,255,255,0.08); border-radius:999px; overflow:hidden; height:10px;">
            <div style="width:${width}%; height:100%; background:linear-gradient(90deg, gold, orange);"></div>
          </div>
          <div style="width:60px; text-align:right; font-size:11px; opacity:0.9; margin-left:6px;">
            ${labelFormatter ? labelFormatter(p.value) : p.value}
          </div>
        </div>
      `;
    })
    .join("");

  el.innerHTML = rows;
}

async function loadAnalytics() {
  const range = rangeSelect.value || "30d";
  const res = await API.get(`/api/owner/analytics?range=${encodeURIComponent(range)}`);
  if (!res.success || !res.data) return;

  const data = res.data;

  renderSimpleSeries(chartUsers, data.user_growth || [], v => v);
  renderSimpleSeries(chartTickets, data.ticket_sales || [], v => v);
  renderSimpleSeries(chartRevenue, data.revenue || [], v => `$${(v / 100).toFixed(2)}`);
  renderSimpleSeries(chartShows, data.shows || [], v => v);
}

rangeSelect.addEventListener("change", loadAnalytics);

loadAnalytics();
