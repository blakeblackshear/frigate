import { h } from 'preact';
import { useViewMode } from '../context';
import { ViewModeTypes } from './ViewOptionEnum';

export default function ViewOption({children, requiredmode }) {
  const { currentViewMode } = useViewMode();

  return currentViewMode >= ViewModeTypes[requiredmode] ? (
    <>{children}</>
    
  ) : null;
}