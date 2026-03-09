
$pdfPath = "C:\Users\DELL\Downloads\REVIEW III (BATCH 11).pdf"
$bytes = [System.IO.File]::ReadAllBytes($pdfPath)
$text = [System.Text.Encoding]::Latin1.GetString($bytes)

$results = @()
$pos = 0
while ($true) {
    $idx = $text.IndexOf("stream`r`n", $pos)
    if ($idx -lt 0) { $idx2 = $text.IndexOf("stream`n", $pos); if ($idx2 -lt 0) { break } else { $idx = $idx2; $start = $idx + 8 } } else { $start = $idx + 9 }
    
    $end = $text.IndexOf("endstream", $start)
    if ($end -lt 0) { break }
    
    $header = $text.Substring([Math]::Max(0, $idx-200), 200)
    if ($header -match 'FlateDecode') {
        $streamBytes = [System.Text.Encoding]::Latin1.GetBytes($text.Substring($start, $end - $start))
        try {
            $ms = New-Object System.IO.MemoryStream(,$streamBytes)
            $ds = New-Object System.IO.Compression.DeflateStream($ms, [System.IO.Compression.CompressionMode]::Decompress)
            $sr = New-Object System.IO.StreamReader($ds)
            $decompressed = $sr.ReadToEnd()
            if ($decompressed -match '[a-zA-Z]{3,}') {
                $results += $decompressed
            }
        } catch {}
    }
    $pos = $end + 9
}

$allText = $results -join "`n"
$allText | Out-File "C:\Users\DELL\OneDrive\Desktop\Divyesh\pdfText.txt" -Encoding UTF8
Write-Host "Done. Lines: $(($allText -split "`n").Count)"
