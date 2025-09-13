import * as React from "react"
import { Input, InputProps } from "./input"
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./select"

export interface SelectInputProps extends InputProps {
  options: { value: string; label: string }[]
  onSelectChange?: (value: string) => void
  selectPlaceholder?: string
  selectClassName?: string
  selectPosition?: "before" | "after"
}

const SelectInput = React.forwardRef<HTMLInputElement, SelectInputProps>(
  ({ 
    className, 
    options, 
    onSelectChange, 
    selectPlaceholder = "Select...", 
    selectClassName = "w-[180px]",
    selectPosition = "after",
    ...props 
  }, ref) => {
    const [selectedValue, setSelectedValue] = React.useState<string>("")

    const handleValueChange = (value: string) => {
      setSelectedValue(value)
      if (onSelectChange) {
        onSelectChange(value)
      }
    }

    return (
      <div className="flex items-center gap-2">
        {selectPosition === "before" && (
          <Select value={selectedValue} onValueChange={handleValueChange}>
            <SelectTrigger className={selectClassName}>
              <SelectValue placeholder={selectPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
        
        <Input className={className} ref={ref} {...props} />
        
        {selectPosition === "after" && (
          <Select value={selectedValue} onValueChange={handleValueChange}>
            <SelectTrigger className={selectClassName}>
              <SelectValue placeholder={selectPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      </div>
    )
  }
)

SelectInput.displayName = "SelectInput"

export { SelectInput }