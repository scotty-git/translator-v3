# Phase 5 Manual Testing Checklist

## ✅ CRITICAL TEST REQUIREMENTS

**Before deployment, all items in this checklist must be verified to work correctly.**

## 🔧 Setup Requirements

1. **Development Server**
   - [ ] Dev server runs on http://127.0.0.1:5173
   - [ ] No console errors on page load
   - [ ] All environment variables loaded (check .env.local)

2. **Database Connection**
   - [ ] Supabase connection established
   - [ ] All required tables exist (sessions, messages, user_activity)
   - [ ] Real-time subscriptions working

## 📱 Core Message System Tests

### MessageQueue Functionality
- [ ] **Message Ordering**: Messages display in correct chronological order
- [ ] **Status Progression**: Messages progress through: queued → processing → displayed
- [ ] **Duplicate Prevention**: Same message ID doesn't create duplicates
- [ ] **Queue Processing**: Messages wait for previous messages before displaying
- [ ] **Performance**: Message queue operations complete within 50ms

### MessageBubble Component
- [ ] **Own Messages**: Show original text and original language label
- [ ] **Partner Messages**: Show translation and target language label
- [ ] **Status Icons**: 
  - Queued messages show clock icon
  - Processing messages show spinning clock + pulse animation
  - Displayed messages show check icon
  - Failed messages show alert icon with red color
- [ ] **Visual Styling**:
  - Own messages: blue background, right-aligned
  - Partner messages: white/gray background, left-aligned
  - Proper opacity for queued messages
  - Pulse animation for processing messages
- [ ] **Timestamps**: Display in HH:MM format

### ActivityIndicator Component  
- [ ] **Recording Activity**: Red mic icon + 3 animated red dots + "is recording"
- [ ] **Processing Activity**: Blue brain icon + blue spinner + "is translating"
- [ ] **Typing Activity**: 3 animated gray dots + "is typing"
- [ ] **Animations**: 
  - Bounce animation with staggered delays for dots
  - Smooth slide-up entrance animation
  - Pulse animation for recording/processing
- [ ] **Auto-cleanup**: Indicators disappear after 3 seconds of inactivity

### MessageList Integration
- [ ] **Welcome State**: Shows translation icon + welcome message when empty
- [ ] **Loading State**: Shows spinner + "Loading conversation..."
- [ ] **Message Display**: Renders messages from MessageQueue in order
- [ ] **Activity Display**: Shows activity indicators for other users only
- [ ] **Auto-scroll**: Automatically scrolls to bottom when new content appears
- [ ] **Performance**: Renders 100+ messages smoothly without lag

## 🎯 Real-time Features

### Message Synchronization
- [ ] **Message Delivery**: Messages sent by one user appear on other user's screen
- [ ] **Order Preservation**: Messages display in same order for all users
- [ ] **Latency**: Message delivery within 100ms in ideal conditions
- [ ] **Connection Recovery**: Handles network interruptions gracefully
- [ ] **Status Updates**: Real-time status changes (queued → processing → displayed)

### Activity Broadcasting
- [ ] **Recording Activity**: Partner sees "recording" indicator when user records
- [ ] **Processing Activity**: Partner sees "translating" when message is being processed
- [ ] **Activity Cleanup**: Old activity indicators are automatically removed
- [ ] **User Filtering**: Users don't see their own activity indicators

## 📊 Performance Monitoring

### PerformanceMonitor Component (Development)
- [ ] **Visibility**: Shows in bottom-right corner during development
- [ ] **Metrics Display**: Shows Whisper, Translation, Total times and Message count
- [ ] **Real-time Updates**: Metrics update as messages are processed
- [ ] **Development Only**: Not visible in production builds

### Performance Requirements
- [ ] **Message Latency**: End-to-end message delivery under 100ms
- [ ] **Queue Processing**: Message queue operations under 50ms
- [ ] **UI Responsiveness**: No UI freezing during heavy message load
- [ ] **Memory Usage**: No memory leaks with extended usage

## 🔄 Error Handling & Edge Cases

### Message Failures
- [ ] **Failed Status**: Failed messages show red alert icon
- [ ] **Error Recovery**: Failed messages can be retried (when retry system is implemented)
- [ ] **Network Errors**: Graceful handling of connection issues
- [ ] **Timeout Handling**: Messages don't get stuck in processing state

### Session Management  
- [ ] **Session Expiry**: Graceful handling of expired sessions
- [ ] **User Disconnection**: Proper cleanup when users leave
- [ ] **Multi-user**: Multiple users can join same session
- [ ] **Session Recovery**: Re-joining sessions works correctly

## 🎨 Visual & UX Requirements

### Responsive Design
- [ ] **Mobile Layout**: Components work on mobile screen sizes
- [ ] **Touch Interactions**: All interactions work with touch
- [ ] **Viewport Scaling**: Proper scaling on different device sizes

### Dark Mode Support
- [ ] **Color Scheme**: All components support dark mode
- [ ] **Contrast**: Proper text contrast in both themes
- [ ] **Icons**: Icons visible in both light and dark modes

### Animations & Feedback
- [ ] **Smooth Transitions**: All animations are smooth (60fps)
- [ ] **Loading States**: Clear feedback during processing
- [ ] **Hover Effects**: Interactive elements show hover states
- [ ] **Focus States**: Keyboard navigation works properly

## 🧪 Integration Testing

### End-to-End Workflow
- [ ] **User Journey**: Complete message send → translate → receive workflow
- [ ] **Multi-Session**: Multiple concurrent sessions work independently
- [ ] **Browser Compatibility**: Works in Chrome, Safari, Firefox
- [ ] **Persistence**: Messages persist across page refreshes

### API Integration
- [ ] **Supabase Real-time**: WebSocket connections stable
- [ ] **Database Writes**: Messages saved to database correctly
- [ ] **Database Reads**: Message history loads correctly
- [ ] **Error Handling**: API errors handled gracefully

## 🚨 Critical Issues to Check

### Known Risk Areas
- [ ] **Memory Leaks**: Check for listeners not being cleaned up
- [ ] **Race Conditions**: Multiple rapid messages don't cause issues
- [ ] **State Synchronization**: Message state consistent across components
- [ ] **Event Handling**: No duplicate event listeners
- [ ] **Resource Cleanup**: Components clean up properly on unmount

### Performance Bottlenecks
- [ ] **Large Message Lists**: Performance with 500+ messages
- [ ] **Rapid Message Sending**: System handles burst sending
- [ ] **Animation Performance**: Animations don't impact scrolling
- [ ] **Bundle Size**: Code splitting working properly

## ✅ Sign-off Requirements

**All items above must be checked ✅ before deployment.**

**Tested by**: ________________  
**Date**: ________________  
**Environment**: ________________  
**Notes**: ________________

---

## 🔧 Quick Test Commands

```bash
# Start development server
npm run dev

# Run tests
npm run test

# Type check
npm run type-check

# Lint code
npm run lint

# Production build test
npm run build && npm run preview
```

**⚠️ IMPORTANT**: This checklist must be completed by a human tester. Automated tests verify component functionality, but manual testing ensures the complete user experience works as intended.