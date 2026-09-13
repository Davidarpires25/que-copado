@echo off
:: Abre el registro del bridge en el Bloc de notas.
cd /d "%~dp0"
if exist "print-bridge.log" (
  notepad print-bridge.log
) else (
  echo Todavia no hay registro: el bridge no arranco ninguna vez en esta carpeta.
  pause
)
