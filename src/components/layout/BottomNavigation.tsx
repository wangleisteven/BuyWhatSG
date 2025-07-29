import { useLocation, useNavigate } from 'react-router-dom';
import { FiList, FiUser } from 'react-icons/fi';

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine active tab based on current route
  const isListsActive = location.pathname === '/lists' || location.pathname.startsWith('/list/');
  const isMeActive = location.pathname === '/me';

  return (
    <nav className="bottom-navigation">
      <div className="container">
        <div className="nav-items">
          <button 
            className={`nav-item ${isListsActive ? 'active' : ''}`}
            onClick={() => navigate('/lists')}
            aria-label="My Lists"
          >
            <FiList size={24} />
            <span>My Lists</span>
          </button>
          
          <button 
            className={`nav-item ${isMeActive ? 'active' : ''}`}
            onClick={() => navigate('/me')}
            aria-label="Me"
          >
            <FiUser size={24} />
            <span>Me</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;