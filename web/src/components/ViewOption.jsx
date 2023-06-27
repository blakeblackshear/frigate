import { h } from 'preact';
import { useViewMode } from '../context';
import { ViewModeTypes } from './ViewOptionEnum';

export default function ViewOption({children, requiredmode }) {
  const { viewMode } = useViewMode();

  return viewMode >= ViewModeTypes[requiredmode] ? (
    <>{children}</>
    
  ) : null;
}