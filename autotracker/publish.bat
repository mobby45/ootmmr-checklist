@echo off
taskkill /f /im autotracker.exe 2>nul
dotnet publish -c Release -r win-x86 --self-contained true /p:PublishSingleFile=true --nologo -o publish
copy /y publish\autotracker.exe ..\public\autotracker.exe
copy /y publish\autotracker.pdb ..\public\autotracker.pdb
copy /y D:\Autre\ROMN64\ootmmr-checklist\autotracker\pjmembridge\pjmembridge.dll ..\public\pjmembridge.dll
echo Done.
