Write-Host "Starting V2 Auto-Sync... Monitoring your active branch." -ForegroundColor Cyan

while($true) {
    # 1. Ask Git what branch you are currently on
    $CURRENT_BRANCH = git branch --show-current
    
    # 2. Fetch updates specifically for that branch
    git fetch origin $CURRENT_BRANCH -q
    
    # 3. Compare your local branch to the origin version
    # FIX: Using "HEAD" instead of @ so PowerShell doesn't crash
    $LOCAL = git rev-parse "HEAD"
    $REMOTE = git rev-parse "origin/$CURRENT_BRANCH"
    
    # If the local code doesn't match the GitHub code...
    if ($LOCAL -ne $REMOTE) {
        Write-Host "New commits found on '$CURRENT_BRANCH'! Pulling..." -ForegroundColor Yellow
        git pull origin $CURRENT_BRANCH
        
        Write-Host "Update complete! Nodemon will restart your server." -ForegroundColor Green
    }
    
    Start-Sleep -Seconds 60
}