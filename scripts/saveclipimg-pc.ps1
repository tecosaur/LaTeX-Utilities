# SOURCED FROM https://github.com/mushanshitiancai/vscode-paste-image/

param($imagePath)

# Adapted from https://github.com/octan3/img-clipboard-dump/blob/master/dump-clipboard-png.ps1

Add-Type -Assembly PresentationCore

if ($PSVersionTable.PSVersion.Major -ge 5 -and $PSVersionTable.PSVersion.Major -ge 1)
{
    $file = Get-Clipboard -Format FileDropList
    if ($file -ne $null) {
        $img = new-object System.Drawing.Bitmap($file[0].Fullname)
    } else {
        $img = Get-Clipboard -Format Image
    }

    if ($img -eq $null) {
        "no image"
        Exit 1
    }

    if (-not $imagePath) {
        "no image"
        Exit 1
    }

    $img.save($imagePath)
}
else
{
    $img = [Windows.Clipboard]::GetImage()
    if ($img -eq $null) {
        "no image"
        Exit 1
    }

    if (-not $imagePath) {
        "no image"
        Exit 1
    }

    $fcb = new-object Windows.Media.Imaging.FormatConvertedBitmap($img, [Windows.Media.PixelFormats]::Rgb24, $null, 0)
    $stream = [IO.File]::Open($imagePath, "OpenOrCreate")
    $encoder = New-Object Windows.Media.Imaging.PngBitmapEncoder
    $encoder.Frames.Add([Windows.Media.Imaging.BitmapFrame]::Create($fcb)) | out-null
    $encoder.Save($stream) | out-null
    $stream.Dispose() | out-null
}

$imagePath
