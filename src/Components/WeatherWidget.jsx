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
  const [hourlyForecast, setHourlyForecast] = useState([]);
  const [showHourly, setShowHourly] = useState(false);

  // Vijayawada coordinates
  const latitude = 16.5062;
  const longitude = 80.6480;
  const timezone = 'Asia/Kolkata';

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const [currentResponse, forecastResponse, hourlyResponse] = await Promise.all([
          // Current weather
          axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=${timezone}`
          ),
          // 7-day forecast
          axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=${timezone}`
          ),
          // Hourly forecast for next 24 hours
          axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,weathercode,precipitation_probability&timezone=${timezone}&forecast_days=2`
          )
        ]);
        
        const current = currentResponse.data.current_weather;
        const daily = forecastResponse.data.daily;
        
        // Process forecast data
        const forecastData = daily.time.map((date, index) => ({
          date: new Date(date).toLocaleDateString('en-IN', { weekday: 'short' }),
          maxTemp: Math.round(daily.temperature_2m_max[index]),
          minTemp: Math.round(daily.temperature_2m_min[index]),
          weatherCode: daily.weathercode[index],
          precipitation: daily.precipitation_sum[index],
          windSpeed: daily.windspeed_10m_max[index]
        }));

        const weatherData = {
          temperature: current.temperature,
          weatherCode: current.weathercode,
          windSpeed: current.windspeed,
          time: new Date(current.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          isDay: current.is_day === 1
        };
        
        // Process hourly data
        const now = new Date();
        const currentHour = now.getHours();
        const hourlyData = [];
        
        // Get next 24 hours of data
        for (let i = 0; i < 24; i++) {
          const hourIndex = currentHour + i;
          const hourTime = new Date();
          hourTime.setHours(currentHour + i, 0, 0, 0);
          const formattedHour = hourTime.toLocaleTimeString('en-IN', { hour: '2-digit', hour12: true });
          
          hourlyData.push({
            time: formattedHour,
            temp: Math.round(hourlyResponse.data.hourly.temperature_2m[hourIndex]),
            code: hourlyResponse.data.hourly.weathercode[hourIndex],
            precipitation: hourlyResponse.data.hourly.precipitation_probability[hourIndex]
          });
        }

        setWeather(weatherData);
        setForecast(forecastData.slice(0, 7));
        setHourlyForecast(hourlyData);
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
        setLoading(false);
      } catch (err) {
        console.error('Error fetching weather data:', err);
        setError('Weather data temporarily unavailable');
        setLoading(false);
      }
    };

    fetchWeather();
    // Update weather every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [latitude, longitude]);

  const getWeatherIcon = (code, isDay = true) => {
    // Clear
    if (code === 0) return isDay ? '☀️' : '🌙';
    // Partly cloudy
    if (code <= 2) return isDay ? '⛅' : '☁️';
    // Cloudy
    if (code === 3) return '☁️';
    // Fog
    if (code <= 49) return '🌫️';
    // Rain
    if (code <= 67) return '🌧️';
    // Snow
    if (code <= 77) return '❄️';
    // Rain showers
    if (code <= 82) return '🌦️';
    // Snow showers
    if (code <= 86) return '🌨️';
    // Thunderstorm
    if (code <= 99) return '⛈️';
    return '🌤️';
  };

  const getWeatherEffect = (code) => {
    if (code >= 51 && code <= 67) return 'rain';
    if (code >= 71 && code <= 77) return 'snow';
    if (code >= 80 && code <= 82) return 'rain';
    if (code >= 85 && code <= 86) return 'snow';
    if (code >= 95 && code <= 99) return 'thunder';
    return '';
  };

  const getTimeOfDay = (timeString) => {
    const hour = parseInt(timeString.split(':')[0], 10);
    const isPM = timeString.toLowerCase().includes('pm');
    const hour24 = isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
    
    if (hour24 >= 5 && hour24 < 12) return 'morning';
    if (hour24 >= 12 && hour24 < 17) return 'afternoon';
    if (hour24 >= 17 && hour24 < 21) return 'evening';
    return 'night';
  };

  const getForecastDescription = (hour) => {
    const timeOfDay = getTimeOfDay(hour.time);
    const conditions = [];
    
    // Add time of day
    conditions.push(`In the ${timeOfDay} (${hour.time})`);
    
    // Add temperature
    conditions.push(`temperature around ${hour.temp}°C`);
    
    // Add weather condition
    const condition = weatherCodes[hour.code] || 'clear skies';
    conditions.push(condition.toLowerCase());
    
    // Add precipitation if significant
    if (hour.precipitation > 20) {
      conditions.push(`with ${hour.precipitation}% chance of rain`);
    }
    
    // Join with commas and 'and' for the last item
    let description = conditions.join(', ');
    const lastComma = description.lastIndexOf(',');
    if (lastComma !== -1) {
      description = description.substring(0, lastComma) + ', and' + description.substring(lastComma + 1);
    }
    
    return description + '.';
  };

  if (loading) return <div className="weather-widget loading">Loading weather...</div>;
  if (error) return <div className="weather-widget error">{error}</div>;

  const currentEffect = weather ? getWeatherEffect(weather.weatherCode) : '';
  
  const toggleHourlyView = () => {
    setShowHourly(!showHourly);
  };

  return (
    <div className={`weather-widget ${currentEffect}`}>
      {currentEffect === 'rain' && <div className="weather-effect rain"></div>}
      {currentEffect === 'snow' && <div className="weather-effect snow"></div>}
      {currentEffect === 'thunder' && <div className="weather-effect thunder"></div>}
      
      <div className="weather-header">
        <h3>Vijayawada Weather</h3>
        <span className="last-updated">Updated: {lastUpdated}</span>
      </div>
      
      {weather && (
        <>
          <div className="current-weather">
            <div className="weather-main">
              <div className="temperature">
                {Math.round(weather.temperature)}°C
                <div className="weather-description">
                  {weather.weatherDescription}
                </div>
              </div>
              <div className="weather-icon">
                <span className="weather-emoji">{getWeatherIcon(weather.weatherCode, weather.isDay)}</span>
              </div>
            </div>
            <div className="weather-details">
              <div className="weather-detail">
                <span className="label">Condition:</span>
                <span className="value">{weather.weatherDescription}</span>
              </div>
              <div className="weather-detail">
                <span className="label">Wind:</span>
                <span className="value">{weather.windSpeed} km/h</span>
              </div>
            </div>
          </div>
          
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
              {forecast.map((day, index) => (
                <div key={index} className="forecast-day">
                  <div className="day">{day.date}</div>
                  <div className="forecast-icon">
                    {getWeatherIcon(day.weatherCode, true)}
                  </div>
                  <div className="forecast-temp">
                    <span className="max-temp">{day.maxTemp}°</span>
                    <span className="min-temp">{day.minTemp}°</span>
                  </div>
                  {day.precipitation > 0 && (
                    <div className="precipitation">
                      💧 {day.precipitation}mm
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="hourly-forecast">
              <div className="hourly-scroll">
                {hourlyForecast.map((hour, index) => (
                  <div className="hourly-item">
                    <div className="hourly-time">
                      <div className="hour">{hour.time}</div>
                      <div className="hourly-weather">
                        <span className="hourly-icon">
                          {getWeatherIcon(hour.code, new Date().getHours() + index < 20 && new Date().getHours() + index > 5)}
                        </span>
                        <span className="hourly-temp">{hour.temp}°</span>
                      </div>
                      {hour.precipitation > 0 && (
                        <div className="hourly-precipitation">
                          <span>💧 {hour.precipitation}%</span>
                        </div>
                      )}
                    </div>
                    <div className="hourly-description">
                      {getForecastDescription(hour)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WeatherWidget;
