# SOURCED FROM https://github.com/mushanshitiancai/vscode-paste-image/

param($imagePath)

# Adapted from https://github.com/octan3/img-clipboard-dump/blob/master/dump-clipboard-png.ps1

Add-Type -Assembly PresentationCore
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

$imagePath
