import { FaKeyboard } from "react-icons/fa";
import { IoMdPhotos } from "react-icons/io";
import { RiVoiceAiFill } from "react-icons/ri";
import { LuMessageSquareMore } from "react-icons/lu";
import './AddItemMenu.css';

type AddItemMenuProps = {
  onAddManually: () => void;
  onSeeMyPicture: () => void;
  onListenToMe: () => void;
  onReadMyMessage: () => void;
  onClose: () => void;
};

const AddItemMenu = ({ onAddManually, onSeeMyPicture, onListenToMe, onReadMyMessage, onClose }: AddItemMenuProps) => {
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
          onClick={onReadMyMessage}
        >
          <LuMessageSquareMore className="add-item-menu-icon" />
          <span>Read My Message</span>
        </button>
        
        <button 
          className="add-item-menu-option"
          onClick={onSeeMyPicture}
        >
          <IoMdPhotos className="add-item-menu-icon" />
          <span>See My Picture</span>
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