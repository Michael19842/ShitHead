# PowerShell script om geluidsbestanden te downloaden voor Shithead kaartspel
# Voer uit: .\download-sounds.ps1

$soundsDir = ".\public\sounds"

# Maak de sounds directory aan als deze niet bestaat
if (-not (Test-Path $soundsDir)) {
    New-Item -ItemType Directory -Path $soundsDir -Force
    Write-Host "Directory aangemaakt: $soundsDir" -ForegroundColor Green
}

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  SHITHEAD KAARTSPEL - GELUIDSBESTANDEN DOWNLOADEN" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Lijst van benodigde geluiden met aanbevolen bronnen
$sounds = @(
    @{
        Name = "card-play.mp3"
        Description = "Kaart leggen - kort 'swoosh' of 'plop' geluid"
        Suggestions = @(
            "https://pixabay.com/sound-effects/search/card%20flip/",
            "https://mixkit.co/free-sound-effects/card/"
        )
    },
    @{
        Name = "card-shuffle.mp3"
        Description = "Kaarten schudden - shuffling sound"
        Suggestions = @(
            "https://pixabay.com/sound-effects/search/card%20shuffle/",
            "https://mixkit.co/free-sound-effects/shuffle/"
        )
    },
    @{
        Name = "pile-pickup.mp3"
        Description = "Stapel oppakken - meerdere kaarten geluid"
        Suggestions = @(
            "https://pixabay.com/sound-effects/search/card%20pick/",
            "https://mixkit.co/free-sound-effects/card/"
        )
    },
    @{
        Name = "special-reset.mp3"
        Description = "Speciale kaart 2 (Reset) - 'whoosh' of 'rewind' geluid"
        Suggestions = @(
            "https://pixabay.com/sound-effects/search/whoosh/",
            "https://mixkit.co/free-sound-effects/whoosh/"
        )
    },
    @{
        Name = "special-glass.mp3"
        Description = "Speciale kaart 3 (Glass/Invisible) - magisch/mysterieus geluid"
        Suggestions = @(
            "https://pixabay.com/sound-effects/search/magic/",
            "https://mixkit.co/free-sound-effects/magic/"
        )
    },
    @{
        Name = "special-cap.mp3"
        Description = "Speciale kaart 7 (Cap/Limiet) - 'bonk' of waarschuwing geluid"
        Suggestions = @(
            "https://pixabay.com/sound-effects/search/notification/",
            "https://mixkit.co/free-sound-effects/alert/"
        )
    },
    @{
        Name = "special-burn.mp3"
        Description = "Speciale kaart 10 (Burn) - vuur/explosie geluid"
        Suggestions = @(
            "https://pixabay.com/sound-effects/search/fire/",
            "https://mixkit.co/free-sound-effects/fire/"
        )
    },
    @{
        Name = "burn-combo.mp3"
        Description = "4-of-a-kind burn - groter vuur/explosie geluid"
        Suggestions = @(
            "https://pixabay.com/sound-effects/search/explosion/",
            "https://mixkit.co/free-sound-effects/explosion/"
        )
    },
    @{
        Name = "your-turn.mp3"
        Description = "Jouw beurt - korte notificatie 'ding'"
        Suggestions = @(
            "https://pixabay.com/sound-effects/search/notification/",
            "https://mixkit.co/free-sound-effects/notification/"
        )
    },
    @{
        Name = "player-out.mp3"
        Description = "Speler is klaar - succes/achievement geluid"
        Suggestions = @(
            "https://pixabay.com/sound-effects/search/success/",
            "https://mixkit.co/free-sound-effects/win/"
        )
    },
    @{
        Name = "game-win.mp3"
        Description = "Spel gewonnen - victorie fanfare"
        Suggestions = @(
            "https://pixabay.com/sound-effects/search/victory/",
            "https://mixkit.co/free-sound-effects/win/"
        )
    },
    @{
        Name = "game-lose.mp3"
        Description = "Spel verloren - 'wah wah' of 'fail' geluid"
        Suggestions = @(
            "https://pixabay.com/sound-effects/search/fail/",
            "https://mixkit.co/free-sound-effects/lose/"
        )
    },
    @{
        Name = "button-click.mp3"
        Description = "Button klik - UI feedback geluid"
        Suggestions = @(
            "https://pixabay.com/sound-effects/search/click/",
            "https://mixkit.co/free-sound-effects/click/"
        )
    }
)

Write-Host "De volgende geluidsbestanden zijn nodig:" -ForegroundColor Yellow
Write-Host ""

$missingFiles = @()

foreach ($sound in $sounds) {
    $filePath = Join-Path $soundsDir $sound.Name
    $exists = Test-Path $filePath

    if ($exists) {
        Write-Host "[OK] " -ForegroundColor Green -NoNewline
        Write-Host $sound.Name -ForegroundColor White
    } else {
        Write-Host "[MISSING] " -ForegroundColor Red -NoNewline
        Write-Host $sound.Name -ForegroundColor White
        $missingFiles += $sound
    }
}

Write-Host ""

if ($missingFiles.Count -eq 0) {
    Write-Host "Alle geluidsbestanden zijn aanwezig!" -ForegroundColor Green
    exit 0
}

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  ONTBREKENDE BESTANDEN - DOWNLOAD INSTRUCTIES" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

foreach ($sound in $missingFiles) {
    Write-Host "----------------------------------------" -ForegroundColor DarkGray
    Write-Host $sound.Name -ForegroundColor Yellow
    Write-Host $sound.Description -ForegroundColor White
    Write-Host ""
    Write-Host "Zoek hier:" -ForegroundColor Cyan
    foreach ($url in $sound.Suggestions) {
        Write-Host "  - $url" -ForegroundColor Blue
    }
    Write-Host ""
}

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  HOE TE GEBRUIKEN" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Ga naar een van de websites hierboven" -ForegroundColor White
Write-Host "2. Zoek een geschikt geluid" -ForegroundColor White
Write-Host "3. Download het als MP3" -ForegroundColor White
Write-Host "4. Hernoem het bestand naar de juiste naam" -ForegroundColor White
Write-Host "5. Plaats het in: $soundsDir" -ForegroundColor White
Write-Host ""
Write-Host "TIP: Kies korte geluiden (< 2 seconden) voor de beste ervaring" -ForegroundColor Magenta
Write-Host ""

# Optie om de directory te openen
$openFolder = Read-Host "Wil je de sounds folder openen? (j/n)"
if ($openFolder -eq "j" -or $openFolder -eq "J" -or $openFolder -eq "y" -or $openFolder -eq "Y") {
    Start-Process explorer.exe -ArgumentList (Resolve-Path $soundsDir)
}

Write-Host ""
Write-Host "Voer dit script opnieuw uit om te controleren of alle bestanden aanwezig zijn." -ForegroundColor Cyan
