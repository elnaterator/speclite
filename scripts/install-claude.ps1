#!/usr/bin/env pwsh
# Install/update speclite in Claude Code via the local plugin marketplace.
$ErrorActionPreference = 'Stop'
# claude sub-commands can exit non-zero (e.g. uninstall when not installed); handle manually.
$PSNativeCommandUseErrorActionPreference = $false

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Marketplace = 'speclite'
$Plugin = "speclite@$Marketplace"

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
	Write-Error 'claude CLI not found - install Claude Code and ensure claude is on PATH'
	exit 1
}

if (-not ((claude plugin marketplace list 2>$null) -match $Marketplace)) {
	Write-Host "Adding local marketplace $Marketplace from $RepoRoot"
	claude plugin marketplace add $RepoRoot
}

claude plugin marketplace update $Marketplace
claude plugin uninstall $Plugin 2>$null   # may fail if not installed; ignored
claude plugin install $Plugin

Write-Host ''
$list = claude plugin list
$matched = $list | Select-String -Pattern 'speclite|Plugin'
if ($matched) { $matched | ForEach-Object { Write-Host $_ } } else { $list | ForEach-Object { Write-Host $_ } }
Write-Host ''
Write-Host 'Restart Claude Code (or run /reload-plugins) to load skills.'
