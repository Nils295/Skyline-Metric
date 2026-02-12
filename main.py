from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI()

# WICHTIG: Erlaubt deinem Firebase-Frontend den Zugriff
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/weather")
def get_weather(lat: float, lon: float, days: int = 1):
    # Die URL zu Open-Meteo
    url = (f"https://api.open-meteo.com/v1/forecast?"
           f"latitude={lat}&longitude={lon}&"
           f"hourly=temperature_2m,rain,precipitation_probability&"
           f"current_weather=true&forecast_days={days}&timezone=auto")
    
    response = requests.get(url)
    return response.json()

# Render braucht diesen Teil nicht zwingend, aber es hilft lokal
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)