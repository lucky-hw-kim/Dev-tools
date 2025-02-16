import React, { useState, useEffect } from "react";
import styled from "styled-components";
import axios from "axios";
import WeatherInfoComponent from "./WeatherInfoComponent";

// styled.____ represents the styled components that are rendered below
const WeatherCondition = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
`;
const Condition = styled.span`
  display: flex;
  text-align:center;
  justify-content: center;
  flex-direction: column;
  font-size: 16px;
  padding-top: 10px;
  padding-bottom: 17px;
  & span {
    color: #3f4042;
    margin-top: 7px;
    font-weight: 600;
    font-size: 27px;
  }
`;
const WeatherIcon = styled.img`
  align-self: center;
  width: 73px;
  margin-top: 5px;
  margin-bottom: 6px;
  text-align:center;
`;
const Location = styled.span`
  font-size: 14px;
  padding-bottom: 6px;
  text-align:center;
`;
const WeatherInfoBlock = styled.div`
  display: flex;

`;
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: left;
  padding: 20px 30px 10px 30px;
  border-radius: 4px;
  background-color: white;
  line-height: 13px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 16px;
  box-shadow: 0px 5px 7px -4px black;
  backdrop-filter: blur(5.8px);
  -webkit-backdrop-filter: blur(5.8px);
  border: 1px solid rgba(255, 255, 255, 0.22);
`;

//icons that will be rendered depenending on the weather 
export const WeatherInfoIcons = {
  sunset: "/icons/temp.svg",
  sunrise: "/icons/temp.svg",
  humidity: "/icons/humidity.svg",
  wind: "/icons/wind.svg",
  pressure: "/icons/pressure.svg",
};
export const DynamicWeatherIcons = {
  "01d": "/icons/sunny.png",
  "01n": "/icons/night.svg",
  "02d": "/icons/day.svg",
  "02n": "/icons/cloudy-night.svg",
  "03d": "/icons/cloudy.svg",
  "03n": "/icons/cloudy.svg",
  "04d": "/icons/perfect-day.svg",
  "04n": "/icons/cloudy-night.svg",
  "09d": "/icons/rain.svg",
  "09n": "/icons/rain-night.svg",
  "10d": "/icons/rain.svg",
  "10n": "/icons/rain-night.svg",
  "11d": "/icons/storm.svg",
  "11n": "/icons/storm.svg",
};


function Weather() {
  const [weather, setWeather] = useState();

  //check to see if the time is either day or not from the API data
  const day = weather?.weather[0].icon.includes("d");
  //fn that converts the timestamp from the data to 00:00
  function timeConverter(timestamp) {
    return `${new Date(timestamp * 1000).getHours()}:${new Date(
      timestamp * 1000
    ).getMinutes()}`;
  }
  //on render, the geolocation API fetches user's current location then passes that data to the weather api for up-to-date weather of the user's current location
  useEffect(() => {
    axios.get(`https://geolocation-db.com/json/${process.env.REACT_APP_GEOLOCATION}`).then((result) => {
      const fetchWeatherData = async () => {
        const response = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=${result.data.city}&APPID=${process.env.REACT_APP_WEATHER}&units=metric`
        );
        setWeather(response.data);
      };
      fetchWeatherData();
    })
  }, []);

  return (
    <>
      <Container>
        <Location>
          { weather && `${weather.name}` }
          <Condition>
            <span> { weather && `${Math.ceil(weather.main.temp)}°C` }</span>
          </Condition>
        </Location>
        <WeatherIcon src={ DynamicWeatherIcons[weather?.weather[0].icon] } />
        <Condition>
          {/* {weather && ` ${weather.weather[0].description}`} */ }
        </Condition>
        <WeatherCondition>
          <WeatherInfoBlock>
            <WeatherInfoComponent
              value={ `${timeConverter(
                weather?.sys[day ? "sunset" : "sunrise"]
              )}` }
              name={ day ? "sunset" : "sunrise" }
            />
          </WeatherInfoBlock>
        </WeatherCondition>
      </Container>
    </>
  );
}

export default Weather;
