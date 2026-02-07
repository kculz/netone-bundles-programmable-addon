# NetOne USSD Gateway - Setup Guide

## Overview

This guide explains how to set up and use the NetOne USSD Gateway for automated bundle purchases and balance checks.

## Important Changes

### Sequential USSD Execution

The gateway now executes USSD steps **sequentially** (one at a time) instead of sending all steps at once. This is required for NetOne provider compatibility.

**How it works:**
1. Dials the base USSD code (e.g., `*379#` or `*171#`)
2. Waits 800ms
3. Sends the first menu selection (e.g., `1#`)
4. Waits 800ms
5. Sends the next menu selection
6. Continues until all steps are complete

### Required Permissions

The Android app requires the following permissions:

- **CALL_PHONE**: Required to dial USSD codes
- **READ_PHONE_STATE**: Optional, helps with better error handling
- **INTERNET**: For Socket.IO communication
- **ACCESS_NETWORK_STATE**: For network status monitoring

## Installation & Setup

### 1. Install Dependencies

```bash
cd netone-gateway
npm install
```

### 2. Build the App

Since we've added native permissions, you need to rebuild the app:

```bash
# For Android
npx expo prebuild --clean
npx expo run:android
```

Or build a development client:

```bash
eas build --profile development --platform android
```

### 3. Grant Permissions

When you first run the app, it will request the CALL_PHONE permission. You must grant this permission for USSD automation to work.

If you deny the permission:
- The app will request it again when trying to execute a USSD task
- You can manually grant it in Android Settings → Apps → NetOne Gateway → Permissions

## Usage

### Connecting to Backend

1. Make sure the backend server is running
2. Open the NetOne Gateway app
3. The app will automatically connect via Socket.IO
4. You should see "Connected" status in the app

### Executing USSD Tasks

When a task is received from the backend:

1. **Permission Check**: App checks if CALL_PHONE permission is granted
2. **Sequential Execution**: App dials USSD code and sends steps one by one
3. **Progress Updates**: Each step is reported back to the backend
4. **Completion**: Final result is sent when all steps complete

### USSD Dialog Behavior

**Important**: USSD dialogs will still be visible to the user. The app cannot hide them without:
- Native Android module (AccessibilityService)
- User manually enabling Accessibility permission

The current implementation:
- ✅ Executes steps automatically
- ✅ Sends progress updates
- ✅ Handles errors gracefully
- ❌ Cannot hide USSD dialogs
- ❌ Cannot automatically parse USSD responses

## Configuration

### Adjusting Step Delays

The default delay between USSD steps is 800ms. You can adjust this in the app:

```typescript
import { updateUssdConfig } from '@/services/UssdAutomation';

// Increase delay to 1 second
updateUssdConfig({ STEP_DELAY: 1000 });

// Increase timeout to 15 seconds
updateUssdConfig({ STEP_TIMEOUT: 15000 });
```

### Backend Configuration

The backend sends `stepDelay` and `stepTimeout` with each task. These are currently set to:
- `stepDelay`: 800ms
- `stepTimeout`: 10000ms (10 seconds)

## Troubleshooting

### Permission Denied Error

**Problem**: "Call permission denied. Cannot execute USSD operations."

**Solution**:
1. Open Android Settings
2. Go to Apps → NetOne Gateway → Permissions
3. Enable "Phone" permission
4. Restart the app

### USSD Not Dialing

**Problem**: USSD code doesn't dial

**Solutions**:
- Check that you're on a physical Android device (not emulator)
- Verify the device has a SIM card
- Check that the phone app is not disabled
- Try manually dialing a USSD code (e.g., `*379#`) to verify it works

### Steps Executing Too Fast

**Problem**: NetOne rejects the USSD sequence

**Solution**: Increase the step delay:
```typescript
updateUssdConfig({ STEP_DELAY: 1200 }); // Increase to 1.2 seconds
```

### App Crashes on USSD Execution

**Problem**: App crashes when executing USSD

**Solutions**:
- Check Android version (minimum API 23 / Android 6.0)
- Verify all permissions are granted
- Check logcat for error messages: `adb logcat | grep NetOne`

## Known Limitations

### Current Implementation (Approach B - JavaScript Only)

✅ **What Works:**
- Sequential USSD step execution
- Permission handling
- Progress tracking
- Error reporting
- Works with current Expo setup

❌ **Limitations:**
- USSD dialogs are visible to user
- Cannot automatically parse USSD responses
- App should stay in foreground during execution
- Cannot intercept system USSD dialogs

### Future Enhancement (Approach A - Native Module)

To achieve true background processing:
1. Create native Android module with AccessibilityService
2. User must enable Accessibility permission manually
3. Can intercept and parse USSD responses
4. Can hide USSD dialogs from user
5. Requires Expo development build

## Testing

### Test Permission Flow

1. Uninstall the app
2. Reinstall and open
3. Trigger a USSD task
4. Verify permission dialog appears
5. Grant permission
6. Verify USSD executes

### Test Sequential Execution

1. Trigger a data bundle purchase
2. Watch the USSD dialogs appear sequentially
3. Verify delays between steps
4. Check backend logs for progress updates

### Test Error Handling

1. Deny CALL_PHONE permission
2. Trigger a USSD task
3. Verify error is reported to backend
4. Grant permission
5. Retry task
6. Verify it now works

## Support

For issues:
1. Check the app logs in Expo
2. Check backend logs for task status
3. Verify permissions are granted
4. Test manual USSD dialing on the device
5. Check NetOne network connectivity

## Next Steps

To implement full background processing:
1. Review the implementation plan (Approach A)
2. Set up Expo development build
3. Create native Android module
4. Implement AccessibilityService
5. Update documentation for Accessibility setup
