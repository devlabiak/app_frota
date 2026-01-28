@echo off
cd /d "C:\Users\William\Desktop\App_Frota\App_Frota\App_Frota"
echo Diretório: %cd%
echo.
echo Subindo containers...
docker compose up --build -d
echo.
echo Aguardando inicialização...
timeout /t 30 /nobreak
echo.
docker compose ps
echo.
docker compose logs -f
