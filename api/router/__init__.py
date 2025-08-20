from fastapi import APIRouter
from .get_illustration import router as get_illustration_router
from .composio_tools import router as composio_tools_router

router = APIRouter()
router.include_router(get_illustration_router)
router.include_router(composio_tools_router)
