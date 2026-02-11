from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/weather/current")
async def get_current(lat: float, lon: float):
    # 1. API-URLs
    weather_url = "https://api.open-meteo.com/v1/forecast"
    air_url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    
    # 2. Parameter (jetzt inklusive 'precipitation' für die Weather Card)
    w_params = {
        "latitude": lat,
        "longitude": lon,
        "current_weather": True,
        "daily": "temperature_2m_max,temperature_2m_min,uv_index_max,weathercode,sunrise,sunset",
        "hourly": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation",
        "timezone": "auto"
    }
    
    a_params = {
        "latitude": lat,
        "longitude": lon,
        "current": "european_aqi,pm2_5",
        "timezone": "auto"
    }

    try:
        w_res = requests.get(weather_url, params=w_params).json()
        a_res = requests.get(air_url, params=a_params).json()

        curr = w_res["current_weather"]
        h = w_res["hourly"]
        d = w_res["daily"]
        aqi_data = a_res["current"]

        # --- FIX: ZEIT-INDEX FINDEN (Ab Jetzt) ---
        # Wir normalisieren auf die volle Stunde, damit .index() den Treffer landet
        current_hour_str = curr["time"][:13] + ":00"
        
        try:
            start_index = h["time"].index(current_hour_str)
        except ValueError:
            start_index = 0

        # Regen-Vorschau für die Rain-Card (nächste 12h)
        rain_forecast = []
        for i in range(start_index, start_index + 12):
            if i < len(h["time"]):
                time_val = h["time"][i].split("T")[1] 
                rain_forecast.append({
                    "time": time_val,
                    "prob": h["precipitation_probability"][i]
                })

        # 4. Rückgabe an das Frontend
        return {
            "temp": curr["temperature"],
            "feels_like": h["apparent_temperature"][start_index],
            "wind": curr["windspeed"],
            "weathercode": curr["weathercode"],
            "uv_index": d["uv_index_max"][0],
            "sunrise": d["sunrise"][0],
            "sunset": d["sunset"][0],
            "rhum": h["relative_humidity_2m"][start_index],
            # HIER IST DER FIX: Regenmenge für weatherCard.js hinzufügen
            "prcp": h["precipitation"][start_index], 
            "aqi": aqi_data["european_aqi"],
            "pm25": aqi_data["pm2_5"],
            "rain_forecast": rain_forecast,
            "forecast": [
                {
                    "date": d["time"][i], 
                    "temp_max": d["temperature_2m_max"][i], 
                    "temp_min": d["temperature_2m_min"][i], 
                    "code": d["weathercode"][i]
                } for i in range(1, 6)
            ]
        }

    except Exception as e:
        print(f"Fehler im Backend: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/weather/chart")
async def get_chart(lat: float, lon: float, days: int = 7):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat, "longitude": lon,
        "hourly": "temperature_2m",
        "past_days": days if days > 7 else 0,
        "forecast_days": 7,
        "timezone": "auto"
    }
    r = requests.get(url, params=params).json()
    h = r["hourly"]
    
    series = []
    for i in range(len(h["time"])):
        # ISO-String in Unix-Timestamp umwandeln für chart.js
        dt = datetime.datetime.fromisoformat(h["time"][i])
        series.append({
            "ts": int(dt.timestamp()), 
            "temp": h["temperature_2m"][i]
        })
    return {"series": series}

@app.get("/api/weather/compare")
async def compare_weather(lat1: float, lon1: float, name1: str, lat2: float, lon2: float, name2: str):
    url = "https://api.open-meteo.com/v1/forecast"
    
    def get_city_data(lat, lon):
        params = {
            "latitude": lat, "longitude": lon,
            "hourly": "temperature_2m",
            "timezone": "auto",
            "forecast_days": 7
        }
        res = requests.get(url, params=params).json()
        return [
            {"ts": int(datetime.datetime.fromisoformat(t).timestamp()), "temp": temp}
            for t, temp in zip(res["hourly"]["time"], res["hourly"]["temperature_2m"])
        ]

    try:
        return {
            "city1": {"name": name1, "series": get_city_data(lat1, lon1)},
            "city2": {"name": name2, "series": get_city_data(lat2, lon2)}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))