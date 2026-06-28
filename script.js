// Map coordinate systems for 19428 (Conshohocken Area)
const LAT = 40.078;
const LON = -75.301;

async function initDashboard() {
    try {
        await fetchAlerts();
        await fetchForecast();
    } catch (error) {
        console.error("Dashboard error update lifecycle:", error);
    }
}

async function fetchAlerts() {
    const alertsUrl = `https://api.weather.gov/alerts/active?point=${LAT},${LON}`;
    const alertsSection = document.getElementById('alerts-section');
    const alertsContent = document.getElementById('alerts-content');

    try {
        const response = await fetch(alertsUrl, { headers: { 'User-Agent': 'PhillyWeatherDashboard/2.0' } });
        if (!response.ok) throw new Error("Alert request failure");
        
        const data = await response.json();
        const features = data.features || [];

        // Hide alert block cleanly if no dynamic hazards exist
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
                <strong style="color: #fca5a5; font-size: 1.05rem;">🔴 ${props.event}</strong><br>
                <small style="color: #cbd5e1;">Severity: ${props.severity} | Areas: ${props.areaDesc}</small><br>
                <p style="margin-top: 8px; font-size: 0.9rem; line-height: 1.4; color: #f8fafc;">${props.description}</p>
            `;
            alertsContent.appendChild(alertElement);
        });
    } catch (e) {
        console.error(e);
        alertsContent.innerHTML = "Unable to verify live NOAA local hazard streams.";
    }
}

async function fetchForecast() {
    const pointsUrl = `https://api.weather.gov/points/${LAT},${LON}`;
    const currentContent = document.getElementById('current-content');
    const forecastGrid = document.getElementById('forecast-grid');

    try {
        const pointsResponse = await fetch(pointsUrl, { headers: { 'User-Agent': 'PhillyWeatherDashboard/2.0' } });
        if (!pointsResponse.ok) throw new Error("Metadata parse error");
        
        const pointsData = await pointsResponse.json();
        const forecastUrl = pointsData.properties.forecast;

        const forecastResponse = await fetch(forecastUrl, { headers: { 'User-Agent': 'PhillyWeatherDashboard/2.0' } });
        if (!forecastResponse.ok) throw new Error("Grid projection error");

        const forecastData = await forecastResponse.json();
        const periods = forecastData.properties.periods;

        if (!periods || periods.length === 0) {
            currentContent.innerHTML = "No real-time reporting available.";
            return;
        }

        // Render Current Conditions panel
        const current = periods[0];
        currentContent.innerHTML = `
            <div style="display: flex; align-items: center; gap: 20px;">
                <div style="font-size: 3rem; font-weight: 800; tracking-spacing: -2px; color: #fff;">${current.temperature}°${current.temperatureUnit}</div>
                <div>
                    <div style="color: var(--accent-blue); font-size: 1.2rem; font-weight: 700;">${current.name}</div>
                    <div style="font-weight: 500; opacity: 0.9;">${current.shortForecast}</div>
                </div>
            </div>
            <p style="margin-top: 15px; font-size: 1rem; color: var(--text-muted); line-height: 1.5;">${current.detailedForecast}</p>
            <div style="margin-top: 15px; display: flex; gap: 20px; font-size: 0.85rem; opacity: 0.8;">
                <span>💨 Wind: <b>${current.windSpeed} ${current.windDirection}</b></span>
            </div>
        `;

        // Render 7-Day Matrix cards
        forecastGrid.innerHTML = '';
        periods.slice(1, 14).forEach(period => {
            const card = document.createElement('div');
            card.className = 'forecast-card';
            card.innerHTML = `
                <div class="day">${period.name}</div>
                <img src="${period.icon}" alt="Icon" style="width: 36px; height: 36px; margin: 8px 0; border-radius: 50%; opacity: 0.85;">
                <div class="temp">${period.temperature}°${period.temperatureUnit}</div>
                <div class="short-forecast">${period.shortForecast}</div>
            `;
            forecastGrid.appendChild(card);
        });

    } catch (e) {
        console.error(e);
        currentContent.innerHTML = "Error parsing data streams from local infrastructure.";
        forecastGrid.innerHTML = "";
    }
}

// Global initialization event hooks
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    
    // Auto-refresh loops running every 2 minutes (120,000ms)
    setInterval(initDashboard, 120000);
});
