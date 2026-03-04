@echo off
chcp 65001 > nul
echo 用户管理工具
echo =====================================

cd /d "%~dp0"

REM 检查Python是否安装
python --version > nul 2>&1
if errorlevel 1 (
    echo 错误：未找到Python，请先安装Python 3.x
    pause
    exit /b 1
)

REM 运行用户管理工具
python user_manager.py

echo.
echo 按任意键继续...
pause > nul
