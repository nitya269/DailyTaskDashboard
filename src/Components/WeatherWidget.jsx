import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './WeatherWidget.css';

// Weather code to description mapping
const weatherCodes = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [forecast, setForecast] = useState([]);
  const [hourlyForecast, setHourlyForecast] = useState(
    Array(24).fill(null).map((_, index) => ({
      time: new Date(Date.now() + index * 60 * 60 * 1000).toLocaleTimeString('en-IN', {
        hour: 'numeric',
        hour12: true,
      }).replace(' ', ''),
      temp: '--',
      code: 0,
      precipitation: 0,
    }))
  );
  const [showHourly, setShowHourly] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('vijayawada');
  const [weatherCache, setWeatherCache] = useState({});
  const [retryCount, setRetryCount] = useState(0);

  // Location data with coordinates
  const locations = {
    vaddeswaram: {
      name: 'Vaddeswaram (CDMA)',
      latitude: 16.445339,
      longitude: 80.611679,
      timezone: 'Asia/Kolkata'
    },
    vijayawada: {
      name: 'Vijayawada',
      latitude: 16.506174,
      longitude: 80.648018,
      timezone: 'Asia/Kolkata'
    },
    rajahmundry: {
      name: 'Rajahmundry',
      latitude: 17.000538,
      longitude: 81.804031,
      timezone: 'Asia/Kolkata'
    }
  };

  const toggleForecast = () => {
    setIsExpanded(!isExpanded);
  };

  const handleLocationChange = (e) => {
    setSelectedLocation(e.target.value);
  };

  const currentLocation = locations[selectedLocation];

  // Create axios instance with timeout and retry
  const weatherAPI = axios.create({
    timeout: 10000, // 10 second timeout
    headers: {
      'Accept': 'application/json',
    }
  });

  // Add request interceptor for retry logic
  weatherAPI.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.code === 'ECONNABORTED' || error.response?.status >= 500) {
        if (retryCount < 2) {
          setRetryCount(prev => prev + 1);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          return weatherAPI.request(error.config);
        }
      }
      return Promise.reject(error);
    }
  );

  useEffect(() => {
    const fetchWeather = async () => {
      const cacheKey = `${selectedLocation}_${Math.floor(Date.now() / (10 * 60 * 1000))}`; // 10-minute cache
      
      // Check cache first
      if (weatherCache[cacheKey]) {
        const cachedData = weatherCache[cacheKey];
        setWeather(cachedData.weather);
        setForecast(cachedData.forecast);
        setHourlyForecast(cachedData.hourlyForecast);
        setLastUpdated(cachedData.lastUpdated);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setRetryCount(0);

        // Single optimized API call with all required data
        const response = await weatherAPI.get(
          `https://api.open-meteo.com/v1/forecast?latitude=${currentLocation.latitude}&longitude=${currentLocation.longitude}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&hourly=temperature_2m,weathercode,precipitation_probability&timezone=${currentLocation.timezone}&forecast_days=7`
        );

        const data = response.data;
        const current = data.current_weather;
        const daily = data.daily;
        const hourly = data.hourly;

        // Get today's min and max temperatures
        const todayMinTemp = Math.round(daily.temperature_2m_min[0]);
        const todayMaxTemp = Math.round(daily.temperature_2m_max[0]);

        // Get forecast for next 7 days (excluding today)
        const forecastData = daily.time.slice(1).map((date, index) => ({
          date: new Date(date).toLocaleDateString('en-IN', { 
            weekday: 'short',
            day: 'numeric',
            month: 'short' 
          }),
          maxTemp: Math.round(daily.temperature_2m_max[index + 1]),
          minTemp: Math.round(daily.temperature_2m_min[index + 1]),
          weatherCode: daily.weathercode[index + 1],
          precipitation: daily.precipitation_sum[index + 1],
          windSpeed: daily.windspeed_10m_max[index + 1],
        }));
        
        const nextSevenDays = forecastData.slice(0, 7);

        const weatherData = {
          temperature: current.temperature,
          weatherCode: current.weathercode,
          weatherDescription: weatherCodes[current.weathercode] || 'Unknown',
          windSpeed: current.windspeed,
          time: new Date(current.time).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          isDay: current.is_day === 1,
          minTemp: todayMinTemp,
          maxTemp: todayMaxTemp
        };

        // Process hourly data more efficiently
        const now = new Date();
        const currentHour = now.getHours();
        const hourlyData = [];
        
        for (let i = 0; i < 24; i++) {
          const hourIndex = currentHour + i;
          const hourTime = new Date();
          hourTime.setHours(hourTime.getHours() + i);
          
          const formattedHour = hourTime.toLocaleTimeString('en-IN', {
            hour: 'numeric',
            hour12: true,
          }).replace(' ', '');
          
          const hourInDay = hourIndex % 24;
          
          hourlyData.push({
            time: formattedHour,
            temp: Math.round(hourly.temperature_2m[hourIndex]),
            code: hourly.weathercode[hourIndex],
            precipitation: hourly.precipitation_probability[hourIndex],
            isDay: hourInDay >= 6 && hourInDay < 18, 
          });
        }

        const processedData = {
          weather: weatherData,
          forecast: nextSevenDays,
          hourlyForecast: hourlyData,
          lastUpdated: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        };

        // Cache the data
        setWeatherCache(prev => ({
          ...prev,
          [cacheKey]: processedData
        }));

        setWeather(weatherData);
        setForecast(nextSevenDays);
        setHourlyForecast(hourlyData);
        setLastUpdated(processedData.lastUpdated);
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error('Error fetching weather data:', err);
        setError('Weather data temporarily unavailable');
        setLoading(false);
        
        // If we have cached data, use it as fallback
        const fallbackKey = Object.keys(weatherCache).find(key => key.startsWith(selectedLocation));
        if (fallbackKey && weatherCache[fallbackKey]) {
          const fallbackData = weatherCache[fallbackKey];
          setWeather(fallbackData.weather);
          setForecast(fallbackData.forecast);
          setHourlyForecast(fallbackData.hourlyForecast);
          setLastUpdated(fallbackData.lastUpdated);
          setError('Using cached data - Weather service unavailable');
        }
      }
    };

    fetchWeather();
    // Increased interval to 60 minutes to reduce API load
    const interval = setInterval(fetchWeather, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedLocation, currentLocation, weatherCache]);

  const getWeatherIcon = (code, isDay = true) => {
    if (code === 0) return isDay ? '☀️' : '🌙';
    if (code <= 2) return isDay ? '⛅' : '☁️';
    if (code === 3) return '☁️';
    if (code <= 49) return '🌫️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '❄️';
    if (code <= 82) return '🌦️';
    if (code <= 86) return '🌨️';
    if (code <= 99) return '⛈️';
    return '🌤️';
  };

  // Old weather effects function removed - now using video backgrounds

  const getWeatherVideo = (code, isDay = true) => {
    // Clear sky conditions
    if (code === 0) return isDay ? 'Clear Sky.mp4' : 'Clear Night.mp4';
    if (code === 1) return isDay ? 'Mostly Sunny.mp4' : 'Clear Night.mp4';
    
    // Partly cloudy conditions
    if (code === 2) return 'Partly Cloudy.mp4';
    
    // Overcast conditions
    if (code === 3) return 'Overcast.mp4';
    
    // Foggy conditions
    if (code >= 45 && code <= 48) return 'Fog.mp4';
    
    // Light rain/drizzle conditions
    if (code >= 51 && code <= 55) return 'Showers.mp4';
    if (code >= 56 && code <= 57) return 'Showers.mp4'; // Freezing drizzle
    
    // Moderate to heavy rain
    if (code >= 61 && code <= 67) return 'Rain.mp4';
    if (code >= 80 && code <= 82) return 'Showers.mp4'; // Rain showers
    
    // Snow conditions
    if (code >= 71 && code <= 75) return 'Snow.mp4';
    if (code === 77) return 'Snow.mp4'; // Snow grains
    if (code >= 85 && code <= 86) return 'Heavy Snow.mp4'; // Snow showers
    
    // Thunderstorm conditions
    if (code >= 95 && code <= 99) return 'Thunderstorm.mp4';
    
    // Default fallback
    return isDay ? 'Mostly Sunny.mp4' : 'Clear Night.mp4';
  };

  const getWeatherDescription = (code) => {
    return weatherCodes[code] || 'Unknown';
  };

  if (loading) return <div className="weather-widget loading">Loading weather...</div>;
  if (error) return <div className="weather-widget error">{error}</div>;

  const currentVideo = weather ? getWeatherVideo(weather.weatherCode, weather.isDay) : 'Mostly Sunny.mp4';

  return (
    <div className="weather-widget">
      {/* Weather Background Video */}
      <video 
        className="weather-background-video" 
        autoPlay 
        loop 
        muted 
        playsInline
        key={currentVideo} // Force re-render when video changes
      >
        <source src={`/${currentVideo}`} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Old weather effects removed - now using video backgrounds */}

      {weather && (
        <>
          <div className="current-weather">
            <div className="weather-single-row">
              <div className="weather-item">
                <div className="location-container">
                  <span className="current-day">
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long' })}
                  </span>
                  <span className="location">
                    {currentLocation.name}
                  </span>
                </div>
              </div>
              <div className="weather-item temperature-container">
                <div className="temperature-main">{Math.round(weather.temperature)}°</div>
                <div className="temperature-range">
                  <span className="temp-max">H: {weather.maxTemp}°</span>
                  <span className="temp-min">L: {weather.minTemp}°</span>
                </div>
              </div>
              <div className="weather-item">
                <div className="weather-icon">
                  {getWeatherIcon(weather.weatherCode, weather.isDay)}
                  <div className="weather-description">
                    {getWeatherDescription(weather.weatherCode)}
                  </div>
                </div>
              </div>
              <div className="weather-item">
                <span className="wind">Wind: {weather.windSpeed} km/h</span>
              </div>
              <div className="weather-item">
                <span className="last-updated">Updated: {lastUpdated}</span>
              </div>
            </div>
            <div className="expand-button-container">
              <div className="location-dropdown-container">
                <div className="location-dropdown-wrapper">
                  <select 
                    className="location-dropdown" 
                    value={selectedLocation} 
                    onChange={handleLocationChange}
                  >
                    <option value="" disabled>Select the location</option>
                    {Object.entries(locations).map(([key, location]) => (
                      <option key={key} value={key}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                  <span className="dropdown-arrow">▼</span>
                </div>
              </div>
              <button 
                className="expand-button" 
                onClick={toggleForecast}
                aria-label={isExpanded ? 'Collapse forecast' : 'View forecast'}
              >
                {isExpanded ? '▲' : '▼'} View Forecast
              </button>
            </div>
          </div>

          {isExpanded && (
            <div className="forecast-container">
              <div className="forecast-tabs">
                <button
                  className={`forecast-tab ${!showHourly ? 'active' : ''}`}
                  onClick={() => setShowHourly(false)}
                >
                  7-Day Forecast
                </button>
                <button
                  className={`forecast-tab ${showHourly ? 'active' : ''}`}
                  onClick={() => setShowHourly(true)}
                >
                  Hourly
                </button>
              </div>

          {!showHourly ? (
            <div className="forecast-days">
              {forecast.length > 0 ? (
                forecast.slice(0, 7).map((day, index) => (
                  <div key={index} className="forecast-day">
                    <div className="day">{day.date}</div>
                    <div className="forecast-icon">{getWeatherIcon(day.weatherCode, true)}</div>
                    <div className="forecast-temp">
                      <div className="temperature-range">
                        <span className="temp-max">H: {day.maxTemp}°</span>
                        <span className="temp-min">L: {day.minTemp}°</span>
                      </div>
                    </div>
                    {day.precipitation > 0 && (
                      <div className="precipitation">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                        </svg>
                        {day.precipitation}mm
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="no-forecast">Loading forecast data...</div>
              )}
            </div>
          ) : (
            <div className="hourly-forecast-container">
              {/* Today's Hours */}
              <div className="hourly-forecast-box">
                <div className="hourly-forecast-header">Today</div>
                <div className="hourly-forecast">
                  {hourlyForecast.length > 0 ? (
                    hourlyForecast
                      .filter((_, index) => index < 24 - new Date().getHours())
                      .map((hour, index) => {
                        const currentTime = new Date();
                        const hourOfDay = (currentTime.getHours() + index) % 24;
                        const isDay = hourOfDay >= 6 && hourOfDay < 20;
                        
                        return (
                          <div key={`today-${index}`} className="hourly-item">
                            <div className="hourly-time">
                              {index === 0 ? 'Now' : hour.time}
                            </div>
                            <div className="hourly-weather">
                              <div className="hourly-icon">{getWeatherIcon(hour.code, isDay)}</div>
                              <div className="hourly-temp">{Math.round(hour.temp)}°</div>
                              <div className="hourly-condition">{weatherCodes[hour.code]}</div>
                            </div>
                            {hour.precipitation > 0 && (
                              <div className="hourly-precipitation">💧 {hour.precipitation}%</div>
                            )}
                          </div>
                        );
                      })
                  ) : (
                    <div className="no-hourly">Loading hourly forecast...</div>
                  )}
                </div>
              </div>

              {/* Tomorrow's Hours */}
              <div className="hourly-forecast-box">
                <div className="hourly-forecast-header">Tomorrow</div>
                <div className="hourly-forecast">
                  {hourlyForecast.length > 0 ? (
                    hourlyForecast
                      .filter((_, index) => index >= 24 - new Date().getHours())
                      .map((hour, index, array) => {
                        const hourIndex = index + (24 - new Date().getHours());
                        const hourOfDay = hourIndex % 24;
                        const isDay = hourOfDay >= 6 && hourOfDay < 20;
                        const isFirstHour = index === 0;
                        
                        return (
                          <div key={`tomorrow-${index}`} className="hourly-item next-day">
                            <div className="hourly-time">
                              {isFirstHour ? '12 AM' : hour.time}
                            </div>
                            <div className="hourly-weather">
                              <div className="hourly-icon">{getWeatherIcon(hour.code, isDay)}</div>
                              <div className="hourly-temp">{Math.round(hour.temp)}°</div>
                              <div className="hourly-condition">{weatherCodes[hour.code]}</div>
                            </div>
                            {hour.precipitation > 0 && (
                              <div className="hourly-precipitation">💧 {hour.precipitation}%</div>
                            )}
                          </div>
                        );
                      })
                  ) : (
                    <div className="no-hourly">Loading hourly forecast...</div>
                  )}
                </div>
              </div>
            </div>
          )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WeatherWidget;
