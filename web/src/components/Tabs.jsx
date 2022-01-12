import { h } from 'preact';
import { useCallback, useState } from "preact/hooks";

export function Tabs({ children, selectedIndex: selectedIndexProp, onChange, className }) {
  const [selectedIndex, setSelectedIndex] = useState(selectedIndexProp);

  const handleSelected = (index) => () => {
    setSelectedIndex(index);
    onChange && onChange(index)
  };

  const RenderChildren = useCallback(() => {
    return children.map((child, i) => {
      child.props.selected = i == selectedIndex
      child.props.onClick = handleSelected(i)
      return child;
    })
  }, [selectedIndex])

  return (
    <div className={`flex ${className}`}>
      <RenderChildren />
    </div>
  )
}

export function TextTab({ selected, text, onClick }) {
  const selectedStyle = selected ? 'text-black bg-white' : "text-white bg-transparent"
  return (
    <button onClick={onClick} className={`rounded-full px-4 py-2 ${selectedStyle}`}>
      <span>{text}</span>
    </button>
  )
}