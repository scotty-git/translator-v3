async function checkLocalhostAccess() {
  console.log('🔍 Checking localhost accessibility...\n')
  
  try {
    const response = await fetch('http://localhost:5173', {
      signal: AbortSignal.timeout(2000)
    })
    console.log('✅ Localhost is accessible!')
    console.log('🌐 Access your dev server at: http://localhost:5173\n')
    return true
  } catch (error) {
    console.warn('⚠️  Localhost might be blocked!\n')
    console.warn('Common causes:')
    console.warn('1. 🛡️  VPN software (NordVPN, ExpressVPN, etc.)')
    console.warn('2. 🔥 Firewall settings')
    console.warn('3. 🔧 Proxy configurations\n')
    console.warn('Solutions to try:')
    console.warn('• Temporarily disable VPN')
    console.warn('• Access via http://127.0.0.1:5173')
    console.warn('• Use your network IP (find with: ifconfig | grep inet)')
    console.warn('• Check firewall allows port 5173\n')
    return false
  }
}

// Auto-run check
checkLocalhostAccess()