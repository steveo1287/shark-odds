from __future__ import annotations

import json
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import FastAPI

app = FastAPI()

SPORTS = [
    {
        "key": "basketball_ncaab",
        "title": "NCAA Men's Basketball",
        "short_title": "NCAAB",
    },
    {
        "key": "basketball_nba",
        "title": "NBA",
        "short_title": "NBA",
    },
    {
        "key": "baseball_mlb",
        "title": "MLB",
        "short_title": "MLB",
    },
    {
        "key": "icehockey_nhl",
        "title": "NHL",
        "short_title": "NHL",
    },
]

BOOKMAKER_PRIORITY = ["draftkings", "fanduel", "betmgm", "caesars"]
ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4/sports"
ODDS_API_MARKETS = "h2h,spreads,totals"
ODDS_API_REGIONS = "us"


def get_api_key() -> str:
    return os.getenv("ODDS_API_KEY", "").strip()


def format_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def serialize_market(market: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not market:
        return []

    outcomes = []
    for outcome in market.get("outcomes", []):
        outcomes.append(
            {
                "name": outcome.get("name"),
                "price": outcome.get("price"),
                "point": outcome.get("point"),
            }
        )
    return outcomes


def choose_bookmaker(bookmakers: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not bookmakers:
        return None

    for preferred_key in BOOKMAKER_PRIORITY:
        for bookmaker in bookmakers:
            if bookmaker.get("key") == preferred_key:
                return bookmaker

    return bookmakers[0]


def normalize_game(game: dict[str, Any]) -> dict[str, Any]:
    bookmakers = game.get("bookmakers", [])
    featured_bookmaker = choose_bookmaker(bookmakers)
    markets_by_key = {
        market.get("key"): market
        for market in (featured_bookmaker or {}).get("markets", [])
    }

    return {
        "id": game.get("id"),
        "commence_time": game.get("commence_time"),
        "home_team": game.get("home_team"),
        "away_team": game.get("away_team"),
        "bookmakers_available": len(bookmakers),
        "featured_bookmaker": (featured_bookmaker or {}).get("title"),
        "markets": {
            "moneyline": serialize_market(markets_by_key.get("h2h")),
            "spread": serialize_market(markets_by_key.get("spreads")),
            "total": serialize_market(markets_by_key.get("totals")),
        },
    }


def fetch_sport_odds(sport: dict[str, str], api_key: str) -> dict[str, Any]:
    params = urlencode(
        {
            "apiKey": api_key,
            "regions": ODDS_API_REGIONS,
            "markets": ODDS_API_MARKETS,
            "oddsFormat": "american",
            "dateFormat": "iso",
        }
    )
    request = Request(
        f"{ODDS_API_BASE_URL}/{sport['key']}/odds?{params}",
        headers={"User-Agent": "Shark Odds/1.0"},
    )

    try:
        with urlopen(request, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="ignore")
        raise RuntimeError(
            f"{sport['title']} odds request failed with {error.code}: {body}"
        ) from error
    except URLError as error:
        raise RuntimeError(
            f"{sport['title']} odds request failed: {error.reason}"
        ) from error

    if not isinstance(payload, list):
        raise RuntimeError(f"{sport['title']} returned an unexpected response.")

    games = sorted(
        (normalize_game(game) for game in payload),
        key=lambda game: game.get("commence_time") or "",
    )

    return {
        "key": sport["key"],
        "title": sport["title"],
        "short_title": sport["short_title"],
        "game_count": len(games),
        "games": games,
    }


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "message": "Shark Odds API is live",
        "odds_board_endpoint": "/api/odds/board",
        "demo_endpoint": "/api/signals/demo",
    }


@app.get("/api/signals/demo")
def demo() -> dict[str, Any]:
    return {"selection": "Bulls +4.5", "edge_pct": 4.12, "ev": 0.078}


@app.get("/api/odds/board")
def odds_board() -> dict[str, Any]:
    api_key = get_api_key()

    if not api_key:
        return {
            "configured": False,
            "generated_at": format_now(),
            "message": "Set ODDS_API_KEY on the backend service to load live odds.",
            "sports": [
                {
                    "key": sport["key"],
                    "title": sport["title"],
                    "short_title": sport["short_title"],
                    "game_count": 0,
                    "games": [],
                }
                for sport in SPORTS
            ],
        }

    sports: list[dict[str, Any]] = []
    errors: list[str] = []

    with ThreadPoolExecutor(max_workers=len(SPORTS)) as executor:
        future_to_sport = {
            executor.submit(fetch_sport_odds, sport, api_key): sport for sport in SPORTS
        }

        for future, sport in future_to_sport.items():
            try:
                sports.append(future.result())
            except Exception as error:
                errors.append(str(error))
                sports.append(
                    {
                        "key": sport["key"],
                        "title": sport["title"],
                        "short_title": sport["short_title"],
                        "game_count": 0,
                        "games": [],
                        "error": str(error),
                    }
                )

    sports.sort(key=lambda item: [sport["key"] for sport in SPORTS].index(item["key"]))

    return {
        "configured": True,
        "generated_at": format_now(),
        "sport_count": len(sports),
        "game_count": sum(sport["game_count"] for sport in sports),
        "errors": errors,
        "sports": sports,
    }
