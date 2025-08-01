import { FaKeyboard } from "react-icons/fa";
import { IoMdPhotos } from "react-icons/io";
import { RiVoiceAiFill } from "react-icons/ri";
import './AddItemMenu.css';

type AddItemMenuProps = {
  onAddManually: () => void;
  onImportFromPhoto: () => void;
  onListenToMe: () => void;
  onClose: () => void;
};

const AddItemMenu = ({ onAddManually, onImportFromPhoto, onListenToMe, onClose }: AddItemMenuProps) => {
  return (
    <>
      {/* Backdrop to close menu when clicking outside */}
      <div className="add-item-menu-backdrop" onClick={onClose} />
      
      <div className="add-item-menu">
        <button 
          className="add-item-menu-option"
          onClick={onAddManually}
        >
          <FaKeyboard className="add-item-menu-icon" />
          <span>Add Manually</span>
        </button>
        
        <button 
          className="add-item-menu-option"
          onClick={onImportFromPhoto}
        >
          <IoMdPhotos className="add-item-menu-icon" />
          <span>Import from Photo</span>
        </button>
        
        <button 
          className="add-item-menu-option"
          onClick={onListenToMe}
        >
          <RiVoiceAiFill className="add-item-menu-icon" />
          <span>Listen to me</span>
        </button>
      </div>
    </>
  );
};

export default AddItemMenu;