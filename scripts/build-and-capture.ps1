param(
    [string]$Profile = "preview",
    [string]$Platform = "android",
    [string]$OutputDir = "C:\\tmp"
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "[build-capture] $Message" -ForegroundColor Cyan
}

$originalLocation = Get-Location
try {
    $projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
    Set-Location $projectRoot

    Write-Step "Running EAS build for platform '$Platform' with profile '$Profile'..."
    $buildArgs = @("build", "--platform", $Platform, "--profile", $Profile, "--clear-cache", "--non-interactive")
    & eas @buildArgs
    if ($LASTEXITCODE -ne 0) {
        throw "EAS build command failed (exit code $LASTEXITCODE)."
    }
    Write-Step "Build finished successfully."

    $tempRoot = Join-Path $env:TEMP "eas-cli-nodejs"
    if (-not (Test-Path $tempRoot)) {
        Write-Warning "Temporary EAS directory '$tempRoot' not found. Archive may have been cleaned up."
        return
    }

    Write-Step "Searching for project archive within '$tempRoot'..."
    $archive = Get-ChildItem -Path $tempRoot -Recurse -Filter "project.tar.gz" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $archive) {
        Write-Warning "No project.tar.gz found under '$tempRoot'."
        return
    }

    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    $destTar = Join-Path $OutputDir "project-eas.tar.gz"
    Copy-Item -Path $archive.FullName -Destination $destTar -Force
    Write-Step "Archive copied to '$destTar'."

    $listPath = Join-Path $OutputDir "project-eas-list.txt"
    Write-Step "Running 'tar -tzf' to list archive contents..."
    & tar -tzf $destTar > $listPath 2>&1
    $tarExit = $LASTEXITCODE
    if ($tarExit -eq 0) {
        Write-Step "Archive listing saved to '$listPath'."
    } else {
        Write-Warning "tar -tzf exited with code $tarExit. Details written to '$listPath'."
    }

    Write-Step "Calculating SHA256 hash..."
    $hash = Get-FileHash -Path $destTar -Algorithm SHA256
    Write-Host "SHA256: $($hash.Hash)" -ForegroundColor Yellow

} catch {
    Write-Error $_
} finally {
    Set-Location $originalLocation
}
