# Phone / QR access

Run `START_DINE.bat` and keep the FastAPI and React windows open.

The launcher detects the PC LAN IP and regenerates the 12 QR codes with URLs such as:

`http://192.168.1.8:5173/order/<TABLE_TOKEN>`

## Important change in this build
The phone only connects to the React/Vite server on port **5173**.
All `/api/...` requests use the same origin and Vite proxies them internally on the PC to FastAPI at `127.0.0.1:8000`.

This avoids a separate phone -> port 8000 connection and prevents the previous endless `Loading DINE` problem when port 8000 was blocked.

For local mode, phone and PC must be on the same Wi-Fi/LAN.
