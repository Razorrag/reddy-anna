#!/bin/bash

echo "Starting Reddy Anna Game Backend Server..."
cd backend

echo "Installing dependencies..."
npm install

echo ""
echo "Starting server on port 4001..."
npm start &
SERVER_PID=$!

echo ""
echo "Waiting for server to start..."
sleep 5

echo ""
echo "Opening test page in browser..."
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:4001/test-complete-game-flow.html
elif command -v open > /dev/null; then
    open http://localhost:4001/test-complete-game-flow.html
else
    echo "Could not detect web browser. Please open manually: http://localhost:4001/test-complete-game-flow.html"
fi

echo ""
echo "Opening admin panel in browser..."
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:4001/game-admin.html
elif command -v open > /dev/null; then
    open http://localhost:4001/game-admin.html
else
    echo "Could not detect web browser. Please open manually: http://localhost:4001/game-admin.html"
fi

echo ""
echo "Opening user game page in browser..."
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:4001/start-game.html
elif command -v open > /dev/null; then
    open http://localhost:4001/start-game.html
else
    echo "Could not detect web browser. Please open manually: http://localhost:4001/start-game.html"
fi

echo ""
echo "========================================"
echo "Reddy Anna Game Test Environment Ready!"
echo "========================================"
echo ""
echo "Test Instructions:"
echo "1. Use the test page to verify all game components"
echo "2. Open the admin panel to start and control games"
echo "3. Open the user game page to play as a user"
echo "4. Follow the game flow: Admin selects card -> Starts timer -> Users bet -> Admin deals cards"
echo ""
echo "Press Ctrl+C to stop the server and exit..."

# Wait for user to interrupt
trap "echo ''; echo 'Stopping server...'; kill $SERVER_PID; exit 0" INT
wait $SERVER_PID