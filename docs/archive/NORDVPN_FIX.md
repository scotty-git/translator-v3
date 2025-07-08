# NordVPN Configuration for Local Development

## Option 1: Split Tunneling (Recommended)
1. Open NordVPN app
2. Go to **Preferences/Settings** → **Split Tunneling**
3. Enable Split Tunneling
4. Add these to the **bypass list**:
   - Your terminal app (Terminal.app or iTerm2)
   - Your browser (Chrome, Safari, Firefox)
   - VS Code (if using)
   - Add specific ports: 5173, 3000, 8080

## Option 2: Allowlist Local Network
1. Open NordVPN app
2. Go to **Preferences** → **Connection**
3. Find **Local Network Discovery** or **LAN Discovery**
4. Enable "Allow access to local network when connected"
5. This allows connections to 192.168.x.x and localhost

## Option 3: Disable Threat Protection
1. In NordVPN settings
2. Go to **Threat Protection**
3. Temporarily disable it (it sometimes blocks local connections)

## Option 4: Temporary Disconnect
1. Simply disconnect from VPN when developing locally
2. Use the quick connect/disconnect in menu bar

## Quick Test Commands
After making changes, test with:
```bash
# Kill any existing servers
pkill -f vite

# Start fresh
npm run dev

# Test connections
curl http://localhost:5173
curl http://127.0.0.1:5173
curl http://192.168.1.45:5173
```

## If Still Blocked
Try adding these to your /etc/hosts file:
```
127.0.0.1 localhost
::1 localhost
```