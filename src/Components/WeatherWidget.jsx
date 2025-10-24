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
    Array(6).fill(null).map(() => ({
      time: '--:--',
      temp: '--',
      code: 0,
      precipitation: 0,
    }))
  );
  const [showHourly, setShowHourly] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleForecast = () => {
    setIsExpanded(!isExpanded);
  };

  const latitude = 16.5062; // Vijayawada
  const longitude = 80.6480;
  const timezone = 'Asia/Kolkata';

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const [currentResponse, forecastResponse, hourlyResponse] = await Promise.all([
          axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=${timezone}`
          ),
          axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=${timezone}`
          ),
          axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,weathercode,precipitation_probability&timezone=${timezone}&forecast_days=2`
          ),
        ]);

        const current = currentResponse.data.current_weather;
        const daily = forecastResponse.data.daily;

        // Get forecast for next 7 days (excluding today)
        const forecastData = daily.time.map((date, index) => ({
          date: new Date(date).toLocaleDateString('en-IN', { 
            weekday: 'short',
            day: 'numeric',
            month: 'short' 
          }),
          maxTemp: Math.round(daily.temperature_2m_max[index]),
          minTemp: Math.round(daily.temperature_2m_min[index]),
          weatherCode: daily.weathercode[index],
          precipitation: daily.precipitation_sum[index],
          windSpeed: daily.windspeed_10m_max[index],
        }));
        
        // Remove today's forecast and get next 7 days
        const nextSevenDays = forecastData.slice(1, 8); // This should give us 7 days (indices 1 through 7)

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
        };

        const now = new Date();
        const currentHour = now.getHours();
        const hourlyData = [];
        
        const hoursToShow = 24;
        for (let i = 0; i < hoursToShow; i++) {
          const hourIndex = currentHour + i;
          const hourTime = new Date();
          hourTime.setHours(hourTime.getHours() + i);
          
          const formattedHour = hourTime.toLocaleTimeString('en-IN', {
            hour: 'numeric',
            hour12: true,
          }).replace(' ', '');
          
          const dayIndex = Math.floor(hourIndex / 24);
          const hourInDay = hourIndex % 24;
          
          hourlyData.push({
            time: formattedHour,
            temp: Math.round(hourlyResponse.data.hourly.temperature_2m[hourIndex]),
            code: hourlyResponse.data.hourly.weathercode[hourIndex],
            precipitation: hourlyResponse.data.hourly.precipitation_probability[hourIndex],
            isDay: hourInDay >= 6 && hourInDay < 18, 
          });
        }

        setWeather(weatherData);
        setForecast(nextSevenDays);
        setHourlyForecast(hourlyData);
        setLastUpdated(
          new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        );
        setLoading(false);
      } catch (err) {
        console.error('Error fetching weather data:', err);
        setError('Weather data temporarily unavailable');
        setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [latitude, longitude]);

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
                    Vijayawada
                  </span>
                </div>
              </div>
              <div className="weather-item">
                <span className="temperature">{Math.round(weather.temperature)}°C</span>
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
                      <span className="max-temp">{day.maxTemp}°</span>
                      <span className="min-temp">{day.minTemp}°</span>
                    </div>
                    {day.precipitation > 0 && (
                      <div className="precipitation">💧 {day.precipitation}mm</div>
                    )}
                  </div>
                ))
              ) : (
                <div className="no-forecast">Loading forecast data...</div>
              )}
            </div>
          ) : (
            <div className="hourly-forecast">
              {hourlyForecast.length > 0 ? (
                hourlyForecast.map((hour, index) => {
                  const currentHour = new Date().getHours();
                  const isDay = currentHour + index >= 6 && currentHour + index < 20;
                  return (
                    <div key={index} className="hourly-item">
                      <div className="hourly-time">{index === 0 ? 'Now' : hour.time}</div>
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
          )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WeatherWidget;
