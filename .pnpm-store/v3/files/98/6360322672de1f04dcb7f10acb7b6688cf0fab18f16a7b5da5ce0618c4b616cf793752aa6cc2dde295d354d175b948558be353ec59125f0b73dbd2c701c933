param (
  $string,
  [char] $char,
  [byte] $byte,
  $int,
  $long,
  [bool] $bool,
  $decimal,
  $single,
  $double,
  [DateTime] $DateTime,
  [xml] $xml,
  [array] $array,
  [hashtable]$hashtable,
  [switch]$switch
)

$tests = @(
  [PSCustomObject]@{name="string"; value=$string; test=$string -is [string]},
  [PSCustomObject]@{name="char"; value=$char; test=$char -is [char]},
  [PSCustomObject]@{name="byte"; value=$byte; test=$byte -is [byte]},
  [PSCustomObject]@{name="int"; value=$int; test=$int -is [int]},
  [PSCustomObject]@{name="long"; value=$long; test=$long -is [long]},
  [PSCustomObject]@{name="bool"; value=$bool; test=$bool -is [bool]},
  [PSCustomObject]@{name="decimal"; value=$decimal; test=$decimal -is [decimal]},
#  [PSCustomObject]@{name="single"; value=$single; test=$single -is [single]},
  [PSCustomObject]@{name="double"; value=$double; test=$double -is [double]},
  [PSCustomObject]@{name="DateTime"; value=$DateTime; test=$DateTime -is [DateTime]},
  [PSCustomObject]@{name="xml"; value=$xml; test=$xml -is [xml]},
  [PSCustomObject]@{name="array"; value=$array; test=$array -is [array] -and $array.length -gt 1},
  [PSCustomObject]@{name="hashtable"; value=$hashtable; test=$hashtable -is [hashtable]},
  [PSCustomObject]@{name="switch"; value=$switch; test=$switch -is [switch] -and $switch -eq $true}
)

$tests | ConvertTo-Json -Compress
