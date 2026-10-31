#Requires -RunAsAdministrator
<#
    Spoofer.ps1  —  machine identity rotation (lab / VM use)
    rotates: MachineGuid, HwProfileGuid, SQMClient MachineId, Cryptography GUID,
             SusClientId, Volume Serial (per fixed disk), NIC MAC (per physical adapter),
             computer name, SMBIOS cache keys, event log / prefetch wipe.
    reboot required after run.
    run from an elevated PowerShell:  Set-ExecutionPolicy -Scope Process Bypass -Force; .\Spoofer.ps1
#>

[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$NoReboot,
    [string]$BackupDir = "$env:ProgramData\Spoofer\backup"
)

$ErrorActionPreference = 'Stop'
$script:Changed = @()

# ---------- helpers ----------
function New-Guid5 { [guid]::NewGuid().ToString() }
function New-Hex   { param($n=8) -join ((1..$n) | ForEach-Object { "{0:X2}" -f (Get-Random -Max 256) }) }
function New-Mac {
    # locally-administered unicast: second nibble of first octet = 2/6/A/E
    $first = (0x02, 0x06, 0x0A, 0x0E | Get-Random)
    $rest  = (1..5) | ForEach-Object { Get-Random -Max 256 }
    ($first, $rest[0], $rest[1], $rest[2], $rest[3], $rest[4] | ForEach-Object { "{0:X2}" -f $_ }) -join ''
}
function Backup-RegKey {
    param($Path)
    if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null }
    $safe = ($Path -replace '[:\\]', '_')
    $file = Join-Path $BackupDir "$safe.reg"
    $hive, $sub = $Path -split '\\', 2
    $regHive = switch ($hive) {
        'HKLM:' { 'HKLM' } 'HKCU:' { 'HKCU' } 'HKCR:' { 'HKCR' } default { $hive.TrimEnd(':') }
    }
    & reg.exe export "$regHive\$sub" $file /y | Out-Null
}
function Set-Reg {
    param($Path, $Name, $Value, [Microsoft.Win32.RegistryValueKind]$Kind='String')
    if ($DryRun) { Write-Host "[dry] $Path\$Name = $Value"; return }
    if (-not (Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
    Backup-RegKey -Path $Path
    New-ItemProperty -Path $Path -Name $Name -Value $Value -PropertyType $Kind -Force | Out-Null
    $script:Changed += "$Path\$Name"
}

# ---------- 1. registry identity keys ----------
Write-Host "[*] rotating registry identity..." -ForegroundColor Cyan

$newMachineGuid = New-Guid5
$newHwProfile   = "{$((New-Guid5).ToUpper())}"
$newSqm         = "{$((New-Guid5).ToUpper())}"
$newSus         = "{$((New-Guid5).ToUpper())}"
$newCrypto      = New-Guid5

Set-Reg 'HKLM:\SOFTWARE\Microsoft\Cryptography'                           'MachineGuid' $newMachineGuid
Set-Reg 'HKLM:\SOFTWARE\Microsoft\SQMClient'                              'MachineId'   $newSqm
Set-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate'   'SusClientId' $newSus
Set-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\IDConfigDB\Hardware Profiles\0001' 'HwProfileGuid' $newHwProfile

# optional: product id churn (keeps activation if KMS/retail — only touches a cache copy)
$pid = (New-Hex 2) + '-' + (New-Hex 2) + '-' + (New-Hex 2) + '-' + (New-Hex 2)
Set-Reg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' 'ProductId' $pid

# ---------- 2. SMBIOS cache keys read by many anti-cheat usermode layers ----------
Write-Host "[*] rotating SMBIOS cache..." -ForegroundColor Cyan
$bios = 'HKLM:\HARDWARE\DESCRIPTION\System\BIOS'
Set-Reg $bios 'SystemManufacturer' ("MSI","ASUS","GIGABYTE","ASRock" | Get-Random)
Set-Reg $bios 'SystemProductName'  ("MS-7D$(Get-Random -Max 100)","PRIME B$(Get-Random -Max 999)-A","Z790 AORUS","B650E") | Out-Null
Set-Reg $bios 'SystemSerialNumber' (New-Hex 8)
Set-Reg $bios 'BaseBoardSerialNumber' (New-Hex 8)
Set-Reg $bios 'SystemFamily' ("Default string","To be filled by O.E.M." | Get-Random)
Set-Reg $bios 'SystemSKU'    (New-Hex 4)
Set-Reg $bios 'BIOSVersion'  ("F$(Get-Random -Max 40)","$(Get-Random -Max 9).$(Get-Random -Max 99)")

# ---------- 3. volume serials ----------
Write-Host "[*] rotating volume serials (fixed disks)..." -ForegroundColor Cyan
$vols = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3"
foreach ($v in $vols) {
    $letter = $v.DeviceID.TrimEnd(':')
    $newSer = (New-Hex 2) + '-' + (New-Hex 2)
    if ($DryRun) { Write-Host "[dry] vol $letter -> $newSer"; continue }
    # VolumeID.exe from Sysinternals is the clean path; fallback: fsutil cannot set serial.
    $vid = "$env:ProgramData\Spoofer\VolumeID.exe"
    if (Test-Path $vid) {
        & $vid "$letter`:" $newSer | Out-Null
        $script:Changed += "VolSerial:$letter -> $newSer"
    } else {
        Write-Host "    (skip $letter — drop Sysinternals VolumeID.exe at $vid to enable)" -ForegroundColor Yellow
    }
}

# ---------- 4. MAC addresses on physical NICs ----------
Write-Host "[*] rotating NIC MACs..." -ForegroundColor Cyan
$nics = Get-NetAdapter -Physical | Where-Object { $_.Status -ne 'Disabled' }
foreach ($n in $nics) {
    $newMac = New-Mac
    if ($DryRun) { Write-Host "[dry] $($n.Name) -> $newMac"; continue }
    try {
        Set-NetAdapterAdvancedProperty -Name $n.Name -RegistryKeyword 'NetworkAddress' -RegistryValue $newMac -ErrorAction Stop
        Restart-NetAdapter -Name $n.Name -Confirm:$false
        $script:Changed += "MAC:$($n.Name) -> $newMac"
    } catch {
        # fallback: write directly under the class key
        $cls = 'HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}'
        Get-ChildItem $cls | ForEach-Object {
            $drv = (Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue).DriverDesc
            if ($drv -eq $n.InterfaceDescription) {
                Set-Reg $_.PSPath 'NetworkAddress' $newMac
            }
        }
    }
}

# ---------- 5. computer name ----------
$newName = "DESKTOP-" + (New-Hex 4)
if (-not $DryRun) {
    Rename-Computer -NewName $newName -Force -ErrorAction SilentlyContinue
    $script:Changed += "ComputerName -> $newName"
} else { Write-Host "[dry] computer name -> $newName" }

# ---------- 6. local traces: event logs + prefetch + recent ----------
Write-Host "[*] wiping local traces..." -ForegroundColor Cyan
if (-not $DryRun) {
    wevtutil el | ForEach-Object { try { wevtutil cl $_ } catch {} }
    Remove-Item "$env:SystemRoot\Prefetch\*" -Force -ErrorAction SilentlyContinue
    Remove-Item "$env:AppData\Microsoft\Windows\Recent\*" -Force -Recurse -ErrorAction SilentlyContinue
    $script:Changed += "logs + prefetch + recent"
}

# ---------- summary ----------
Write-Host ""
Write-Host "=== changed ===" -ForegroundColor Green
$script:Changed | ForEach-Object { Write-Host "  $_" }
Write-Host ""
Write-Host "backup: $BackupDir" -ForegroundColor Yellow
Write-Host "reboot to lock the identity in." -ForegroundColor Yellow

if (-not $NoReboot -and -not $DryRun) {
    Write-Host "rebooting in 10s... (ctrl+c to cancel)" -ForegroundColor Red
    Start-Sleep 10
    Restart-Computer -Force
}
