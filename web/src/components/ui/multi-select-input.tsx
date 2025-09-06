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
import { cn } from "@/lib/utils"
import { LuX } from "react-icons/lu"

export type ParameterOption = {
  value: string
  label: string
}

export type ParameterGroup = {
  id: string
  name: string
  description?: string
  options: ParameterOption[]
}

export interface MultiSelectInputProps extends InputProps {
  parameterGroups: ParameterGroup[]
  onParameterChange?: (parameters: Record<string, string>) => void
  parameterPlaceholder?: string
  inputPlaceholder?: string
}

const MultiSelectInput = React.forwardRef<HTMLInputElement, MultiSelectInputProps>(
  ({
    className,
    parameterGroups,
    onParameterChange,
    parameterPlaceholder = "Select...",
    inputPlaceholder = "input...",
    ...props
  }, ref) => {
    const [selectedParameters, setSelectedParameters] = React.useState<Record<string, string>>({})
    const [currentParameter, setCurrentParameter] = React.useState<string | null>(null)
    const [inputValue, setInputValue] = React.useState("")

    const getCurrentParameterOptions = () => {
      if (!currentParameter) return []
      const group = parameterGroups.find(g => g.id === currentParameter)
      return group?.options || []
    }

    const handleParameterSelect = (parameterId: string) => {
      setCurrentParameter(parameterId)
    }

    const handleOptionSelect = (value: string) => {
      if (currentParameter) {
        const newSelectedParameters = {
          ...selectedParameters,
          [currentParameter]: value
        }
        setSelectedParameters(newSelectedParameters)

        if (onParameterChange) {
          onParameterChange(newSelectedParameters)
        }

        setCurrentParameter(null)
      }
    }

    const removeParameter = (parameterId: string) => {
      const newSelectedParameters = { ...selectedParameters }
      delete newSelectedParameters[parameterId]
      setSelectedParameters(newSelectedParameters)

      if (onParameterChange) {
        onParameterChange(newSelectedParameters)
      }
    }

    const getParameterDisplayName = (parameterId: string) => {
      const group = parameterGroups.find(g => g.id === parameterId)
      return group?.name || parameterId
    }

    const getOptionDisplayName = (parameterId: string, optionValue: string) => {
      const group = parameterGroups.find(g => g.id === parameterId)
      const option = group?.options.find(o => o.value === optionValue)
      return option?.label || optionValue
    }

    return (
      <div className="space-y-2">
        {Object.keys(selectedParameters).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(selectedParameters).map(([parameterId, optionValue]) => (
              <div
                key={parameterId}
                className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-sm text-green-800"
              >
                <span>{getParameterDisplayName(parameterId)}:</span>
                <span>{getOptionDisplayName(parameterId, optionValue)}</span>
                <button
                  type="button"
                  onClick={() => removeParameter(parameterId)}
                  className="ml-1 rounded-full p-0.5 hover:bg-green-200"
                >
                  <LuX className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Select value={currentParameter || ""} onValueChange={handleParameterSelect}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={parameterPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {parameterGroups
                  .filter(group => !(group.id in selectedParameters))
                  .map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {currentParameter ? (
            <Select value="" onValueChange={handleOptionSelect}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select item..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {getCurrentParameterOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : (
            <Input
              className={cn("flex-1", className)}
              placeholder={inputPlaceholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              ref={ref}
              {...props}
            />
          )}
        </div>
        <div className="my-3 text-sm text-muted-foreground">{parameterGroups.find(g => g.id === currentParameter)?.description}</div>
      </div>
    )
  }
)

MultiSelectInput.displayName = "MultiSelectInput"

export { MultiSelectInput }