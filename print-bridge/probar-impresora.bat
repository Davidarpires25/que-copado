@echo off
chcp 65001 >nul
:: Manda un ticket de prueba a la impresora y muestra el resultado.
:: Sirve para verificar que la impresora responde, sin depender del sistema.
cd /d "%~dp0"
echo Mandando un ticket de prueba...
echo.
print-bridge-windows.exe --probar
echo.
pause
