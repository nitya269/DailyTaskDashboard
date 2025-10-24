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

        // Get today's min and max temperatures directly from the API response
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
        
        // Get next 7 days (already excluding today)
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

  const getWeatherVideo = (code) => {
    // Clear sky and sunny conditions
    if (code === 0 || code === 1) return 'Sunny.mp4';
    
    // Cloudy conditions
    if (code >= 2 && code <= 3) return 'cloudy.mp4';
    
    // Rainy conditions
    if (code >= 51 && code <= 67) return 'rainy.mp4';
    if (code >= 80 && code <= 82) return 'rainy.mp4';
    if (code >= 95 && code <= 99) return 'rainy.mp4'; // Thunderstorms
    
    // Default to cloudy for other conditions
    return 'cloudy.mp4';
  };

  const getWeatherDescription = (code) => {
    return weatherCodes[code] || 'Unknown';
  };

  if (loading) return <div className="weather-widget loading">Loading weather...</div>;
  if (error) return <div className="weather-widget error">{error}</div>;

  const currentVideo = weather ? getWeatherVideo(weather.weatherCode) : 'cloudy.mp4';

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
