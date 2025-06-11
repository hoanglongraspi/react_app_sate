import React from 'react';

interface LeftSidebarToggleProps {
  visible: boolean;
  onClick: () => void;
}

const LeftSidebarToggle: React.FC<LeftSidebarToggleProps> = ({ visible, onClick }) => {
  if (!visible) return null;
  
  return (
    <button 
      onClick={onClick}
      className="absolute left-0 top-3 p-1.5 text-neutral-darker hover:text-primary z-20 rounded-full hover:bg-blue-50 bg-white shadow-md"
    >
      <i className="material-icons">chevron_right</i>
    </button>
  );
};

export default LeftSidebarToggle; 