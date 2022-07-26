# To use this, open powershell and run Import-Module ./SendToTransferSh.psm1
# Then run transfer <file>
# If running outside of Windows, change

New-Alias Transfer Send-ToTransferSH
Function Send-ToTransferSH {
    <#
    .SYNOPSIS
    Uploads a file to transfer.uuid.rocks and copies link to clipboard
    
    .PARAMETER Path
    Path to file.

    .PARAMETER UseRclone
    Upload via rclone with long secret uuid

    .PARAMETER Keep
    Keep files for 1 month instead of 1 day (automatically triggers -UseRclone)
    
    .EXAMPLE
    Send-ToTransferSH -Path C:\TMP\out.txt
    Uploads file
    #>
    $domain = 'transfer.uuid.rocks' # Change this to your host
    $rcloneRemote = 'r2:transfer-sh'
    Param (
        [Parameter(Mandatory = $true)]
        [ValidateNotNullOrEmpty()]
        [ValidateScript( { Test-Path $_ })]
        [string]$Path,
        [switch]$UseRclone,
        [switch]$Keep
    )
    $file = Get-Item $Path
    if ($UseRclone -or $Keep) {
        $id = [Guid]::NewGuid()
        if ($Keep) {
            $id = 'k-' + $id
        }
        rclone -v -P --s3-upload-concurrency=2 copy $file.FullName "$rcloneRemote/$id"
        $webPath = "https://$domain/get/$id/$([uri]::EscapeDataString($file.Name))"
        Set-Clipboard $webPath
        Write-Output $webPath
        # Record it to db
        curl -X PUT -H "X-Content-Length: $($file.Length)" "https://$domain/record-upload/$([uri]::EscapeDataString($file.Name))"
    } else {
        $uploadHost = "https://$domain"
        $res = Invoke-WebRequest -Method Put -InFile $file.FullName "$($uploadHost)/$($file.Name)"
        if ($res.StatusCode -eq 200) {
            Set-Clipboard $res.Content
            Write-Output $res.Content
        } else {
            Write-Error $res
        }
    }
}

Export-ModuleMember -Function *-*