# Portfolio Tracker

Aplikacja do śledzenia portfela inwestycyjnego — import z XTB, dywidendy, pozycje, benchmarki.

## Stack
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Frontend**: Next.js + Tailwind + Recharts
- **Deploy**: Docker Compose na Proxmox, CI/CD przez GitHub Actions

---

## Pierwsze uruchomienie (lokalnie / Proxmox)

### 1. Sklonuj repo i skonfiguruj env
```bash
git clone https://github.com/TWÓJ_USER/portfolio-tracker
cd portfolio-tracker
cp .env.example .env
# Edytuj .env — uzupełnij DATABASE_URL i SECRET_KEY
```

### 2. Utwórz bazę danych (jeśli jeszcze nie masz)
```sql
CREATE USER portfolio WITH PASSWORD 'twoje_haslo';
CREATE DATABASE portfolio OWNER portfolio;
```

### 3. Uruchom kontener backendu
```bash
docker compose up -d backend
```

### 4. Uruchom migracje
```bash
docker compose exec backend alembic upgrade head
```

### 5. Zaimportuj dane z XTB
```bash
# Skopiuj pliki xlsx do katalogu data/
mkdir -p data
cp /ścieżka/do/PLN_2017627_*.xlsx data/
cp /ścieżka/do/EUR_51065213_*.xlsx data/
cp /ścieżka/do/USD_53780201_*.xlsx data/

# Uruchom importer
docker compose exec backend python scripts/first_import.py /app/data/
```

### 6. Uruchom cały stack
```bash
docker compose up -d
```

Aplikacja dostępna na `http://localhost` (nginx) lub `http://localhost:3000` (frontend bezpośrednio).

---

## GitHub Actions — konfiguracja

W Settings → Secrets → Actions dodaj:
| Secret | Wartość |
|--------|---------|
| `SSH_HOST` | IP lub hostname Proxmox VM |
| `SSH_USER` | użytkownik SSH (np. `deploy`) |
| `SSH_PRIVATE_KEY` | prywatny klucz SSH (bez hasła) |
| `SSH_PORT` | port SSH (domyślnie 22) |

### Przygotowanie Proxmox VM

```bash
# Na VM z Ubuntu 24.04:
apt install docker.io docker-compose-plugin git

# Utwórz użytkownika deploy
useradd -m -s /bin/bash deploy
usermod -aG docker deploy

# Dodaj klucz SSH GitHub Actions
su - deploy
mkdir -p ~/.ssh
echo "PUBLICZNY_KLUCZ" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Sklonuj repo
cd /opt
git clone https://github.com/TWÓJ_USER/portfolio-tracker
chown -R deploy:deploy portfolio-tracker
```

---

## API Endpoints

| Endpoint | Opis |
|----------|------|
| `GET /api/v1/dividends/summary/yearly` | Dywidendy per rok (brutto/podatek/netto) |
| `GET /api/v1/dividends/summary/by-ticker` | Dywidendy per ticker per rok |
| `GET /api/v1/dividends/summary/monthly?year=2025` | Dywidendy per miesiąc |
| `GET /api/v1/positions/open` | Otwarte pozycje z aktualną wartością |
| `POST /api/v1/positions/rebuild` | Przebuduj pozycje z transakcji |
| `POST /api/v1/import/xtb` | Import pliku XTB XLSX |
| `GET /docs` | Swagger UI |

---

## Struktura projektu
```
portfolio-tracker/
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy models
│   │   ├── api/v1/          # FastAPI endpoints
│   │   ├── services/        # Logika biznesowa
│   │   │   ├── xtb_importer.py    # Import z XTB XLSX
│   │   │   ├── fx_service.py      # Kursy NBP
│   │   │   ├── positions_service.py
│   │   │   └── dividend_service.py
│   │   ├── core/config.py   # Ustawienia
│   │   └── db/session.py    # Połączenie z bazą
│   ├── alembic/             # Migracje
│   ├── scripts/
│   │   └── first_import.py  # Jednorazowy import danych
│   └── Dockerfile
├── frontend/                # Next.js (do zbudowania)
├── .github/workflows/
│   └── deploy.yml           # CI/CD pipeline
├── docker-compose.yml
├── nginx.conf
└── .env.example
```
