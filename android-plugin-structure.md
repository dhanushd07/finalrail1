# Android USB Camera Plugin Structure

After exporting your project to GitHub, you'll need to create the following files in your Android native project:

1. Create a new Java file at `android/app/src/main/java/app/lovable/finalrail1/UsbCameraPlugin.java`:

```java
package app.lovable.finalrail1;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

@CapacitorPlugin(name = "UsbCamera")
public class UsbCameraPlugin extends Plugin {
    private static final String TAG = "UsbCameraPlugin";
    private final BroadcastReceiver usbReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (UsbManager.ACTION_USB_DEVICE_ATTACHED.equals(action)) {
                UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                if (isCamera(device)) {
                    notifyListeners("usbCameraConnected", new JSObject());
                    Log.d(TAG, "USB Camera connected: " + device.getDeviceName());
                }
            } else if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(action)) {
                UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                if (isCamera(device)) {
                    notifyListeners("usbCameraDisconnected", new JSObject());
                    Log.d(TAG, "USB Camera disconnected: " + device.getDeviceName());
                }
            }
        }
    };

    @Override
    public void load() {
        IntentFilter filter = new IntentFilter();
        filter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
        getContext().registerReceiver(usbReceiver, filter);
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        Log.d(TAG, "Initializing USB camera detection");
        call.resolve();
    }

    @PluginMethod
    public void getCameras(PluginCall call) {
        try {
            UsbManager usbManager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
            HashMap<String, UsbDevice> deviceList = usbManager.getDeviceList();
            
            List<JSObject> cameras = new ArrayList<>();
            
            for (UsbDevice device : deviceList.values()) {
                if (isCamera(device)) {
                    JSObject camera = new JSObject();
                    camera.put("id", device.getDeviceId());
                    camera.put("name", device.getDeviceName());
                    cameras.add(camera);
                }
            }
            
            JSArray result = new JSArray();
            for (JSObject camera : cameras) {
                result.put(camera);
            }
            
            JSObject ret = new JSObject();
            ret.put("cameras", result);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error getting USB cameras", e);
            call.reject("Error getting USB cameras: " + e.getMessage());
        }
    }

    private boolean isCamera(UsbDevice device) {
        // This is a simplified check - in a real implementation,
        // you would check the device class and interface to determine if it's a camera
        // The USB video class is 14 (0x0E)
        return device != null && device.getDeviceClass() == 14;
    }

    @Override
    protected void handleOnDestroy() {
        getContext().unregisterReceiver(usbReceiver);
    }
}
```

2. Register the plugin in `android/app/src/main/java/app/lovable.finalrail1/MainActivity.java`:

```java
package app.lovable.finalrail1;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Register plugins
        // Plugins must also be added to capacitor.config.ts
        registerPlugin(UsbCameraPlugin.class);
    }
}
```

3. Add USB permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="app.lovable.finalrail1">

    <!-- Add USB permissions -->
    <uses-feature android:name="android.hardware.usb.host" />
    <uses-permission android:name="android.permission.USB_PERMISSION" />
    
    <!-- Existing permissions should be here -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    
    <!-- Rest of the manifest -->
</manifest>
```

4. Add an intent filter for USB devices in `android/app/src/main/AndroidManifest.xml` inside the main activity:

```xml
<activity
    android:name=".MainActivity"
    android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
    android:label="@string/app_name"
    android:launchMode="singleTask">
    
    <!-- Existing intent filters -->
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
    
    <!-- USB device intent filter -->
    <intent-filter>
        <action android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED" />
    </intent-filter>
    <meta-data android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED"
               android:resource="@xml/device_filter" />
</activity>
```

5. Create a device filter file at `android/app/src/main/res/xml/device_filter.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- This will match any USB device with the Video Class (0x0e) -->
    <usb-device class="14" />
</resources>
```
