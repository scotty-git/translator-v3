// Test script to verify session contamination fix
// Run this in the browser console to simulate rapid session switching

console.log('🧪 Starting Session Contamination Fix Test...');

// Helper function to simulate session exit/join
async function testRapidSessionSwitching() {
  console.log('\n📋 Test Scenario: Rapid Session Exit/Join');
  console.log('========================================');
  
  // Store original session info if any
  const originalSession = localStorage.getItem('activeSession');
  
  try {
    // Test 1: Create session and immediately exit
    console.log('\n1️⃣ Test 1: Create and immediately exit');
    localStorage.setItem('activeSession', JSON.stringify({
      sessionId: 'test-session-1',
      sessionCode: '1234',
      userId: 'test-user-1',
      role: 'host'
    }));
    
    // Wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate exit
    console.log('   Exiting session...');
    localStorage.removeItem('activeSession');
    
    // Test 2: Join new session immediately
    console.log('\n2️⃣ Test 2: Join new session immediately');
    localStorage.setItem('activeSession', JSON.stringify({
      sessionId: 'test-session-2',
      sessionCode: '5678',
      userId: 'test-user-1',
      role: 'guest'
    }));
    
    // Check for channel leaks
    console.log('\n🔍 Checking for channel leaks...');
    const channels = window.supabase?.getChannels?.() || [];
    console.log(`   Active channels: ${channels.length}`);
    
    channels.forEach((channel, index) => {
      console.log(`   Channel ${index + 1}: ${channel.topic}`);
    });
    
    // Look for old session channels
    const oldSessionChannels = channels.filter(ch => 
      ch.topic.includes('test-session-1') || 
      ch.topic.includes('1234')
    );
    
    if (oldSessionChannels.length > 0) {
      console.error('❌ FAIL: Found leaked channels from old session!');
      oldSessionChannels.forEach(ch => console.error(`   Leaked: ${ch.topic}`));
    } else {
      console.log('✅ PASS: No leaked channels found!');
    }
    
    // Test 3: Check message queue
    console.log('\n3️⃣ Test 3: Check message queue');
    const messageQueue = localStorage.getItem('messageQueue');
    if (messageQueue) {
      const queue = JSON.parse(messageQueue);
      console.log(`   Queued messages: ${queue.length}`);
      if (queue.length > 0) {
        console.warn('⚠️  Warning: Found messages in queue, checking session IDs...');
        queue.forEach(item => {
          console.log(`   Message ${item.id}: session_id = ${item.message.session_id}`);
        });
      }
    } else {
      console.log('✅ Message queue is empty');
    }
    
  } finally {
    // Restore original session if any
    if (originalSession) {
      localStorage.setItem('activeSession', originalSession);
    } else {
      localStorage.removeItem('activeSession');
    }
  }
  
  console.log('\n✅ Test completed!');
  console.log('=====================================\n');
}

// Helper to monitor channel creation
function monitorChannels() {
  console.log('\n📡 Starting channel monitor...');
  console.log('(New channels will be logged as they are created)');
  
  if (!window.supabase) {
    console.error('❌ Supabase not found. Make sure you\'re on the app page.');
    return;
  }
  
  // Store original channel method
  const originalChannel = window.supabase.channel;
  
  // Override with monitoring wrapper
  window.supabase.channel = function(name) {
    console.log(`📡 [Channel Monitor] Creating channel: ${name}`);
    console.trace(); // Show stack trace to see where it's being created
    return originalChannel.call(this, name);
  };
  
  console.log('✅ Channel monitor installed');
}

// Run the test
console.log('Running tests in 2 seconds...');
setTimeout(testRapidSessionSwitching, 2000);

// Optional: Install channel monitor
// monitorChannels();

console.log('\n💡 Tip: To monitor channels in real-time, run: monitorChannels()');