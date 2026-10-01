from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "mysql+pymysql://root:password@localhost:3306/dine_db"
    frontend_origin: str = "http://localhost:5173"
    environment: str = "development"
    tax_rate: float = 0.05
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

@lru_cache
def get_settings() -> Settings:
    return Settings()
