# """FastAPI application factory — wires CORS, middleware, and routers."""
# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware

# from app.api.v1.router import api_router
# from app.config.settings import get_settings
# from app.middleware.logging import LoggingMiddleware

# settings = get_settings()


# def create_app() -> FastAPI:
#     app = FastAPI(title="Aria API", version="1.0.0")
#     print("CORS ORIGINS:", settings.cors_origins) 
#     # app.add_middleware(
#     #     CORSMiddleware,
#     #     allow_origins=settings.cors_origins,
#     #     allow_credentials=False,
#     #     allow_methods=["*"],
#     #     allow_headers=["*"],
#     # )

#     app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=False,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
#     app.add_middleware(LoggingMiddleware)

#     app.include_router(api_router, prefix="/api")

#     @app.get("/health")
#     async def health():
#         return {"status": "ok"}

#     return app
"""FastAPI application factory — wires CORS, middleware, and routers."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.config.settings import get_settings
from app.middleware.logging import LoggingMiddleware

settings = get_settings()

STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage"


def create_app() -> FastAPI:
    app = FastAPI(title="Aria API", version="1.0.0")
    print("CORS ORIGINS:", settings.cors_origins) 
    # app.add_middleware(
    #     CORSMiddleware,
    #     allow_origins=settings.cors_origins,
    #     allow_credentials=False,
    #     allow_methods=["*"],
    #     allow_headers=["*"],
    # )

    app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
    app.add_middleware(LoggingMiddleware)

    app.include_router(api_router, prefix="/api")

    app.mount("/static", StaticFiles(directory=STORAGE_DIR), name="static")

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app