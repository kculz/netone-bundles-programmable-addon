# Native Android USSD Module Implementation Guide

This guide explains how to implement native Android modules for background USSD processing with automatic response capture.

## Prerequisites

1. **Eject from Expo** (if using Expo):
   ```bash
   cd netone-gateway
   npx expo prebuild
   ```

2. **Required Android Permissions** (add to `AndroidManifest.xml`):
   ```xml
   <uses-permission android:name="android.permission.CALL_PHONE" />
   <uses-permission android:name="android.permission.READ_PHONE_STATE" />
   <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
   <uses-permission android:name="android.permission.BIND_ACCESSIBILITY_SERVICE" />
   ```

## File Structure

```
android/app/src/main/java/com/netonegateway/
├── UssdModule.java                 # React Native bridge module
├── UssdAccessibilityService.java  # Accessibility service for USSD capture
└── UssdPackage.java               # Package registration
```

## Implementation Files

### 1. UssdModule.java

```java
package com.netonegateway;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import android.view.accessibility.AccessibilityManager;
import android.content.Context;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class UssdModule extends ReactContextBaseJavaModule {
    private static ReactApplicationContext reactContext;

    public UssdModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "UssdModule";
    }

    /**
     * Execute USSD code with sequential steps
     */
    @ReactMethod
    public void executeUssd(String code, ReadableArray steps, Promise promise) {
        try {
            // Check if accessibility service is enabled
            if (!isAccessibilityServiceEnabled()) {
                promise.reject("ACCESSIBILITY_DISABLED", 
                    "Accessibility service is not enabled. Please enable it in settings.");
                return;
            }

            // Store steps in UssdAccessibilityService for sequential execution
            String[] stepsArray = new String[steps.size()];
            for (int i = 0; i < steps.size(); i++) {
                stepsArray[i] = steps.getString(i);
            }
            UssdAccessibilityService.setUssdSteps(stepsArray);

            // Dial the base USSD code
            String ussdCode = Uri.encode(code);
            Intent intent = new Intent(Intent.ACTION_CALL);
            intent.setData(Uri.parse("tel:" + ussdCode));
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            getCurrentActivity().startActivity(intent);

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);

        } catch (Exception e) {
            promise.reject("USSD_ERROR", e.getMessage());
        }
    }

    /**
     * Check if accessibility service is enabled
     */
    @ReactMethod
    public void isAccessibilityEnabled(Promise promise) {
        promise.resolve(isAccessibilityServiceEnabled());
    }

    /**
     * Request accessibility permission (opens settings)
     */
    @ReactMethod
    public void requestAccessibilityPermission() {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        reactContext.startActivity(intent);
    }

    /**
     * Helper method to check if accessibility service is enabled
     */
    private boolean isAccessibilityServiceEnabled() {
        AccessibilityManager am = (AccessibilityManager) reactContext
            .getSystemService(Context.ACCESSIBILITY_SERVICE);
        
        String serviceName = reactContext.getPackageName() + 
            "/" + UssdAccessibilityService.class.getCanonicalName();
        
        // Check if our service is in the list of enabled services
        String enabledServices = Settings.Secure.getString(
            reactContext.getContentResolver(),
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        );
        
        return enabledServices != null && enabledServices.contains(serviceName);
    }

    /**
     * Send USSD response event to React Native
     */
    public static void sendUssdResponse(String response) {
        WritableMap params = Arguments.createMap();
        params.putString("response", response);
        
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit("onUssdResponse", params);
    }
}
```

### 2. UssdAccessibilityService.java

