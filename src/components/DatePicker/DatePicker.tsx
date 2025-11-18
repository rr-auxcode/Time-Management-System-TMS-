import React, { useState, useRef, useEffect } from 'react';
import './DatePicker.css';

interface DatePickerProps {
  value: string; // YYYY-MM-DD or YYYY-MM-DDTHH:MM format
  onChange: (date: string) => void; // Returns YYYY-MM-DDTHH:MM format
  min?: string; // YYYY-MM-DD or YYYY-MM-DDTHH:MM format
  max?: string; // YYYY-MM-DD or YYYY-MM-DDTHH:MM format
  label?: string;
  required?: boolean;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  locale?: string; // e.g., 'en-US', 'en-GB', 'de-DE'
  error?: string;
  includeTime?: boolean; // If true, shows time selection (hours only)
  timeLabel?: string; // Label for time field
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
  includeTime = false,
  timeLabel = 'Time (hours)',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const [selectedHour, setSelectedHour] = useState(0); // 0-23
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

  // Parse value to extract date and hour
  const parseValue = (val: string): { date: string; hour: number } => {
    if (!val) return { date: '', hour: 0 };
    
    // Check if value includes time (YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS)
    if (val.includes('T')) {
      const [datePart, timePart] = val.split('T');
      const hour = timePart ? parseInt(timePart.split(':')[0], 10) || 0 : 0;
      return { date: datePart, hour: Math.max(0, Math.min(23, hour)) };
    }
    
    // Just date, extract hour from date string or default to 0
    return { date: val, hour: 0 };
  };

  // Format date for display based on locale
  const formatDateForDisplay = (dateString: string, hour?: number): string => {
    if (!dateString) return '';
    
    const date = new Date(dateString + 'T00:00:00'); // Avoid timezone issues
    if (isNaN(date.getTime())) return dateString;

    let formatted: string;
    if (dateFormat === 'DD/MM/YYYY') {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      formatted = `${day}/${month}/${year}`;
    } else if (dateFormat === 'MM/DD/YYYY') {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      formatted = `${month}/${day}/${year}`;
    } else {
      formatted = dateString;
    }

    // Add time if included
    if (includeTime && hour !== undefined) {
      const hourStr = String(hour).padStart(2, '0');
      formatted += ` ${hourStr}:00`;
    }

    return formatted;
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
      const { date, hour } = parseValue(value);
      setDisplayValue(formatDateForDisplay(date, hour));
      setSelectedHour(hour);
      const dateObj = new Date(date + 'T00:00:00');
      if (!isNaN(dateObj.getTime())) {
        setCurrentMonth(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1));
      }
    } else {
      setDisplayValue('');
      setSelectedHour(0);
    }
  }, [value, dateFormat, includeTime]);

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
    
    // Validate min/max (compare date part only)
    const minDate = min ? min.split('T')[0] : null;
    const maxDate = max ? max.split('T')[0] : null;
    if (minDate && dateString < minDate) return;
    if (maxDate && dateString > maxDate) return;

    // Combine date with selected hour
    const dateTimeString = includeTime 
      ? `${dateString}T${String(selectedHour).padStart(2, '0')}:00:00`
      : dateString;

    onChange(dateTimeString);
    if (!includeTime) {
      setIsOpen(false);
      inputRef.current?.focus();
    }
  };

  const handleHourChange = (hour: number) => {
    const newHour = Math.max(0, Math.min(23, hour));
    setSelectedHour(newHour);
    
    // Update the value with new hour
    if (value) {
      const { date } = parseValue(value);
      const dateTimeString = `${date}T${String(newHour).padStart(2, '0')}:00:00`;
      onChange(dateTimeString);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    // Don't validate on every keystroke - wait for blur or Enter
  };

  const handleInputBlur = () => {
    if (displayValue) {
      // Extract date part (before space if time is included)
      const datePart = includeTime ? displayValue.split(' ')[0] : displayValue;
      const parsed = parseDisplayValue(datePart);
      if (parsed) {
        const minDate = min ? min.split('T')[0] : null;
        const maxDate = max ? max.split('T')[0] : null;
        if (minDate && parsed < minDate) {
          const { date, hour } = parseValue(value || '');
          setDisplayValue(formatDateForDisplay(date, hour));
          return;
        }
        if (maxDate && parsed > maxDate) {
          const { date, hour } = parseValue(value || '');
          setDisplayValue(formatDateForDisplay(date, hour));
          return;
        }
        
        // Combine with selected hour if time is included
        const finalValue = includeTime 
          ? `${parsed}T${String(selectedHour).padStart(2, '0')}:00:00`
          : parsed;
        onChange(finalValue);
      } else {
        // Invalid format, revert to value
        const { date, hour } = parseValue(value || '');
        setDisplayValue(formatDateForDisplay(date, hour));
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
      {includeTime && (
        <div className="datepicker-time-wrapper" style={{ marginTop: '0.5rem' }}>
          <label htmlFor={`${id}-hour`} style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>
            {timeLabel}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              id={`${id}-hour`}
              type="number"
              min="0"
              max="23"
              value={selectedHour}
              onChange={(e) => handleHourChange(parseInt(e.target.value, 10) || 0)}
              disabled={disabled}
              className="datepicker-hour-input"
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                width: '80px',
                textAlign: 'center'
              }}
              aria-label={`${timeLabel}, current value ${selectedHour} hours`}
            />
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>hours (0-23)</span>
          </div>
        </div>
      )}
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
          {includeTime && (
            <div className="datepicker-time-selection" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem', display: 'block' }}>
                {timeLabel}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="range"
                  min="0"
                  max="23"
                  value={selectedHour}
                  onChange={(e) => handleHourChange(parseInt(e.target.value, 10))}
                  className="datepicker-hour-slider"
                  style={{ flex: 1 }}
                  aria-label={`Select hour, current value ${selectedHour}`}
                />
                <div style={{ 
                  minWidth: '60px', 
                  textAlign: 'center', 
                  fontWeight: 600, 
                  color: '#f97316',
                  fontSize: '1rem'
                }}>
                  {String(selectedHour).padStart(2, '0')}:00
                </div>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={selectedHour}
                  onChange={(e) => handleHourChange(parseInt(e.target.value, 10) || 0)}
                  className="datepicker-hour-input"
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    width: '60px',
                    textAlign: 'center'
                  }}
                  aria-label={`Enter hour (0-23), current value ${selectedHour}`}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

