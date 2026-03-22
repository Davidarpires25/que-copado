@echo off
echo Instalando Print Bridge como tarea de inicio automatico...

:: Obtiene la ruta donde esta este .bat (junto al .exe)
set DIR=%~dp0

:: Crea una tarea programada que corre el exe al iniciar sesion
schtasks /create /tn "QueCopado-PrintBridge" /tr "%DIR%print-bridge-windows.exe" /sc onlogon /ru "%USERNAME%" /f

echo.
echo Listo! El Print Bridge va a arrancar automaticamente al iniciar Windows.
echo Para probarlo ahora, ejecuta: print-bridge-windows.exe
pause
