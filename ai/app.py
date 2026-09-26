import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from common.config import settings
from common.logger import logger
from drowsiness.routes import router as drowsiness_router
from traffic_sign.routes import router as traffic_sign_router
from traffic_sign.model_loader import model_registry

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application Lifespan Context Manager.
    Loads AI models into memory once at startup.
    """
    logger.info("Initializing SafeWay-AI Microservice Startup...")
    # Load model ONCE at startup
    model_registry.load_model()
    yield
    logger.info("Shutting down SafeWay-AI Microservice...")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="SafeWay-AI Computer Vision & AI Inference Service",
    lifespan=lifespan
)

# CORS middleware for cross-origin backend calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Module Routers
app.include_router(drowsiness_router)
app.include_router(traffic_sign_router)

@app.get("/")
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "online",
        "model_loaded": model_registry.is_loaded,
        "docs_url": "/docs"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "environment": settings.ENV,
        "model_loaded": model_registry.is_loaded,
        "endpoints": [
            "/predict/drowsiness",
            "/predict/traffic-sign"
        ]
    }

if __name__ == "__main__":
    logger.info(f"Starting {settings.APP_NAME} server on {settings.HOST}:{settings.PORT}")
    uvicorn.run(
        "app:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False
    )
