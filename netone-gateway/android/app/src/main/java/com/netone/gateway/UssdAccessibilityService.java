package com.netone.gateway;

import android.accessibilityservice.AccessibilityService;
import android.os.Bundle;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.os.Handler;
import android.util.Log;
import java.util.List;

public class UssdAccessibilityService extends AccessibilityService {
    private static final String TAG = "UssdAccessibility";
    private static String[] ussdSteps = new String[0];
    private static int currentStep = 0;
    private Handler handler = new Handler();

    public static void setUssdSteps(String[] steps) {
        ussdSteps = steps;
        currentStep = 0;
        Log.d(TAG, "Steps set, count: " + steps.length);
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            String packageName = event.getPackageName() != null ? event.getPackageName().toString() : "";
            
            if (packageName.equals("com.android.phone") || 
                event.getClassName().toString().contains("AlertDialog")) {
                
                handler.postDelayed(() -> {
                    processUssdDialog(event);
                }, 500);
            }
        }
    }

    private void processUssdDialog(AccessibilityEvent event) {
        AccessibilityNodeInfo source = event.getSource();
        if (source == null) return;

        try {
            String ussdText = extractUssdText(source);
            
            if (ussdText != null && !ussdText.isEmpty()) {
                Log.d(TAG, "USSD Response: " + ussdText);
                UssdModule.sendUssdResponse(ussdText);

                if (currentStep < ussdSteps.length) {
                    final String input = ussdSteps[currentStep];
                    handler.postDelayed(() -> {
                        if (sendUssdInput(source, input)) {
                            currentStep++;
                        }
                    }, 800);
                }
            }
        } finally {
            source.recycle();
        }
    }

    private String extractUssdText(AccessibilityNodeInfo node) {
        if (node == null) return null;

        if (node.getClassName() != null && node.getClassName().toString().contains("TextView")) {
            CharSequence text = node.getText();
            if (text != null && text.length() > 0) return text.toString();
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            String text = extractUssdText(child);
            if (child != null) child.recycle();
            if (text != null) return text;
        }
        return null;
    }

    private boolean sendUssdInput(AccessibilityNodeInfo node, String input) {
        AccessibilityNodeInfo editText = findEditText(node);
        if (editText != null) {
            Bundle arguments = new Bundle();
            arguments.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, input);
            editText.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments);
            
            AccessibilityNodeInfo okButton = findButton(node, "SEND");
            if (okButton == null) okButton = findButton(node, "OK");
            
            if (okButton != null) {
                okButton.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                okButton.recycle();
            }
            editText.recycle();
            return true;
        }
        return false;
    }

    private AccessibilityNodeInfo findEditText(AccessibilityNodeInfo node) {
        if (node == null) return null;
        if (node.getClassName() != null && node.getClassName().toString().contains("EditText")) return node;
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            AccessibilityNodeInfo res = findEditText(child);
            if (child != null && res == null) child.recycle();
            if (res != null) return res;
        }
        return null;
    }

    private AccessibilityNodeInfo findButton(AccessibilityNodeInfo node, String text) {
        if (node == null) return null;
        if (node.getClassName() != null && node.getClassName().toString().contains("Button")) {
            CharSequence nodeText = node.getText();
            if (nodeText != null && nodeText.toString().equalsIgnoreCase(text)) return node;
        }
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            AccessibilityNodeInfo res = findButton(child, text);
            if (child != null && res == null) child.recycle();
            if (res != null) return res;
        }
        return null;
    }

    @Override
    public void onInterrupt() {}
}
