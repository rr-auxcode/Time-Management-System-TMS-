import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = 'Time Management System' }) => {
  const { user, logout, role, isSuperAdmin, isClient } = useAuth();

  const getRoleBadge = () => {
    if (isSuperAdmin) {
      return <span style={{ 
        fontSize: '0.75rem', 
        padding: '0.25rem 0.5rem', 
        background: '#f97316', 
        color: 'white', 
        borderRadius: '4px',
        fontWeight: 600,
        marginLeft: '0.5rem'
      }}>Super Admin</span>;
    }
    if (isClient) {
      return <span style={{ 
        fontSize: '0.75rem', 
        padding: '0.25rem 0.5rem', 
        background: '#3b82f6', 
        color: 'white', 
        borderRadius: '4px',
        fontWeight: 600,
        marginLeft: '0.5rem'
      }}>Client</span>;
    }
    return <span style={{ 
      fontSize: '0.75rem', 
      padding: '0.25rem 0.5rem', 
      background: '#6b7280', 
      color: 'white', 
      borderRadius: '4px',
      fontWeight: 600,
      marginLeft: '0.5rem'
    }}>User</span>;
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="header-title">{title}</h1>
        {user && (
          <div className="header-user">
            <div className="user-info">
              <span className="user-name">{user.name}{getRoleBadge()}</span>
              <span className="user-email">{user.email}</span>
            </div>
            <button className="logout-btn" onClick={logout} title="Sign out">
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

