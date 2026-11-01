@echo off
title Airspace ACARS - Instalador e Atualizador MSFS
setlocal EnableDelayedExpansion

:: Executa o instalador em PowerShell com politica de execucao Bypass
powershell.exe -NoProfile -ExecutionPolicy Bypass -STA -File "%~dp0Airspace-ACARS-Installer.ps1"

if %errorlevel% neq 0 (
    echo.
    echo Ocorreu um erro ao iniciar o instalador grafico.
    pause
)
