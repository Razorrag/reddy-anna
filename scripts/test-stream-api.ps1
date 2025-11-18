# Test Stream API - Check if saving works
Write-Host "🔍 Testing Stream API..." -ForegroundColor Cyan

# Test 1: Check if API is accessible
Write-Host "`n1️⃣ Testing GET /api/stream/simple-config..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://rajugarikossu.com/api/stream/simple-config" -Method Get
    Write-Host "✅ API is accessible" -ForegroundColor Green
    Write-Host "Current config:" -ForegroundColor Cyan
    $response.data | ConvertTo-Json
} catch {
    Write-Host "❌ API not accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Check if HLS stream is accessible
Write-Host "`n2️⃣ Testing HLS stream..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://rajugarikossu.com/live/test/index.m3u8" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ HLS stream is accessible" -ForegroundColor Green
        Write-Host "Content preview:" -ForegroundColor Cyan
        $response.Content.Substring(0, [Math]::Min(200, $response.Content.Length))
    }
} catch {
    Write-Host "❌ HLS stream not accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Check database table exists
Write-Host "`n3️⃣ Checking if stream config exists in database..." -ForegroundColor Yellow
Write-Host "Run this SQL in Supabase dashboard:" -ForegroundColor Cyan
Write-Host @"
SELECT * FROM simple_stream_config LIMIT 1;
"@ -ForegroundColor White

Write-Host "`n4️⃣ If table doesn't exist, run this SQL:" -ForegroundColor Yellow
Write-Host @"
CREATE TABLE IF NOT EXISTS simple_stream_config (
  id BIGSERIAL PRIMARY KEY,
  stream_url TEXT NOT NULL,
  stream_type TEXT NOT NULL DEFAULT 'iframe',
  is_active BOOLEAN DEFAULT false,
  is_paused BOOLEAN DEFAULT false,
  stream_title TEXT DEFAULT 'Live Game Stream',
  autoplay BOOLEAN DEFAULT true,
  muted BOOLEAN DEFAULT true,
  controls BOOLEAN DEFAULT false,
  min_viewers INTEGER,
  max_viewers INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO simple_stream_config (
  stream_url, stream_type, is_active, is_paused
) VALUES (
  'https://rajugarikossu.com/live/test/index.m3u8',
  'video',
  true,
  false
);
"@ -ForegroundColor White

Write-Host "`n📋 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. If HLS stream is accessible ✅, the stream is working!" -ForegroundColor Green
Write-Host "2. Go to Supabase dashboard and run the SQL above" -ForegroundColor Yellow
Write-Host "3. Then go to admin panel and toggle 'Is Active' ON" -ForegroundColor Yellow
Write-Host "4. Stream should appear on player page!" -ForegroundColor Green

Write-Host "`n🌐 Test URLs:" -ForegroundColor Cyan
Write-Host "Admin Panel: https://rajugarikossu.com/admin-stream-settings"
Write-Host "Player Page: https://rajugarikossu.com"
Write-Host "HLS Stream: https://rajugarikossu.com/live/test/index.m3u8"
