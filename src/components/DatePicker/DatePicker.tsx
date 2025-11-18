import React, { useState, useRef, useEffect } from 'react';
import './DatePicker.css';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  min?: string; // YYYY-MM-DD format
  max?: string; // YYYY-MM-DD format
  label?: string;
  required?: boolean;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  locale?: string; // e.g., 'en-US', 'en-GB', 'de-DE'
  error?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  min,
  max,
  label,
  required = false,
  id,
  placeholder = 'Select a date',
  disabled = false,
  locale = 'en-US',
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Parse locale to determine date format
  const getDateFormat = (loc: string): 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' => {
    if (loc.startsWith('en-GB') || loc.startsWith('de') || loc.startsWith('fr')) {
      return 'DD/MM/YYYY';
    }
    return 'MM/DD/YYYY';
  };

  const dateFormat = getDateFormat(locale);

  // Format date for display based on locale
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00'); // Avoid timezone issues
    if (isNaN(date.getTime())) return dateString;

    if (dateFormat === 'DD/MM/YYYY') {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } else if (dateFormat === 'MM/DD/YYYY') {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    }
    return dateString;
  };

  // Parse display value to YYYY-MM-DD
  const parseDisplayValue = (display: string): string => {
    if (!display) return '';
    
    // Try DD/MM/YYYY or MM/DD/YYYY format
    const parts = display.split('/');
    if (parts.length === 3) {
      let day: number, month: number, year: number;
      
      if (dateFormat === 'DD/MM/YYYY') {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
      } else {
        month = parseInt(parts[0], 10);
        day = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
      }

      if (day && month && year) {
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }

    // Fallback: try to parse as-is (might already be YYYY-MM-DD)
    const date = new Date(display);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    return '';
  };

  // Update display value when value prop changes
  useEffect(() => {
    if (value) {
      setDisplayValue(formatDateForDisplay(value));
      const date = new Date(value + 'T00:00:00');
      if (!isNaN(date.getTime())) {
        setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      }
    } else {
      setDisplayValue('');
    }
  }, [value, dateFormat]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen || !calendarRef.current) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.focus();
        return;
      }

      if (!focusedDate) {
        if (value) {
          setFocusedDate(new Date(value + 'T00:00:00'));
        } else {
          setFocusedDate(new Date());
        }
        return;
      }

      let newFocusedDate = new Date(focusedDate);

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          newFocusedDate.setDate(newFocusedDate.getDate() - 7);
          break;
        case 'ArrowDown':
          event.preventDefault();
          newFocusedDate.setDate(newFocusedDate.getDate() + 7);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          newFocusedDate.setDate(newFocusedDate.getDate() - 1);
          break;
        case 'ArrowRight':
          event.preventDefault();
          newFocusedDate.setDate(newFocusedDate.getDate() + 1);
          break;
        case 'Home':
          event.preventDefault();
          newFocusedDate = new Date(newFocusedDate.getFullYear(), newFocusedDate.getMonth(), 1);
          break;
        case 'End':
          event.preventDefault();
          newFocusedDate = new Date(newFocusedDate.getFullYear(), newFocusedDate.getMonth() + 1, 0);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          handleDateSelect(focusedDate);
          return;
        default:
          return;
      }

      // Update current month if needed
      if (newFocusedDate.getMonth() !== currentMonth.getMonth() || 
          newFocusedDate.getFullYear() !== currentMonth.getFullYear()) {
        setCurrentMonth(new Date(newFocusedDate.getFullYear(), newFocusedDate.getMonth(), 1));
      }

      setFocusedDate(newFocusedDate);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedDate, currentMonth, value]);

  // Generate calendar days
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const days: Date[] = [];
    const currentDate = new Date(startDate);

    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const handleDateSelect = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    
    // Validate min/max
    if (min && dateString < min) return;
    if (max && dateString > max) return;

    onChange(dateString);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    // Don't validate on every keystroke - wait for blur or Enter
  };

  const handleInputBlur = () => {
    if (displayValue) {
      const parsed = parseDisplayValue(displayValue);
      if (parsed) {
        if (min && parsed < min) {
          setDisplayValue(formatDateForDisplay(value || ''));
          return;
        }
        if (max && parsed > max) {
          setDisplayValue(formatDateForDisplay(value || ''));
          return;
        }
        onChange(parsed);
      } else {
        // Invalid format, revert to value
        setDisplayValue(formatDateForDisplay(value || ''));
      }
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInputBlur();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
    setFocusedDate(null);
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date): boolean => {
    if (!value) return false;
    const selected = new Date(value + 'T00:00:00');
    return (
      date.getDate() === selected.getDate() &&
      date.getMonth() === selected.getMonth() &&
      date.getFullYear() === selected.getFullYear()
    );
  };

  const isFocused = (date: Date): boolean => {
    if (!focusedDate) return false;
    return (
      date.getDate() === focusedDate.getDate() &&
      date.getMonth() === focusedDate.getMonth() &&
      date.getFullYear() === focusedDate.getFullYear()
    );
  };

  const isDisabled = (date: Date): boolean => {
    const dateString = date.toISOString().split('T')[0];
    if (min && dateString < min) return true;
    if (max && dateString > max) return true;
    return false;
  };

  const isCurrentMonth = (date: Date): boolean => {
    return (
      date.getMonth() === currentMonth.getMonth() &&
      date.getFullYear() === currentMonth.getFullYear()
    );
  };

  const days = getCalendarDays();
  const weekDays = locale.startsWith('en-GB') || locale.startsWith('de') || locale.startsWith('fr')
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const monthNames = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).formatToParts(currentMonth);

  return (
    <div className="datepicker-container" ref={containerRef}>
      {label && (
        <label htmlFor={id} className="datepicker-label">
          {label}
          {required && <span className="required-asterisk"> *</span>}
        </label>
      )}
      <div className="datepicker-input-wrapper">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`datepicker-input ${error ? 'datepicker-input-error' : ''}`}
          aria-label={label || placeholder}
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          className="datepicker-button"
          onClick={() => {
            if (!disabled) {
              setIsOpen(!isOpen);
              inputRef.current?.focus();
            }
          }}
          disabled={disabled}
          aria-label="Open calendar"
          tabIndex={-1}
        >
          📅
        </button>
      </div>
      {error && (
        <div id={`${id}-error`} className="datepicker-error" role="alert">
          {error}
        </div>
      )}
      {isOpen && !disabled && (
        <div
          ref={calendarRef}
          className="datepicker-calendar"
          role="dialog"
          aria-label="Calendar"
          aria-modal="false"
        >
          <div className="datepicker-header">
            <button
              type="button"
              className="datepicker-nav-button"
              onClick={() => navigateMonth('prev')}
              aria-label="Previous month"
            >
              ‹
            </button>
            <div className="datepicker-month-year" role="heading" aria-level={2}>
              {currentMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
            </div>
            <button
              type="button"
              className="datepicker-nav-button"
              onClick={() => navigateMonth('next')}
              aria-label="Next month"
            >
              ›
            </button>
          </div>
          <div className="datepicker-weekdays" role="rowgroup">
            {weekDays.map((day, index) => (
              <div key={index} className="datepicker-weekday" role="columnheader" aria-label={day}>
                {day}
              </div>
            ))}
          </div>
          <div className="datepicker-days" role="grid" aria-label={`Calendar for ${currentMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}`}>
            {days.map((day, index) => {
              const dateString = day.toISOString().split('T')[0];
              const isDayDisabled = isDisabled(day);
              const isDaySelected = isSelected(day);
              const isDayToday = isToday(day);
              const isDayFocused = isFocused(day);
              const isDayCurrentMonth = isCurrentMonth(day);

              return (
                <button
                  key={index}
                  type="button"
                  className={`datepicker-day ${!isDayCurrentMonth ? 'datepicker-day-other-month' : ''} ${isDayToday ? 'datepicker-day-today' : ''} ${isDaySelected ? 'datepicker-day-selected' : ''} ${isDayFocused ? 'datepicker-day-focused' : ''} ${isDayDisabled ? 'datepicker-day-disabled' : ''}`}
                  onClick={() => !isDayDisabled && handleDateSelect(day)}
                  disabled={isDayDisabled}
                  aria-label={`${day.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}${isDaySelected ? ', selected' : ''}${isDayToday ? ', today' : ''}`}
                  tabIndex={isDayFocused ? 0 : -1}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

