package com.netone.gateway;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import android.view.accessibility.AccessibilityManager;
import android.content.Context;
import android.util.Log;
import android.telephony.TelephonyManager;
import android.os.Handler;
import android.os.Looper;
import android.os.Build;

public class UssdModule extends ReactContextBaseJavaModule {
    private static ReactApplicationContext reactContext;
    private static final String TAG = "UssdModule";

    public UssdModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "UssdModule";
    }

    @ReactMethod
    public void executeUssd(String code, ReadableArray steps, Promise promise) {
        try {
            if (!isAccessibilityServiceEnabled()) {
                promise.reject("ACCESSIBILITY_DISABLED", "Accessibility service is not enabled.");
                return;
            }

            String[] stepsArray = new String[steps.size()];
            for (int i = 0; i < steps.size(); i++) {
                stepsArray[i] = steps.getString(i);
            }
            UssdAccessibilityService.setUssdSteps(stepsArray);

            Log.d(TAG, "Executing USSD: " + code);
            String encodedCode = Uri.encode(code);
            Intent intent = new Intent(Intent.ACTION_CALL);
            intent.setData(Uri.parse("tel:" + encodedCode));
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            getReactApplicationContext().startActivity(intent);

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("USSD_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void executeInteractiveUssd(String code, final Promise promise) {
        try {
            TelephonyManager telephonyManager = (TelephonyManager) reactContext.getSystemService(Context.TELEPHONY_SERVICE);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Log.d(TAG, "Executing Interactive USSD: " + code);
                telephonyManager.sendUssdRequest(code, new TelephonyManager.UssdResponseCallback() {
                    @Override
                    public void onReceiveUssdResponse(TelephonyManager telephonyManager, String request, CharSequence response) {
                        super.onReceiveUssdResponse(telephonyManager, request, response);
                        Log.d(TAG, "USSD Success Response: " + response.toString());
                        
                        // Send event to React Native
                        sendUssdResponse(response.toString());
                        
                        WritableMap result = Arguments.createMap();
                        result.putBoolean("success", true);
                        result.putString("response", response.toString());
                        promise.resolve(result);
                    }

                    @Override
                    public void onReceiveUssdResponseFailed(TelephonyManager telephonyManager, String request, int failureCode) {
                        super.onReceiveUssdResponseFailed(telephonyManager, request, failureCode);
                        Log.e(TAG, "USSD Failed with code: " + failureCode);
                        promise.reject("USSD_FAILED", "USSD request failed with code: " + failureCode);
                    }
                }, new Handler(Looper.getMainLooper()));
            } else {
                promise.reject("UNSUPPORTED_VERSION", "This feature requires Android 8.0 or higher.");
            }
        } catch (SecurityException e) {
            promise.reject("PERMISSION_DENIED", "Required permissions (CALL_PHONE or READ_PHONE_STATE) missing: " + e.getMessage());
        } catch (Exception e) {
            promise.reject("USSD_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void isAccessibilityEnabled(Promise promise) {
        promise.resolve(isAccessibilityServiceEnabled());
    }

    @ReactMethod
    public void requestAccessibilityPermission() {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        reactContext.startActivity(intent);
    }

    private boolean isAccessibilityServiceEnabled() {
        String serviceName = reactContext.getPackageName() + "/" + UssdAccessibilityService.class.getCanonicalName();
        String enabledServices = Settings.Secure.getString(
            reactContext.getContentResolver(),
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        );
        return enabledServices != null && enabledServices.contains(serviceName);
    }

    public static void sendUssdResponse(String response) {
        if (reactContext != null) {
            WritableMap params = Arguments.createMap();
            params.putString("response", response);
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onUssdResponse", params);
        }
    }
}
