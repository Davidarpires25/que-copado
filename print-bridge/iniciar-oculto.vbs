' Lanza el bridge sin ventana de consola.
'
' El .exe que genera pkg es una aplicacion de consola: ejecutado directo, deja
' una ventana negra abierta todo el dia que cualquiera cierra sin querer. Este
' lanzador lo arranca en segundo plano; el estado se ve en el icono de la
' bandeja y el detalle en print-bridge.log, junto al ejecutable.

Set fso = CreateObject("Scripting.FileSystemObject")
carpeta = fso.GetParentFolderName(WScript.ScriptFullName)
Set shell = CreateObject("WScript.Shell")

' 0 = ventana oculta, False = no esperar a que termine
shell.CurrentDirectory = carpeta
shell.Run """" & carpeta & "\print-bridge-windows.exe""", 0, False
