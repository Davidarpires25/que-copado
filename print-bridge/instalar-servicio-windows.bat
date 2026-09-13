@echo off
echo ============================================
echo   Que Copado - Instalador del Print Bridge
echo ============================================
echo.

set DIR=%~dp0

:: Windows marca los archivos copiados desde otra PC o descargados como "de
:: Internet" y pide confirmacion cada vez que se ejecutan. Eso impide que el
:: bridge arranque solo. Se limpia esa marca.
powershell -NoProfile -Command "Get-ChildItem -Path '%DIR%' -Recurse | Unblock-File" 2>nul

if not exist "%DIR%print-bridge-windows.exe" (
  echo ERROR: falta print-bridge-windows.exe en esta carpeta.
  pause
  exit /b 1
)

if not exist "%DIR%configuracion.txt" if not exist "%DIR%.env" (
  echo ERROR: falta configuracion.txt en esta carpeta.
  echo Renombra configuracion-ejemplo.txt a configuracion.txt y completa los datos.
  pause
  exit /b 1
)

:: Se programa el .vbs y no el .exe: el .vbs lo arranca sin ventana de consola.
schtasks /create /tn "QueCopado-PrintBridge" /tr "wscript.exe \"%DIR%iniciar-oculto.vbs\"" /sc onlogon /ru "%USERNAME%" /f

echo.
echo Listo. El Print Bridge arranca solo al iniciar Windows, sin ventana.
echo.
echo   - El icono aparece en la bandeja, al lado del reloj.
echo   - Boton derecho sobre el icono: "Imprimir prueba" y "Ver registro".
echo   - Si algo falla, el detalle queda en print-bridge.log, en esta carpeta.
echo.
echo Para arrancarlo ahora sin reiniciar, doble clic en iniciar-oculto.vbs
echo.
echo Para probar la impresora:  probar-impresora.bat
echo Para ver que paso:         ver-registro.bat
pause
