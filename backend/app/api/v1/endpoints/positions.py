from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.positions_service import get_positions_summary, rebuild_open_positions

router = APIRouter(prefix="/positions", tags=["positions"])


@router.get("/open")
def open_positions(db: Session = Depends(get_db)):
    """Lista wszystkich otwartych pozycji z aktualną wartością i P&L."""
    return get_positions_summary(db)


@router.post("/rebuild")
def rebuild_positions(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Przebuduj otwarte pozycje z historii transakcji (po imporcie)."""
    stats = rebuild_open_positions(db)
    return {"status": "ok", "stats": stats}
