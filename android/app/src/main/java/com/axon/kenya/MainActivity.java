package com.Axon.kenya;

import android.os.Bundle;
import android.graphics.Color;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.graphics.Insets;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Window window = getWindow();
        
        // EDGE-TO-EDGE MODE: Allow app to draw behind system bars
        // The WebView will use env(safe-area-inset-bottom) to add padding
        WindowCompat.setDecorFitsSystemWindows(window, false);
        
        // Enable system bar background drawing
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        
        // Make navigation bar TRANSPARENT - content draws behind it
        window.setNavigationBarColor(Color.TRANSPARENT);
        
        // Status bar: White background with dark icons (standard look)
        window.setStatusBarColor(Color.WHITE);

        // Configure icon colors for visibility
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            View decorView = window.getDecorView();
            int flags = decorView.getSystemUiVisibility();
            
            // Status Bar: Dark icons (visible on white background)
            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            
            // Navigation Bar: Dark icons (visible on transparent/light background)
            flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            
            decorView.setSystemUiVisibility(flags);
        }
        
        // Optional: Listen for insets and log them for debugging
        View contentView = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(contentView, (view, windowInsets) -> {
            Insets navBarInsets = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars());
            // Log.d("MainActivity", "Nav bar height: " + navBarInsets.bottom);
            // The WebView will automatically get this via env(safe-area-inset-bottom)
            return windowInsets;
        });
    }
}
