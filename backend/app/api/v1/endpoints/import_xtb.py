import tempfile
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.xtb_importer import import_xtb_file
from app.services.positions_service import rebuild_open_positions

router = APIRouter(prefix="/import", tags=["import"])


@router.post("/xtb")
async def import_xtb(
    file: UploadFile = File(...),
    account_number: str = Form(...),
    currency: str = Form(...),
    db: Session = Depends(get_db),
):
    """
    Importuj plik XTB XLSX.
    currency: PLN | EUR | USD
    """
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(400, "Plik musi być w formacie .xlsx")

    if currency not in ("PLN", "EUR", "USD"):
        raise HTTPException(400, "currency musi być PLN, EUR lub USD")

    # Zapisz plik tymczasowo
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = Path(tmp.name)

    try:
        results = import_xtb_file(db, tmp_path, account_number, currency)
        # Po imporcie przebuduj pozycje
        rebuild_stats = rebuild_open_positions(db)
        results["positions_rebuilt"] = rebuild_stats
        return {"status": "ok", "results": results}
    except Exception as e:
        raise HTTPException(500, f"Błąd importu: {e}")
    finally:
        tmp_path.unlink(missing_ok=True)
