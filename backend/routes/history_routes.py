from fastapi import APIRouter
from services.db_service import get_all_history, delete_history_item, clear_all_history

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("")
async def list_history():
    return {"items": get_all_history()}


@router.delete("/{item_type}/{item_id}")
async def delete_item(item_type: str, item_id: int):
    success = delete_history_item(item_type, item_id)
    if not success:
        return {"success": False, "message": "History item not found or could not be deleted"}
    return {"success": True}


@router.post("/clear-all")
async def clear_history():
    success = clear_all_history()
    if not success:
        return {"success": False, "message": "Could not clear history database"}
    return {"success": True}
