from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Shark Odds API is live"}

@app.get("/api/signals/demo")
def demo():
    return {
        "selection": "Bulls +4.5",
        "edge_pct": 4.12,
        "ev": 0.078
    }
