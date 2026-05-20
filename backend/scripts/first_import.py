#!/usr/bin/env python3
"""
Skrypt do pierwszego importu danych z plików XTB.
Użycie: python scripts/first_import.py /ścieżka/do/plików/xlsx/

Oczekuje w katalogu pliki: PLN_*.xlsx, EUR_*.xlsx, USD_*.xlsx
"""
import sys
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s"
)

from app.db.session import SessionLocal
from app.services.xtb_importer import import_all_accounts
from app.services.positions_service import rebuild_open_positions


def main():
    if len(sys.argv) < 2:
        print("Użycie: python scripts/first_import.py /ścieżka/do/xlsx/")
        sys.exit(1)

    data_dir = Path(sys.argv[1])
    if not data_dir.exists():
        print(f"Katalog nie istnieje: {data_dir}")
        sys.exit(1)

    db = SessionLocal()
    try:
        print("=" * 50)
        print("IMPORT DANYCH XTB")
        print("=" * 50)

        results = import_all_accounts(db, data_dir)
        for r in results:
            print(f"\n✓ Konto {r['account']} ({r['currency']})")
            if "cash_operations" in r:
                co = r["cash_operations"]
                print(f"  Transakcje: {co['transactions']}, Dywidendy: {co['dividends']}, "
                      f"Pominięte: {co['skipped']}, Błędy: {co['errors']}")
            if "closed_positions" in r:
                cp = r["closed_positions"]
                print(f"  Zamknięte pozycje: {cp['closed']}, Błędy: {cp['errors']}")

        print("\n" + "=" * 50)
        print("REBUILD OPEN POSITIONS")
        print("=" * 50)

        stats = rebuild_open_positions(db)
        print(f"Utworzone pozycje: {stats['created']}, Pominięte (qty=0): {stats['skipped']}")

        print("\n✅ Import zakończony pomyślnie!")

    except Exception as e:
        print(f"\n❌ Błąd: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