```java
package com.netonegateway;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.os.Handler;
import android.util.Log;

public class UssdAccessibilityService extends AccessibilityService {
    private static final String TAG = "UssdAccessibility";
    private static String[] ussdSteps = new String[0];
    private static int currentStep = 0;
    private Handler handler = new Handler();

    public static void setUssdSteps(String[] steps) {
        ussdSteps = steps;
        currentStep = 0;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            String packageName = event.getPackageName() != null ? 
                event.getPackageName().toString() : "";
            
            // Check if this is a USSD dialog
            if (packageName.equals("com.android.phone") || 
                event.getClassName().toString().contains("AlertDialog")) {
                
                handler.postDelayed(() -> {
                    processUssdDialog(event);
                }, 500); // Small delay to ensure dialog is fully rendered
            }
        }
    }

    private void processUssdDialog(AccessibilityEvent event) {
        AccessibilityNodeInfo source = event.getSource();
        if (source == null) return;

        try {
            // Extract USSD response text
            String ussdText = extractUssdText(source);
            
            if (ussdText != null && !ussdText.isEmpty()) {
                Log.d(TAG, "USSD Response: " + ussdText);
                
                // Send response to React Native
                UssdModule.sendUssdResponse(ussdText);

                // If there are more steps, send the next one
                if (currentStep < ussdSteps.length) {
                    handler.postDelayed(() -> {
                        sendUssdInput(source, ussdSteps[currentStep]);
                        currentStep++;
                    }, 800); // Delay between steps
                } else {
                    // No more steps, dismiss dialog
                    handler.postDelayed(() -> {
                        dismissDialog(source);
                    }, 1000);
                }
            }
        } finally {
            source.recycle();
        }
    }

    private String extractUssdText(AccessibilityNodeInfo node) {
        if (node == null) return null;

        // Try to find TextView with USSD response
        if (node.getClassName() != null && 
            node.getClassName().toString().contains("TextView")) {
            CharSequence text = node.getText();
            if (text != null && text.length() > 0) {
                return text.toString();
            }
        }

        // Recursively search child nodes
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                String text = extractUssdText(child);
                child.recycle();
                if (text != null) return text;
            }
        }

        return null;
    }

    private void sendUssdInput(AccessibilityNodeInfo node, String input) {
        // Find EditText and input the step
        AccessibilityNodeInfo editText = findEditText(node);
        if (editText != null) {
            editText.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT);
            // Then find and click OK button
            AccessibilityNodeInfo okButton = findButton(node, "OK");
            if (okButton != null) {
                okButton.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                okButton.recycle();
            }
            editText.recycle();
        }
    }

    private void dismissDialog(AccessibilityNodeInfo node) {
        // Find and click Cancel/Dismiss button
        AccessibilityNodeInfo cancelButton = findButton(node, "Cancel");
        if (cancelButton == null) {
            cancelButton = findButton(node, "Dismiss");
        }
        if (cancelButton != null) {
            cancelButton.performAction(AccessibilityNodeInfo.ACTION_CLICK);
            cancelButton.recycle();
        }
    }

    private AccessibilityNodeInfo findEditText(AccessibilityNodeInfo node) {
        if (node == null) return null;
        
        if (node.getClassName() != null && 
            node.getClassName().toString().contains("EditText")) {
            return node;
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            AccessibilityNodeInfo result = findEditText(child);
            if (result != null) return result;
            if (child != null) child.recycle();
        }
        return null;
    }

    private AccessibilityNodeInfo findButton(AccessibilityNodeInfo node, String text) {
        if (node == null) return null;
        
        if (node.getClassName() != null && 
            node.getClassName().toString().contains("Button")) {
            CharSequence nodeText = node.getText();
            if (nodeText != null && nodeText.toString().equalsIgnoreCase(text)) {
                return node;
            }
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            AccessibilityNodeInfo result = findButton(child, text);
            if (result != null) return result;
            if (child != null) child.recycle();
        }
        return null;
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "Service interrupted");
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        Log.d(TAG, "Accessibility service connected");
    }
}
```

### 3. UssdPackage.java

```java
package com.netonegateway;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class UssdPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new UssdModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
```

## AndroidManifest.xml Configuration

Add the accessibility service declaration inside the `<application>` tag:

```xml
<service
    android:name=".UssdAccessibilityService"
    android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
    android:exported="true">
    <intent-filter>
        <action android:name="android.accessibilityservice.AccessibilityService" />
    </intent-filter>
    <meta-data
        android:name="android.accessibilityservice"
        android:resource="@xml/accessibility_service_config" />
</service>
```

Create `android/app/src/main/res/xml/accessibility_service_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<accessibility-service
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeWindowStateChanged"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagDefault"
    android:canRetrieveWindowContent="true"
    android:description="@string/accessibility_service_description"
    android:notificationTimeout="100"
    android:packageNames="com.android.phone" />
```

Add to `android/app/src/main/res/values/strings.xml`:

```xml
<string name="accessibility_service_description">
    Allows NetOne Gateway to automate USSD operations and capture responses
</string>
```

## MainApplication.java Registration

Add the package to your `MainApplication.java`:

```java
import com.netonegateway.UssdPackage; // Add this import

@Override
protected List<ReactPackage> getPackages() {
    List<ReactPackage> packages = new PackageList(this).getPackages();
    packages.add(new UssdPackage()); // Add this line
    return packages;
}
```

## Testing

1. **Build and install the app**:
   ```bash
   cd android
   ./gradlew assembleDebug
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```

2. **Enable accessibility service**:
   - Go to Settings → Accessibility → NetOne Gateway
   - Toggle the service ON

3. **Test USSD execution**:
   - Send a balance check request from the backend
   - The app should automatically dial, capture the response, and send it to the backend

## Troubleshooting

- **Accessibility service not appearing**: Check that the service is properly declared in AndroidManifest.xml
- **USSD not dialing**: Ensure CALL_PHONE permission is granted
- **Responses not captured**: Check logcat for accessibility events: `adb logcat | grep UssdAccessibility`
