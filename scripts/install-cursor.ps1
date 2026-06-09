#!/usr/bin/env pwsh
# Install speclite into Cursor's local plugins directory (copy, not symlink).
$ErrorActionPreference = 'Stop'
# robocopy returns non-zero on success (1 = files copied); don't let that throw on PS 7.4+.
$PSNativeCommandUseErrorActionPreference = $false

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$CursorPluginDir = Join-Path $HOME '.cursor\plugins\local\speclite'

# robocopy /MIR mirrors the tree (creates dest, purges extras); /XD excludes dirs, /XF files.
$excludeDirs  = @('.git', 'scripts', '.claude-plugin')
$excludeFiles = @('.DS_Store', 'CLAUDE.md', 'README.md', 'CONTRIBUTING.md', 'Makefile', 'LICENSE')
robocopy $RepoRoot $CursorPluginDir /MIR /NFL /NDL /NJH /NJS /NP `
	/XD @excludeDirs /XF @excludeFiles | Out-Null

# robocopy exit codes 0-7 indicate success; 8+ is a real failure.
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }

Write-Host "Copied speclite to $CursorPluginDir"
Write-Host "Reload Cursor: Developer -> Reload Window"
