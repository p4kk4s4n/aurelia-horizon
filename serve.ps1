param(
  [int]$Port = 8080
)

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Listener = New-Object System.Net.HttpListener
$Prefix = "http://localhost:$Port/"
$Listener.Prefixes.Add($Prefix)
$Listener.Start()

Write-Host "Serving Aurelia Horizon at $Prefix (Root: $Root)"
Write-Host "Press Ctrl+C to stop."

$MimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".mjs"  = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".webmanifest" = "application/manifest+json; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".glb"  = "model/gltf-binary"
  ".gltf" = "model/gltf+json"
}

try {
  while ($Listener.IsListening) {
    try {
      $Context = $Listener.GetContext()
      $Request = $Context.Request
      $Response = $Context.Response

      $UrlPath = $Request.Url.LocalPath.TrimStart('/')
      if ([string]::IsNullOrEmpty($UrlPath)) {
        $UrlPath = "index.html"
      }

      if ($Request.HttpMethod -eq "POST" -and $UrlPath.StartsWith("save_asset")) {
        $RelPath = $Request.QueryString["path"]
        if (-not [string]::IsNullOrEmpty($RelPath)) {
          $AssetPath = Join-Path $Root ($RelPath -replace '/', '\')
          $ParentDir = Split-Path -Parent $AssetPath
          if (-not (Test-Path $ParentDir)) {
            New-Item -ItemType Directory -Force -Path $ParentDir | Out-Null
          }
          $OutStream = [System.IO.File]::Create($AssetPath)
          $Request.InputStream.CopyTo($OutStream)
          $OutStream.Close()
          $Response.StatusCode = 200
          $Msg = [System.Text.Encoding]::UTF8.GetBytes("Saved $RelPath")
          $Response.OutputStream.Write($Msg, 0, $Msg.Length)
          $Response.OutputStream.Close()
          continue
        }
      }

      $FilePath = Join-Path $Root ($UrlPath -replace '/', '\')
      if ((Test-Path $FilePath) -and -not (Get-Item $FilePath).PSIsContainer) {
        $Ext = [System.IO.Path]::GetExtension($FilePath).ToLower()
        $Response.ContentType = if ($MimeTypes.ContainsKey($Ext)) { $MimeTypes[$Ext] } else { "application/octet-stream" }
        $Bytes = [System.IO.File]::ReadAllBytes($FilePath)
        $Response.ContentLength64 = $Bytes.Length
        $Response.StatusCode = 200
        $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
      } else {
        $Response.StatusCode = 404
        $Msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $UrlPath")
        $Response.OutputStream.Write($Msg, 0, $Msg.Length)
      }
      $Response.OutputStream.Close()
    } catch {
      # Ignore individual request / client disconnect errors
    }
  }
} finally {
  $Listener.Stop()
}
