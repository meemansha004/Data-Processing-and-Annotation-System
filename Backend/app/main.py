from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import test, annotate, save
from app.routes.preprocessing import router as preprocessing_router
from app.routes.image_preprocessing import router as image_preprocessing_router



app = FastAPI(title="AI Annotation Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(test.router, prefix="/test")
app.include_router(annotate.router, prefix="/annotate")
app.include_router(save.router, prefix="/labels")
app.include_router(preprocessing_router, prefix="/preprocessing")
app.include_router(image_preprocessing_router, prefix="/image-preprocessing")


print("---- REGISTERED ROUTES ----")
for route in app.routes:
    print(route.path, route.methods)
print("---- END ROUTES ----")
