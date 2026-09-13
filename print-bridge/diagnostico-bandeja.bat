@echo off
chcp 65001 >nul
:: Arranca el bridge con la consola VISIBLE y el diagnostico propio encendido.
:: Sirve para ver por que el icono no cambia de color o el menu no responde.
:: No usar en el local: es solo para depurar.
cd /d "%~dp0"
set BRIDGE_DEBUG=1
echo Corriendo con diagnostico. Proba el menu del icono ahora.
echo Cerra esta ventana con Ctrl+C cuando termines.
echo.
print-bridge-windows.exe
pause
