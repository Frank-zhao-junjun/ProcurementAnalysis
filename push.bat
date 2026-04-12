@echo off
cd /d "D:\AI\采购分析驾驶舱"
echo Current directory: %CD%
echo.
echo Git status:
git status --short
echo.
echo Committing changes...
git commit -m "feat(frontend): integrate API data layer with dynamic loading"
echo.
echo Pushing to origin/main...
git push origin main
echo.
echo Done!
pause
