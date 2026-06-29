const LAT = 40.078;
const LON = -75.301;

// Collection array of our upstream, target local, and downstream monitoring stations
const HYDRO_STATIONS = ["01473500", "01473730", "01473800"];

async function initDashboard() {
    try {
        await fetchAlerts();
        await fetchForecast();
        await fetchHydroNetwork();
    } catch (error) {
        console.error("Dashboard lifecycle network sync issue:", error);
    }
}

async function fetchAlerts() {
    const alertsUrl = `https://api.weather.gov/alerts/active?point=${LAT},${LON}`;
    const alertsSection = document.getElementById('alerts-section');
    const alertsContent = document.getElementById('alerts-content');

    try {
        const response = await fetch(alertsUrl, { headers: { 'User-Agent': 'PhillyWeatherDashboard/4.0' } });
        if (!response.ok) throw new Error("Alert collection issue");
        const data = await response.json();
        const features = data.features || [];

        if (features.length === 0) {
            alertsSection.classList.add('hidden');
            return;
        }

        alertsSection.classList.remove('hidden');
        alertsContent.innerHTML = '';
        features.forEach(alert => {
            const props = alert.properties;
            const alertElement = document.createElement('div');
            alertElement.className = 'alert-item';
            alertElement.innerHTML = `
                <strong style="color: #fca5a5;">🔴 ${props.event}</strong><br>
                <small>Severity: ${props.severity} | Areas: ${props.areaDesc}</small>
                <p style="margin-top: 8px; font-size: 0.9rem; color: #f8fafc;">${props.description}</p>
            `;
            alertsContent.appendChild(alertElement);
        });
    } catch (e) {
        console.error(e);
    }
}

async function fetchForecast() {
    const pointsUrl = `https://api.weather.gov/points/${LAT},${LON}`;
    const currentContent = document.getElementById('current-content');
    const forecastGrid = document.getElementById('forecast-grid');

    try {
        const pointsResponse = await fetch(pointsUrl, { headers: { 'User-Agent': 'PhillyWeatherDashboard/4.0' } });
        const pointsData = await pointsResponse.json();
        const forecastResponse = await fetch(pointsData.properties.forecast, { headers: { 'User-Agent': 'PhillyWeatherDashboard/4.0' } });
        const forecastData = await forecastResponse.json();
        const periods = forecastData.properties.periods;

        if (!periods || periods.length === 0) return;

        const current = periods[0];
        currentContent.innerHTML = `
            <div style="display: flex; align-items: center; gap: 20px;">
                <div style="font-size: 3rem; font-weight: 800; color: #fff;">${current.temperature}°${current.temperatureUnit}</div>
                <div>
                    <div style="color: var(--accent-blue); font-size: 1.2rem; font-weight: 700;">${current.name}</div>
                    <div style="font-weight: 500; opacity: 0.9;">${current.shortForecast}</div>
                </div>
            </div>
            <p style="margin-top: 15px; color: var(--text-muted);">${current.detailedForecast}</p>
        ```;

        forecastGrid.innerHTML = '';
        periods.slice(1, 13).forEach(period => {
            const card = document.createElement('div');
            card.className = 'forecast-card';
            card.innerHTML = `
                <div class="day">${period.name}</div>
                <img src="${period.icon}" style="width:32px;height:32px;margin:6px 0;opacity:0.8;">
                <div class="temp">${period.temperature}°${period.temperatureUnit}</div>
                <div class="short-forecast">${period.shortForecast}</div>
            `;
            forecastGrid.appendChild(card);
        });
    } catch (e) {
        console.error(e);
    }
}

// Multi-Station Data Processing Engine
async function fetchHydroNetwork() {
    const stationQueryString = HYDRO_STATIONS.join(",");
    const usgsUrl = `[https://waterservices.usgs.gov/nwis/iv/?format=json&sites=$](https://waterservices.usgs.gov/nwis/iv/?format=json&sites=$){stationQueryString}&parameterCd=00060,00065&siteStatus=all`;

    try {
        const response = await fetch(usgsUrl);
        if (!response.ok) throw new Error("USGS Stream services error");
        const data = await response.json();
        
        const timeSeries = data.value.timeSeries || [];
        
        // Reset placeholders default markers
        const nodeMap = {
            "01473500": { height: "norristown-height", flow: "norristown-flow", hasFlow: false },
            "01473730": { height: "conshohocken-height", flow: "conshohocken-flow", hasFlow: false },
            "01473800": { height: "manayunk-height", flow: "manayunk-flow", hasFlow: false }
        };

        timeSeries.forEach(series => {
            const siteCode = series.sourceInfo.siteCode[0].value;
            const paramCode = series.variable.variableCode[0].value;
            const targetNodes = nodeMap[siteCode];

            if (targetNodes && series.values[0] && series.values[0].value[0]) {
                const latestValue = series.values[0].value[0].value;

                if (paramCode === "00065") { // Stage Value
                    document.getElementById(targetNodes.height).innerText = `${parseFloat(latestValue).toFixed(2)} ft`;
                } else if (paramCode === "00060") { // Discharge Value
                    document.getElementById(targetNodes.flow).innerText = `${parseInt(latestValue).toLocaleString()} cfs`;
                    targetNodes.hasFlow = true;
                }
            }
        });

        // Loop checks to apply static clean label handling if station doesn't track stream discharge volume
        Object.keys(nodeMap).forEach(key => {
            if (!nodeMap[key].hasFlow) {
                document.getElementById(nodeMap[key].flow).innerText = "N/A";
                document.getElementById(nodeMap[key].flow).style.fontSize = "0.95rem";
                document.getElementById(nodeMap[key].flow).style.color = "var(--text-muted)";
            }
        });

    } catch (e) {
        console.error("Hydro data update failed:", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    setInterval(initDashboard, 120000); // 2-minute auto-refresh cycle
});
