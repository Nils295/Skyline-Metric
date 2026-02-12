from firebase_functions import https_fn
from firebase_admin import initialize_app
import requests
import datetime
import json

# Initialisierung der Firebase Admin SDK
initialize_app()

@https_fn.on_request()
def weather_backend(req: https_fn.Request) -> https_fn.Response:
    # 1. CORS-HEADER DEFINITION
    # Diese Header erlauben es deinem Frontend, mit dem Backend zu kommunizieren
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    # 2. OPTIONS-METHODE (Preflight)
    # Browser senden erst ein OPTIONS-Request, um zu fragen: "Darf ich?"
    if req.method == "OPTIONS":
        return https_fn.Response(status=204, headers=headers)

    try:
        path = req.path
        
        # ---------------------------------------------------------
        # ENDPUNKT: CURRENT WEATHER
        # ---------------------------------------------------------
        if "/api/weather/current" in path:
            lat = req.args.get("lat")
            lon = req.args.get("lon")
            if not lat or not lon:
                return https_fn.Response("Missing lat/lon", status=400, headers=headers)

            w_res = requests.get("https://api.open-meteo.com/v1/forecast", params={
                "latitude": lat, "longitude": lon,
                "current_weather": True,
                "daily": "temperature_2m_max,temperature_2m_min,uv_index_max,weathercode,sunrise,sunset",
                "hourly": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation",
                "timezone": "auto"
            }).json()
            
            a_res = requests.get("https://air-quality-api.open-meteo.com/v1/air-quality", params={
                "latitude": lat, "longitude": lon,
                "current": "european_aqi,pm2_5",
                "timezone": "auto"
            }).json()

            h = w_res["hourly"]
            d = w_res["daily"]
            curr = w_res["current_weather"]
            current_hour_str = curr["time"][:13] + ":00"
            idx = h["time"].index(current_hour_str) if current_hour_str in h["time"] else 0

            data = {
                "temp": curr["temperature"],
                "feels_like": h["apparent_temperature"][idx],
                "wind": curr["windspeed"],
                "weathercode": curr["weathercode"],
                "uv_index": d["uv_index_max"][0],
                "sunrise": d["sunrise"][0],
                "sunset": d["sunset"][0],
                "rhum": h["relative_humidity_2m"][idx],
                "prcp": h["precipitation"][idx], 
                "aqi": a_res["current"]["european_aqi"],
                "pm25": a_res["current"]["pm2_5"],
                "rain_forecast": [{"time": h["time"][i].split("T")[1], "prob": h["precipitation_probability"][i]} for i in range(idx, min(idx+12, len(h["time"])))],
                "forecast": [{"date": d["time"][i], "temp_max": d["temperature_2m_max"][i], "temp_min": d["temperature_2m_min"][i], "code": d["weathercode"][i]} for i in range(1, 6)]
            }
            return https_fn.Response(json.dumps(data), mimetype="application/json", headers=headers)

        # ---------------------------------------------------------
        # ENDPUNKT: CHART (EINZELSTADT)
        # ---------------------------------------------------------
        elif "/api/weather/chart" in path:
            lat = req.args.get("lat")
            lon = req.args.get("lon")
            days = int(req.args.get("days", 7))
            
            params = {"latitude": lat, "longitude": lon, "hourly": "temperature_2m", "timezone": "auto"}
            if days > 7:
                params["past_days"] = 31
                params["forecast_days"] = 1
            else:
                params["forecast_days"] = 7

            r = requests.get("https://api.open-meteo.com/v1/forecast", params=params).json()
            series = [{"ts": int(datetime.datetime.fromisoformat(t).timestamp()), "temp": v} for t, v in zip(r["hourly"]["time"], r["hourly"]["temperature_2m"])]
            return https_fn.Response(json.dumps({"series": series}), mimetype="application/json", headers=headers)

        # ---------------------------------------------------------
        # ENDPUNKT: COMPARE (ZWEI STÄDTE)
        # ---------------------------------------------------------
        elif "/api/weather/compare" in path:
            lat1 = req.args.get("lat1")
            lon1 = req.args.get("lon1")
            lat2 = req.args.get("lat2")
            lon2 = req.args.get("lon2")
            name1 = req.args.get("name1", "Stadt 1")
            name2 = req.args.get("name2", "Stadt 2")
            days = int(req.args.get("days", 7)) # Akzeptiert jetzt auch 30 Tage

            def fetch_data(l_lat, l_lon, d):
                p = {"latitude": l_lat, "longitude": l_lon, "hourly": "temperature_2m", "timezone": "auto"}
                if d > 7:
                    p["past_days"] = 31
                    p["forecast_days"] = 1
                else:
                    p["forecast_days"] = 7
                res = requests.get("https://api.open-meteo.com/v1/forecast", params=p).json()
                return [{"ts": int(datetime.datetime.fromisoformat(t).timestamp()), "temp": v} for t, v in zip(res["hourly"]["time"], res["hourly"]["temperature_2m"])]

            data = {
                "city1": {"name": name1, "series": fetch_data(lat1, lon1, days)},
                "city2": {"name": name2, "series": fetch_data(lat2, lon2, days)}
            }
            return https_fn.Response(json.dumps(data), mimetype="application/json", headers=headers)

        return https_fn.Response("Not Found", status=404, headers=headers)

    except Exception as e:
        return https_fn.Response(json.dumps({"error": str(e)}), status=500, mimetype="application/json", headers=headers)