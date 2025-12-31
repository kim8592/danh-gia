
import React, { useState, useEffect, useRef } from 'react';

interface EditableCellProps {
  value: string;
  onSave: (val: string) => void;
  placeholder?: string;
  className?: string;
}

const EditableCell: React.FC<EditableCellProps> = ({ value, onSave, placeholder, className }) => {
  const [localValue, setLocalValue] = useState(value || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Fix: Use ReturnType<typeof setTimeout> to avoid dependency on the NodeJS namespace in the browser
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  };

  useEffect(() => {
    setLocalValue(value || '');
    // Need a tiny delay to ensure DOM is updated
    const timeout = setTimeout(adjustHeight, 10);
    return () => clearTimeout(timeout);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    adjustHeight();

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onSave(newVal);
    }, 800);
  };

  return (
    <textarea
      ref={textareaRef}
      className={`${className} overflow-hidden whitespace-pre-wrap break-words min-h-[1.5rem]`}
      rows={1}
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
    />
  );
};

export default EditableCell;
