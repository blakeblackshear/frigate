import { h } from 'preact';
import { useUserView } from '../context';
import { UserViewTypes } from '../context/UserViewTypes';

export default function UserViewer({children, requiredmode }) {
  const { currentUserView } = useUserView();

  return currentUserView >= UserViewTypes[requiredmode] ? (
    <>{children}</>
    
  ) : null;
}