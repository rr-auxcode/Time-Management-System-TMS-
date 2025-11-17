import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = 'Time Management System' }) => {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="header-title">{title}</h1>
        {user && (
          <div className="header-user">
            <div className="user-info">
              <span className="user-name">{user.name}</span>
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

