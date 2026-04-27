$path = 'm:\mohab\Documents\SideProject\LabManager - Full stack\client\src\pages\invoices\Invoices.jsx'
$content = Get-Content $path
$newLines = @(
    '                      <PhoneInput',
    '                        value={newDoctor.phoneNumbers[0].phone}',
    '                        onChange={(val) => {',
    '                          const newPhones = [...newDoctor.phoneNumbers];',
    '                          newPhones[0].phone = val;',
    '                          setNewDoctor({ ...newDoctor, phoneNumbers: newPhones });',
    '                        }}',
    '                        placeholder="Enter phone number"',
    '                      />'
)
$result = $content[0..2570] + $newLines + $content[2581..($content.Length-1)]
$result | Set-Content $path
