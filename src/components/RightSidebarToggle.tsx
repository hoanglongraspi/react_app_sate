import React from 'react';

interface RightSidebarToggleProps {
  visible: boolean;
  onClick: () => void;
}

const RightSidebarToggle: React.FC<RightSidebarToggleProps> = ({ visible, onClick }) => {
  if (!visible) return null;
  
  return (
    <button 
      onClick={onClick}
      className="absolute right-0 top-3 p-1.5 text-neutral-darker hover:text-primary z-20 rounded-full hover:bg-blue-50 bg-white shadow-md"
    >
      <i className="material-icons">chevron_left</i>
    </button>
  );
};

export default RightSidebarToggle; 