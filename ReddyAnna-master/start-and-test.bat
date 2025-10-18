@echo off
echo Starting Reddy Anna Game Backend Server...
cd backend
echo Installing dependencies...
call npm install
echo.
echo Starting server on port 4001...
start "Backend Server" cmd /k "npm start"
echo.
echo Waiting for server to start...
timeout /t 5 /nobreak > nul
echo.
echo Opening test page in browser...
start http://localhost:4001/test-complete-game-flow.html
echo.
echo Opening admin panel in browser...
start http://localhost:4001/game-admin.html
echo.
echo Opening user game page in browser...
start http://localhost:4001/start-game.html
echo.
echo ========================================
echo Reddy Anna Game Test Environment Ready!
echo ========================================
echo.
echo Test Instructions:
echo 1. Use the test page to verify all game components
echo 2. Open the admin panel to start and control games
echo 3. Open the user game page to play as a user
echo 4. Follow the game flow: Admin selects card -> Starts timer -> Users bet -> Admin deals cards
echo.
echo Press any key to exit...
pause > nul