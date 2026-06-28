const LAT = 40.078;
const LON = -75.301;
// Conshohocken USGS station reporting key identifier
const USGS_STATION_ID = "01473730"; 

async function initDashboard() {
    try {
        await fetchAlerts();
        await fetchForecast();
        await fetchHydroMetrics();
    } catch (error) {
        console.error("Dashboard lifecyle exception handled:", error);
    }
}

async function fetchAlerts() {
    const alertsUrl = `https://api.weather.gov/alerts/active?point=${LAT},${LON}`;
    const alertsSection = document.getElementById('alerts-section');
    const alertsContent = document.getElementById('alerts-content');

    try {
        const response = await fetch(alertsUrl, { headers: { 'User-Agent': 'PhillyWeatherDashboard/3.0' } });
        if (!response.ok) throw new Error("Alert processing down");
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
        const pointsResponse = await fetch(pointsUrl, { headers: { 'User-Agent': 'PhillyWeatherDashboard/3.0' } });
        const pointsData = await pointsResponse.json();
        const forecastResponse = await fetch(pointsData.properties.forecast, { headers: { 'User-Agent': 'PhillyWeatherDashboard/3.0' } });
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
        `;

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

// NEW: API Fetch configuration for parsing instant stream heights & speed volumes
async function fetchHydroMetrics() {
    const usgsUrl = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${USGS_STATION_ID}&parameterCd=00060,00065&siteStatus=all`;
    const heightDisplay = document.getElementById('river-height');
    const flowDisplay = document.getElementById('river-flow');

    try {
        const response = await fetch(usgsUrl);
        if (!response.ok) throw new Error("USGS stream offline");
        const data = await response.json();
        
        const timeSeries = data.value.timeSeries || [];
        
        timeSeries.forEach(series => {
            const paramCode = series.variable.variableCode[0].value;
            const latestValue = series.values[0].value[0].value;

            if (paramCode === "00065") {
                // 00065 maps to Gage Height (ft)
                heightDisplay.innerText = `${parseFloat(latestValue).toFixed(2)} ft`;
            } else if (paramCode === "00060") {
                // 00060 maps to Stream Discharge (cfs)
                flowDisplay.innerText = `${parseInt(latestValue).toLocaleString()} cfs`;
            }
        });
    } catch (e) {
        console.error("Hydro data update failed:", e);
        heightDisplay.innerText = "Unavailable";
        flowDisplay.innerText = "Unavailable";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    setInterval(initDashboard, 120000); // System cycle updates every 2 minutes
});
