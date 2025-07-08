#!/bin/bash

echo "Adding localhost to proxy bypass list..."
sudo networksetup -setproxybypassdomains Wi-Fi "*.local" "169.254/16" "localhost" "127.0.0.1" "::1" "[::1]"

echo "Current proxy bypass list:"
networksetup -getproxybypassdomains Wi-Fi

echo "Done! Please restart your browser and try accessing http://localhost:5173"