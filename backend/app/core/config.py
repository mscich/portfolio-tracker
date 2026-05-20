from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql://portfolio:portfolio@localhost:5432/portfolio"

    # App
    APP_NAME: str = "Portfolio Tracker"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # NBP API
    NBP_API_URL: str = "https://api.nbp.pl/api"

    # Price refresh interval (minuty)
    PRICE_REFRESH_INTERVAL: int = 60


settings = Settings()
